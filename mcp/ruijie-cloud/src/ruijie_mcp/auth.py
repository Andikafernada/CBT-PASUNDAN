"""Authentication & Session Manager for Ruijie Cloud (Dual-Mode with RSA CAS SSO)."""

from __future__ import annotations

import base64
import logging
import os
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from dotenv import load_dotenv

# Memuat konfigurasi dari file .env jika tersedia
load_dotenv()

logger = logging.getLogger("ruijie_mcp.auth")

# Path endpoint otentikasi standar Ruijie Cloud
_OAUTH_TOKEN_PATH = "/service/api/oauth20/client/access_token"
_SERVICE_URL_PATH = "/webproxy/private/login"
_SSO_LOGIN_PATH = "/sso/login"
_VALIDATE_PWD_PATH = "/sso/validate/password"

# Kunci publik RSA resmi dari Ruijie Cloud SSO Web
_RUIJIE_RSA_PUBKEY_B64 = (
    "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKjeUvf/EGSrhYUApZlJRYYsYIkWQu5tcPc8bkWVqnlAFrJlVWmvgD5zd9Sevi7qNIl9+1NvNlFcqiUGgsevCNMCAwEAAQ=="
)

# Buffer waktu sebelum token kedaluwarsa (dalam detik)
_EXPIRY_BUFFER_SECONDS = 60.0
_DEFAULT_TOKEN_TTL_SECONDS = 1800.0  # 30 menit


class RuijieAuthError(Exception):
    """Gagal melakukan autentikasi ke Ruijie Cloud."""


class RuijieConfigError(Exception):
    """Konfigurasi kredensial Ruijie Cloud tidak lengkap atau tidak valid."""


@dataclass
class AuthSession:
    """Menyimpan data sesi aktif Ruijie Cloud."""

    token: str
    auth_mode: str
    expires_at: float
    headers: dict[str, str] = field(default_factory=dict)
    cookies: dict[str, str] = field(default_factory=dict)
    tenant_info: dict[str, Any] = field(default_factory=dict)

    @property
    def is_expired(self) -> bool:
        """Cek apakah sesi sudah mendekati waktu kedaluwarsa."""
        return time.monotonic() >= (self.expires_at - _EXPIRY_BUFFER_SECONDS)

    @property
    def remaining_seconds(self) -> float:
        """Sisa masa berlaku sesi dalam detik."""
        rem = self.expires_at - time.monotonic()
        return max(0.0, rem)


def rsa_encrypt_password(password: str, pubkey_b64: str = _RUIJIE_RSA_PUBKEY_B64) -> str:
    """Enkripsi password menggunakan RSA PKCS#1 v1.5 dengan public key Ruijie."""
    der_data = base64.b64decode(pubkey_b64)
    public_key = serialization.load_der_public_key(der_data)
    encrypted_bytes = public_key.encrypt(
        password.encode("utf-8"),
        padding.PKCS1v15()
    )
    return base64.b64encode(encrypted_bytes).decode("utf-8")


