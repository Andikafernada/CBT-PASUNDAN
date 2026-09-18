"""CLI Diagnostic Tool for Ruijie Cloud MCP Authentication."""

import argparse
import json
import os
import sys

# Tambahkan src ke sys.path agar modul ruijie_mcp bisa langsung diimport
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from ruijie_mcp.auth import RuijieAuthError, RuijieAuthManager, RuijieConfigError
from ruijie_mcp.client import RuijieHttpClient


def main() -> int:
    parser = argparse.ArgumentParser(description="Uji coba otentikasi dan konektivitas ke Ruijie Cloud")
    parser.add_argument("--dry-run", action="store_true", help="Hanya periksa kelengkapan konfigurasi tanpa mengirim HTTP request")
    args = parser.parse_args()

    print("=" * 65)
    print("  RUIJIE CLOUD MCP - DIAGNOSTIK KONEKSI & AUTENTIKASI (FASE 1)  ")
    print("=" * 65)

    auth = RuijieAuthManager()

    print(f"\n[1] Konfigurasi Terdeteksi:")
    print(f"    - Base URL    : {auth.base_url}")
    print(f"    - Mode Auth   : {auth.auth_mode}")
    if auth.auth_mode == "apikey":
        print(f"    - App ID      : {auth.app_id or '<BELUM DIISI>'}")
        print(f"    - App Secret  : {'*' * len(auth.app_secret) if auth.app_secret else '<BELUM DIISI>'}")
        print(f"    - API Token   : {'Ada' if auth.api_token else '<Opsional / Belum Diisi>'}")
    else:
        print(f"    - Username    : {auth.username or '<BELUM DIISI>'}")
        print(f"    - Password    : {'*' * len(auth.password) if auth.password else '<BELUM DIISI>'}")

    # Pastikan output stream menangani UTF-8 di terminal Windows
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    # Validasi konfigurasi
    try:
        auth.validate_configuration()
        print("\n[OK] Validasi Konfigurasi: LENGKAP & VALID")
    except RuijieConfigError as cfg_err:
        print(f"\n[FAIL] Validasi Konfigurasi Gagal: {cfg_err}")
        print("\n--> Petunjuk: Salin file .env.example menjadi .env dan isi kredensial Anda.")
        return 1

    if args.dry_run:
        print("\n[INFO] Mode dry-run aktif. Pengujian HTTP request dilewati.")
        print("[OK] Konfigurasi siap digunakan.")
        return 0

    print("\n[2] Menghubungi Server Ruijie Cloud...")
    client = RuijieHttpClient(auth_manager=auth)

    try:
        result = client.test_connection()
        print("\n[OK] KONEKSI & AUTENTIKASI BERHASIL!")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("\n--> MCP Server Ruijie Cloud siap didaftarkan ke Antigravity!")
        return 0
    except RuijieAuthError as auth_err:
        print(f"\n[FAIL] Autentikasi Gagal: {auth_err}")
        print("\n--> Petunjuk: Periksa kembali keabsahan App ID/Secret atau Username/Password Anda.")
        return 2
    except Exception as exc:
        print(f"\n[FAIL] Terjadi Kesalahan Koneksi: {exc}")
        return 3


if __name__ == "__main__":
    sys.exit(main())
