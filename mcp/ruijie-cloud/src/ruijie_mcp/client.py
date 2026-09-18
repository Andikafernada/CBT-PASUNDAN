"""HTTP Client Wrapper for Ruijie Cloud REST API & Webproxy Dispatcher."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx

from ruijie_mcp.auth import AuthSession, RuijieAuthError, RuijieAuthManager

logger = logging.getLogger("ruijie_mcp.client")

_SHARED_PROJECTS_PATH = "/network/cooperate/share/imported-project/list"
_ROOT_GROUP_TREE_PATH = "/group/single/tree"
_DEVICE_LIST_PATH = "/maint/devices/list"
_DEVICE_DETAIL_PATH = "/maint/device"
_DEVICE_REBOOT_PATH = "/maint/device/reboot"
_SWITCH_SLOT_PORT_PATH = "/switch/slot_port/info"


class RuijieHttpClient:
    """Klien HTTP yang terautentikasi otomatis ke Ruijie Cloud (mendukung akun langsung & sharing)."""

    def __init__(self, auth_manager: Optional[RuijieAuthManager] = None) -> None:
        self.auth = auth_manager or RuijieAuthManager()
        self._tenant_mapping: dict[int, int] = {}  # group_id -> tenant_id

    def request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict[str, Any]] = None,
        json: Optional[Any] = None,
        headers: Optional[dict[str, str]] = None,
        timeout: Optional[float] = None,
    ) -> Any:
        """Mengirim HTTP request dengan token/cookie auth dan auto-retry saat 401."""
        session = self.auth.get_session()

        url = f"{self.auth.base_url}/{path.lstrip('/')}"
        req_headers = dict(session.headers)
        if headers:
            req_headers.update(headers)

        req_timeout = timeout or self.auth.timeout

        with httpx.Client(timeout=req_timeout, cookies=session.cookies, follow_redirects=True) as client:
            resp = client.request(
                method=method.upper(),
                url=url,
                params=params,
                json=json,
                headers=req_headers,
            )

            # Jika sesi kedaluwarsa, lakukan refresh dan coba kembali
            if resp.status_code in (401, 403) or (resp.headers.get("content-type", "").startswith("text/html") and "sso/login" in resp.text):
                logger.warning("Sesi Ruijie kedaluwarsa. Memperbarui sesi otomatis...")
                session = self.auth.get_session(force_refresh=True)
                req_headers.update(session.headers)

                with httpx.Client(timeout=req_timeout, cookies=session.cookies, follow_redirects=True) as retry_client:
                    resp = retry_client.request(
                        method=method.upper(),
                        url=url,
                        params=params,
                        json=json,
                        headers=req_headers,
                    )

            resp.raise_for_status()
            try:
                return resp.json()
            except Exception:
                return resp.text

    def call_webproxy(
        self,
        api: str,
        method: str = "GET",
        querys: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, Any]] = None,
        tenant_id: Optional[int | str] = None,
        group_id: Optional[int | str] = None,
    ) -> dict[str, Any]:
        """Mengirim request melalui gateway webproxy Ruijie Cloud (kompatibel penuh akun sharing)."""
        clean_api = api.split("?")[0]
        proxy_path = f"/webproxy/common/api?{clean_api}"

        # Cari tenant_id otomatis jika group_id terdaftar dalam mapping sharing
        gid = None
        if group_id is not None:
            try:
                gid = int(group_id)
            except Exception:
                pass
        if not tenant_id and gid and gid in self._tenant_mapping:
            tenant_id = self._tenant_mapping[gid]

        effective_querys: dict[str, Any] = {"lang": "en"}
        if querys:
            effective_querys.update(querys)

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if tenant_id:
            headers["tenantId"] = str(tenant_id)
            effective_querys["global_atid"] = str(tenant_id)

        payload = {
            "api": api,
            "method": method.upper(),
            "module": "default",
            "querys": effective_querys,
            "params": params or {},
        }

        res = self.request("POST", proxy_path, json=payload, headers=headers)
        if isinstance(res, dict):
            return res
        return {"code": 0, "raw": res}

    def test_connection(self) -> dict[str, Any]:
        """Uji konektivitas dan autentikasi ke Ruijie Cloud."""
        session = self.auth.get_session()
        masked_token = (
            f"{session.token[:6]}...{session.token[-6:]}" if len(session.token) > 12 else "***"
        )
        test_result = {
            "status": "connected",
            "auth_mode": session.auth_mode,
            "base_url": self.auth.base_url,
            "token_preview": masked_token,
            "session_remaining_seconds": round(session.remaining_seconds, 1),
            "tenant_info": session.tenant_info,
            "message": "Autentikasi dan koneksi ke Ruijie Cloud berhasil diverifikasi.",
        }

        # Coba periksa daftar project
        try:
            projects = self.get_projects()
            test_result["projects_accessible"] = True
            test_result["project_count"] = len(projects)
            test_result["projects"] = [
                {"id": p.get("group_id"), "name": p.get("name"), "is_shared": p.get("is_shared")}
                for p in projects
            ]
        except Exception as exc:
            test_result["projects_accessible"] = False
            test_result["api_warning"] = str(exc)

        return test_result

    def get_projects(self) -> list[dict[str, Any]]:
        """Mengambil seluruh daftar project jaringan (milik sendiri dan project sharing)."""
        projects: list[dict[str, Any]] = []

        # 1. Project Sharing (Cooperate Sharing / Imported)
        try:
            share_res = self.call_webproxy(
                api=f"{_SHARED_PROJECTS_PATH}?page=1&per_page=100",
                method="GET"
            )
            shared_list = share_res.get("sharedGroupList", [])
            for item in shared_list:
                gid = item.get("groupId")
                tid = item.get("tenantId")
                if gid and tid:
                    self._tenant_mapping[gid] = tid

                # Hitung ringkasan perangkat
                dev_detail = item.get("devTypeDetail", [])
                ap_stats = {"total": 0, "online": 0, "offline": 0}
                sw_stats = {"total": 0, "online": 0, "offline": 0}
                gw_stats = {"total": 0, "online": 0, "offline": 0}

                for dev in dev_detail:
                    c_type = dev.get("commonType", "").upper()
                    t_count = dev.get("totalCount", 0)
                    on_count = dev.get("onCount", 0)
                    off_count = dev.get("offCount", 0)
                    if c_type == "AP":
                        ap_stats["total"] += t_count
                        ap_stats["online"] += on_count
                        ap_stats["offline"] += off_count
                    elif "SWITCH" in c_type or dev.get("productType") in ("MSW", "ESW"):
                        sw_stats["total"] += t_count
                        sw_stats["online"] += on_count
                        sw_stats["offline"] += off_count
                    elif "GATEWAY" in c_type or dev.get("productType") in ("EGW", "GW"):
                        gw_stats["total"] += t_count
                        gw_stats["online"] += on_count
                        gw_stats["offline"] += off_count

                projects.append({
                    "group_id": gid,
                    "name": item.get("groupName"),
                    "is_shared": True,
                    "tenant_id": tid,
                    "shared_by": item.get("tenantName") or item.get("userName"),
                    "timezone": item.get("timezone", "Asia/Jakarta"),
                    "business_type": item.get("businessType", "MARKET"),
                    "device_summary": {
                        "ap_total": ap_stats["total"],
                        "ap_online": ap_stats["online"],
                        "ap_offline": ap_stats["offline"],
                        "switch_total": sw_stats["total"],
                        "switch_online": sw_stats["online"],
                        "switch_offline": sw_stats["offline"],
                        "gateway_total": gw_stats["total"],
                        "gateway_online": gw_stats["online"],
                        "gateway_offline": gw_stats["offline"],
                        "total_devices": ap_stats["total"] + sw_stats["total"] + gw_stats["total"]
                    }
                })
        except Exception as exc:
            logger.warning("Gagal memuat shared projects: %s", exc)

        # 2. Project Milik Sendiri (Root Tree)
        try:
            tree_res = self.call_webproxy(api=_ROOT_GROUP_TREE_PATH, method="GET")
            root = tree_res.get("groups", {})
            subgroups = root.get("subGroups", [])
            for sg in subgroups:
                gid = sg.get("groupId")
                # Jangan duplikasi jika ID sama
                if any(p["group_id"] == gid for p in projects):
                    continue
                projects.append({
                    "group_id": gid,
                    "name": sg.get("name"),
                    "is_shared": False,
                    "tenant_id": None,
                    "shared_by": "Self (Owner)",
                    "timezone": sg.get("timezone", "Asia/Jakarta"),
                    "business_type": sg.get("businessType", "GENERAL"),
                    "device_summary": {
                        "ap_total": 0, "ap_online": 0, "ap_offline": 0,
                        "switch_total": 0, "switch_online": 0, "switch_offline": 0,
                        "gateway_total": 0, "gateway_online": 0, "gateway_offline": 0,
                        "total_devices": 0
                    }
                })
        except Exception as exc:
            logger.warning("Gagal memuat root project tree: %s", exc)

        return projects

    def _resolve_default_group_id(self, group_id: Optional[int | str] = None) -> int:
        """Memilih group_id default jika pengguna tidak menentukan secara eksplisit."""
        if group_id is not None:
            try:
                return int(group_id)
            except Exception:
                pass
        projects = self.get_projects()
        if not projects:
            raise RuijieAuthError("Tidak ada project/jaringan yang ditemukan pada akun Ruijie Cloud Anda.")
        # Prioritaskan project yang memiliki perangkat
        for p in projects:
            if p.get("device_summary", {}).get("total_devices", 0) > 0:
                return p["group_id"]
        return projects[0]["group_id"]

    def get_devices(
        self,
        group_id: Optional[int | str] = None,
        product_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Mengambil seluruh perangkat (AP, Switch, Gateway) pada project tertentu."""
        target_group_id = self._resolve_default_group_id(group_id)

        # Pastikan mapping tenant terisi
        if target_group_id not in self._tenant_mapping:
            self.get_projects()

        api_call = f"{_DEVICE_LIST_PATH}?page=1&per_page=200"
        res = self.call_webproxy(
            api=api_call,
            method="POST",
            params={"groupId": target_group_id},
            group_id=target_group_id,
        )

        raw_list = res.get("deviceList", [])
        clean_devices: list[dict[str, Any]] = []

        for d in raw_list:
            dev_type = d.get("commonType") or d.get("productType") or "DEVICE"
            dev_status = d.get("onlineStatus", "OFF").upper()

            # Filter tipe perangkat
            if product_type and product_type.upper() not in (dev_type.upper(), d.get("productType", "").upper()):
                continue

            # Filter status online/offline
            if status:
                st = status.upper()
                if st in ("ONLINE", "ON") and dev_status != "ON":
                    continue
                if st in ("OFFLINE", "OFF") and dev_status != "OFF":
                    continue

            clean_devices.append({
                "serial_number": d.get("serialNumber"),
                "name": d.get("name") or d.get("aliasName") or "Unnamed Device",
                "alias_name": d.get("aliasName"),
                "type": dev_type,
                "model": d.get("productClass"),
                "status": "ONLINE" if dev_status == "ON" else "OFFLINE",
                "ip": d.get("localIp") or "-",
                "mac": d.get("mac") or "-",
                "software_version": d.get("softwareVersion") or "-",
                "hardware_version": d.get("hardwareVersion") or "-",
                "group_id": d.get("groupId") or target_group_id,
                "group_name": d.get("groupName") or "-",
            })

        return clean_devices

    def get_device_detail(self, sn: str, group_id: Optional[int | str] = None) -> dict[str, Any]:
        """Mendapatkan detail mendalam perangkat berdasarkan Serial Number (SN)."""
        target_group_id = self._resolve_default_group_id(group_id)
        api_call = f"{_DEVICE_DETAIL_PATH}/{sn}"

        res = self.call_webproxy(
            api=api_call,
            method="GET",
            group_id=target_group_id,
        )

        return {
            "serial_number": sn,
            "name": res.get("name"),
            "model": res.get("productClass"),
            "product_type": res.get("productType"),
            "common_type": res.get("commonType"),
            "mac": res.get("mac"),
            "region": res.get("region"),
            "config_sync_status": res.get("confSyncType"),
            "ssids": [s.get("ssid") for s in res.get("ssidList", [])],
            "master_gateway": res.get("currentDeviceMaster"),
            "raw_detail": res,
        }

    def rename_device(self, sn: str, new_name: str, group_id: Optional[int | str] = None) -> dict[str, Any]:
        """Mengubah nama alias perangkat di Ruijie Cloud."""
        target_group_id = self._resolve_default_group_id(group_id)
        api_call = f"{_DEVICE_DETAIL_PATH}/{sn}"

        res = self.call_webproxy(
            api=api_call,
            method="POST",
            params={"aliasName": new_name, "sn": sn},
            group_id=target_group_id,
        )
        return {
            "serial_number": sn,
            "new_name": new_name,
            "success": res.get("code") == 0,
            "message": res.get("msg", "Berhasil mengubah nama perangkat."),
        }

    def reboot_device(self, sn: str, group_id: Optional[int | str] = None) -> dict[str, Any]:
        """Mengirim instruksi reboot ke perangkat Ruijie (AP, Switch, Gateway)."""
        target_group_id = self._resolve_default_group_id(group_id)

        res = self.call_webproxy(
            api=_DEVICE_REBOOT_PATH,
            method="POST",
            params={"snList": [sn], "groupId": target_group_id},
            group_id=target_group_id,
        )
        return {
            "serial_number": sn,
            "success": res.get("code") == 0,
            "message": res.get("msg", "Perintah reboot berhasil dikirim ke perangkat."),
        }

    def get_ssids(self, group_id: Optional[int | str] = None) -> list[dict[str, Any]]:
        """Mengambil konfigurasi SSID Wi-Fi yang aktif pada project."""
        target_group_id = self._resolve_default_group_id(group_id)
        # Cari AP online di project dan ambil daftar SSID-nya
        devices = self.get_devices(group_id=target_group_id, product_type="AP", status="ONLINE")
        if not devices:
            devices = self.get_devices(group_id=target_group_id, product_type="AP")

        discovered_ssids: set[str] = set()
        ssids_detail: list[dict[str, Any]] = []

        for ap in devices[:5]:  # Periksa beberapa AP sampel
            sn = ap["serial_number"]
            try:
                detail = self.get_device_detail(sn, group_id=target_group_id)
                raw = detail.get("raw_detail", {})
                for item in raw.get("ssidList", []):
                    s_name = item.get("ssid")
                    if s_name and s_name not in discovered_ssids:
                        discovered_ssids.add(s_name)
                        ssids_detail.append({
                            "ssid": s_name,
                            "radio_index": item.get("radioIndex", "1,2 (2.4GHz & 5GHz)"),
                            "hidden": item.get("hidden", False),
                            "sample_ap": ap["name"],
                        })
            except Exception:
                continue

        return ssids_detail

    def get_switch_ports(self, sn: str, group_id: Optional[int | str] = None) -> dict[str, Any]:
        """Mendapatkan informasi slot dan status port switch Ruijie."""
        target_group_id = self._resolve_default_group_id(group_id)
        api_call = f"{_SWITCH_SLOT_PORT_PATH}?sn={sn}"

        res = self.call_webproxy(
            api=api_call,
            method="GET",
            group_id=target_group_id,
        )
        return {
            "switch_sn": sn,
            "port_summary": res,
        }

    def create_ssid(
        self,
        ssid_name: str,
        password: Optional[str] = None,
        vlan_id: int = 1,
        group_id: Optional[int | str] = None,
        hidden: bool = False,
        radios: str = "1,2",
    ) -> dict[str, Any]:
        """Membuat SSID Wi-Fi baru pada project Ruijie Cloud."""
        target_group_id = self._resolve_default_group_id(group_id)

        # Ambil template id dan alokasi wlanId berikutnya
        res_group = self.call_webproxy(f"/conf/group/{target_group_id}/ssid", method="GET", group_id=target_group_id)
        group_list = res_group.get("list", [])
        if not group_list:
            raise RuijieAuthError(f"Gagal mengambil konfigurasi grup/template untuk group {target_group_id}")

        group_data = group_list[0]
        conf_temp_id = group_data.get("confTempId")
        existing_ssids = group_data.get("ssidList", [])
        existing_wlan_ids = [s.get("wlanId", 0) for s in existing_ssids]
        next_wlan_id = max(existing_wlan_ids, default=0) + 1

        is_open = not password
        encryption_mode = "open" if is_open else "wpa_wpa2-psk"
        encryption_desc = "Open" if is_open else "WPA/WPA2-PSK"

        payload = {
            "confTemplateId": conf_temp_id,
            "groupId": target_group_id,
            "wifiGrpSsid": False,
            "wirelessConfEntity": {
                "ssidName": ssid_name,
                "password": password or "",
                "vlanId": vlan_id,
                "wlanId": next_wlan_id,
                "enable": "true",
                "ishidden": "true" if hidden else "false",
                "fowardType": "bridge",
                "relatedRadio": radios,
                "ssidEncode": "utf-8",
                "encryptionMode": encryption_mode,
                "encryptionModeDesc": encryption_desc,
                "qosEnable": "false",
                "wlanQosEnable": "false",
                "authEnable": "false",
                "bandSelectEnable": "false",
                "ppskEnable": "false",
                "usersLimit": 0,
                "xpressEnable": "false",
                "ftEnable": 0,
                "okcEnable": 0,
                "axMode": "true",
                "beMode": "true",
                "wm": "0",
                "vAuth": "0",
                "mlo": "0",
                "isApartment": "false",
                "isGuest": "false",
                "l2iso": "false",
                "wirelessModeType": "wifi7",
                "preset": "0",
            },
        }

        res = self.call_webproxy(
            api="/conf/template/ssid",
            method="POST",
            params=payload,
            group_id=target_group_id,
        )

        return {
            "success": res.get("code") == 0,
            "ssid_name": ssid_name,
            "wlan_id": next_wlan_id,
            "vlan_id": vlan_id,
            "conf_template_id": conf_temp_id,
            "group_id": target_group_id,
            "message": res.get("msg", "SSID berhasil dibuat."),
            "raw_response": res,
        }

    def delete_ssid(self, ssid_name_or_id: str | int, group_id: Optional[int | str] = None) -> dict[str, Any]:
        """Menghapus SSID Wi-Fi berdasarkan nama atau ID SSID."""
        target_group_id = self._resolve_default_group_id(group_id)

        res_group = self.call_webproxy(f"/conf/group/{target_group_id}/ssid", method="GET", group_id=target_group_id)
        group_list = res_group.get("list", [])
        if not group_list:
            raise RuijieAuthError(f"Gagal mengambil konfigurasi grup {target_group_id}")

        group_data = group_list[0]
        conf_temp_id = group_data.get("confTempId")
        existing_ssids = group_data.get("ssidList", [])

        target_ssid = None
        for s in existing_ssids:
            if str(s.get("id")) == str(ssid_name_or_id) or s.get("ssidName", "").strip().lower() == str(ssid_name_or_id).strip().lower():
                target_ssid = s
                break

        if not target_ssid:
            return {"success": False, "message": f"SSID '{ssid_name_or_id}' tidak ditemukan di project."}

        ssid_id = target_ssid.get("id")
        api_delete = f"/conf/template/{conf_temp_id}/ssid/{ssid_id}"
        res = self.call_webproxy(
            api=api_delete,
            method="DELETE",
            group_id=target_group_id,
        )

        return {
            "success": res.get("code") == 0,
            "deleted_ssid": target_ssid.get("ssidName"),
            "ssid_id": ssid_id,
            "message": res.get("msg", "SSID berhasil dihapus."),
            "raw_response": res,
        }