class RuijieAuthManager:
    """Mengelola siklus hidup autentikasi Ruijie Cloud (Dual-Mode)."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        auth_mode: Optional[str] = None,
        app_id: Optional[str] = None,
        app_secret: Optional[str] = None,
        api_token: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: float = 30.0,
        token_ttl: Optional[float] = None,
    ) -> None:
        self.base_url = (
            base_url or os.getenv("RUIJIE_BASE_URL") or "https://cloud-as.ruijienetworks.com"
        ).rstrip("/")
        self.auth_mode = (
            auth_mode or os.getenv("RUIJIE_AUTH_MODE") or "account"
        ).strip().lower()

        # Kredensial Mode 1: OpenAPI
        self.app_id = app_id or os.getenv("RUIJIE_APP_ID")
        self.app_secret = app_secret or os.getenv("RUIJIE_APP_SECRET")
        self.api_token = api_token or os.getenv("RUIJIE_API_TOKEN")

        # Kredensial Mode 2: Account Login
        self.username = username or os.getenv("RUIJIE_USERNAME")
        self.password = password or os.getenv("RUIJIE_PASSWORD")

        self.timeout = float(os.getenv("RUIJIE_TIMEOUT_SECONDS", str(timeout)))
        self.token_ttl = float(
            token_ttl or os.getenv("RUIJIE_TOKEN_TTL_SECONDS", str(_DEFAULT_TOKEN_TTL_SECONDS))
        )

        self._session: Optional[AuthSession] = None
        self._lock = threading.Lock()

    def validate_configuration(self) -> None:
        """Validasi kelengkapan konfigurasi kredensial."""
        if self.auth_mode == "apikey":
            if not self.app_id or not self.app_secret:
                raise RuijieConfigError(
                    "Mode 'apikey' membutuhkan RUIJIE_APP_ID dan RUIJIE_APP_SECRET. "
                    "Harap atur di file .env atau environment variables."
                )
        elif self.auth_mode == "account":
            if not self.username or not self.password:
                raise RuijieConfigError(
                    "Mode 'account' membutuhkan RUIJIE_USERNAME dan RUIJIE_PASSWORD. "
                    "Harap atur di file .env atau environment variables."
                )
        else:
            raise RuijieConfigError(
                f"Mode autentikasi '{self.auth_mode}' tidak dikenali. "
                "Gunakan 'apikey' atau 'account'."
            )

    def get_session(self, force_refresh: bool = False) -> AuthSession:
        """Mendapatkan sesi aktif yang valid (otomatis login/refresh jika perlu)."""
        with self._lock:
            if not force_refresh and self._session and not self._session.is_expired:
                return self._session

            self.validate_configuration()

            if self.auth_mode == "apikey":
                self._session = self._authenticate_apikey()
            else:
                self._session = self._authenticate_account()

            return self._session

    def _authenticate_apikey(self) -> AuthSession:
        """Melakukan handshake OAuth2 token menggunakan App ID & Secret."""
        logger.info("Melakukan otentikasi via OpenAPI ke %s ...", self.base_url)
        url = f"{self.base_url}{_OAUTH_TOKEN_PATH}"

        payload = {
            "appId": self.app_id,
            "appSecret": self.app_secret,
        }
        if self.api_token:
            payload["apiToken"] = self.api_token

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 404:
                    resp = client.post(url, params=payload)

                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as exc:
            raise RuijieAuthError(
                f"Gagal menghubungi server Ruijie Cloud ({self.base_url}): {exc}"
            ) from exc

        token = None
        if isinstance(data, dict):
            inner_data = data.get("data")
            if isinstance(inner_data, dict):
                token = inner_data.get("accessToken") or inner_data.get("access_token") or inner_data.get("token")
            if not token:
                token = data.get("accessToken") or data.get("access_token") or data.get("token")

            code = data.get("code")
            if code is not None and code != 0 and code != "0" and code != 200:
                msg = data.get("msg") or data.get("message") or "Unknown error"
                raise RuijieAuthError(f"Otentikasi Ruijie Cloud ditolak (Code {code}): {msg}")

        if not token:
            raise RuijieAuthError(f"Format respon otentikasi Ruijie tidak mengandung token: {data}")

        expires_at = time.monotonic() + self.token_ttl
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        return AuthSession(
            token=token,
            auth_mode="apikey",
            expires_at=expires_at,
            headers=headers,
            tenant_info={"app_id": self.app_id},
        )

    def _authenticate_account(self) -> AuthSession:
        """Melakukan login menggunakan RSA Encrypted CAS SSO handshake."""
        logger.info("Melakukan login akun Ruijie Cloud via CAS SSO (%s) ...", self.username)

        # 1. Enkripsi password menggunakan RSA PKCS#1 v1.5
        try:
            encrypted_password = rsa_encrypt_password(self.password)
        except Exception as exc:
            raise RuijieAuthError(f"Gagal mengenkripsi password dengan kunci RSA Ruijie: {exc}") from exc

        service_url = f"{self.base_url}{_SERVICE_URL_PATH}"
        sso_login_url = f"{self.base_url}{_SSO_LOGIN_PATH}?service={service_url}"

        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                # 2. Ambil form SSO dan token execution
                r1 = client.get(sso_login_url)
                if r1.status_code != 200:
                    raise RuijieAuthError(f"Gagal memuat halaman login CAS SSO (HTTP {r1.status_code})")

                execution_matches = re.findall(
                    r'<input[^>]+name=[\"\']execution[\"\'][^>]+value=[\"\']([^\"\']+)[\"\']', r1.text
                )
                if not execution_matches:
                    execution_matches = re.findall(
                        r'<input[^>]+value=[\"\']([^\"\']+)[\"\'][^>]+name=[\"\']execution[\"\']', r1.text
                    )
                execution = execution_matches[0] if execution_matches else ""

                lt_matches = re.findall(r'<input[^>]+name=[\"\']lt[\"\'][^>]+value=[\"\']([^\"\']+)[\"\']', r1.text)
                lt = lt_matches[0] if lt_matches else ""

                sign_matches = re.findall(r'<input[^>]+name=[\"\']sign[\"\'][^>]+value=[\"\']([^\"\']+)[\"\']', r1.text)
                sign = sign_matches[0] if sign_matches else ""

                # 3. Validasi akun dan password ke endpoint /sso/validate/password
                r_val = client.post(
                    f"{self.base_url}{_VALIDATE_PWD_PATH}",
                    json={"account": self.username, "password": encrypted_password},
                    headers={
                        "Content-Type": "application/json;charset=UTF-8",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                )
                val_data = r_val.json() if r_val.status_code == 200 else {}
                code = val_data.get("code")
                if code != 0:
                    msg = val_data.get("msg") or "Email atau password salah"
                    raise RuijieAuthError(f"Validasi akun ditolak oleh Ruijie Cloud: {msg}")

                area = val_data.get("area", "AS")

                # 4. Kirim form CAS SSO untuk mendapatkan tiket sesi (TGC / SESSION)
                form_data = {
                    "username": self.username,
                    "password": encrypted_password,
                    "execution": execution,
                    "_eventId": "submit",
                    "selectedCloud": area,
                    "timeZone": "GMT+07:00",
                }
                if lt:
                    form_data["lt"] = lt
                if sign:
                    form_data["sign"] = sign

                r_sso = client.post(
                    sso_login_url,
                    data=form_data,
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Referer": sso_login_url,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                )

                cookies_dict = dict(client.cookies)
                # Pastikan tiket sesi diperoleh (TGC atau SESSION)
                if not cookies_dict or ("TGC" not in cookies_dict and "SESSION" not in cookies_dict and "JSESSIONID" not in cookies_dict):
                    raise RuijieAuthError("Login CAS SSO gagal: Tiket sesi (cookies) tidak diterima dari Ruijie Cloud.")

                # Dapatkan token representasi
                session_token = cookies_dict.get("TGC") or cookies_dict.get("SESSION") or cookies_dict.get("JSESSIONID", "active_session")
                expires_at = time.monotonic() + self.token_ttl

                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/plain, */*",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }

                logger.info("Login akun Ruijie Cloud berhasil. Sesi aktif untuk %s.", self.username)
                return AuthSession(
                    token=session_token,
                    auth_mode="account",
                    expires_at=expires_at,
                    headers=headers,
                    cookies=cookies_dict,
                    tenant_info={"username": self.username, "area": area},
                )
        except httpx.HTTPError as exc:
            raise RuijieAuthError(f"Kesalahan jaringan saat login CAS SSO ke Ruijie Cloud: {exc}") from exc
