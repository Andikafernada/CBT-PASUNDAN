"""Ruijie Cloud Model Context Protocol (MCP) Server Entrypoint - Full Featured."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

# Mendukung kompatibilitas mcp 2.x (MCPServer) dan mcp 1.x (FastMCP)
try:
    from mcp.server import MCPServer
except ImportError:
    try:
        from mcp.server.mcpserver import MCPServer
    except ImportError:
        from mcp.server.fastmcp import FastMCP as MCPServer

from ruijie_mcp.auth import RuijieAuthError, RuijieAuthManager, RuijieConfigError
from ruijie_mcp.client import RuijieHttpClient

# Konfigurasi logging standar
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ruijie_mcp.server")

# Inisialisasi MCP server
mcp = MCPServer(
    name="ruijie-cloud",
    instructions=(
        "MCP Server resmi untuk integrasi Antigravity dengan Ruijie Cloud dan Reyee Cloud. "
        "Mendukung pemantauan status perangkat (AP, Switch, Gateway), inventaris jaringan, "
        "remediasi (reboot perangkat), serta pemeriksaan konfigurasi Wi-Fi SSID."
    ),
)

# Global Client Instance
_client: RuijieHttpClient | None = None


def get_client() -> RuijieHttpClient:
    """Singleton getter untuk RuijieHttpClient."""
    global _client
    if _client is None:
        _client = RuijieHttpClient()
    return _client


@mcp.tool()
def ruijie_test_connection() -> str:
    """Menguji autentikasi dan konektivitas langsung ke platform Ruijie Cloud.

    Gunakan tool ini untuk memverifikasi apakah akun/kredensial Ruijie Cloud aktif,
    dan apakah project jaringan dapat diakses.
    """
    try:
        client = get_client()
        result = client.test_connection()
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"status": "failed", "error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_get_auth_status() -> str:
    """Mendapatkan informasi status autentikasi, base URL, mode login, dan sisa masa aktif sesi.

    Berguna untuk melihat konfigurasi aktif tanpa mengirim request berlebih ke server Ruijie.
    """
    try:
        auth_mgr = get_client().auth
        auth_mgr.validate_configuration()

        cached_session = auth_mgr._session
        is_active = cached_session is not None and not cached_session.is_expired

        status = {
            "base_url": auth_mgr.base_url,
            "auth_mode": auth_mgr.auth_mode,
            "session_active": is_active,
            "configured_identity": auth_mgr.app_id if auth_mgr.auth_mode == "apikey" else auth_mgr.username,
            "remaining_seconds": round(cached_session.remaining_seconds, 1) if cached_session else 0,
            "token_ttl_setting": auth_mgr.token_ttl,
        }
        return json.dumps(status, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"session_active": False, "error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_list_projects() -> str:
    """Mendapatkan seluruh daftar project jaringan (baik project sendiri maupun project sharing).

    Mengembalikan ID group, nama project, pemilik akun, serta ringkasan jumlah AP, Switch, dan Gateway
    beserta status online dan offline-nya.
    """
    try:
        client = get_client()
        projects = client.get_projects()
        return json.dumps({"total_projects": len(projects), "projects": projects}, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_get_project_summary(group_id: Optional[int] = None) -> str:
    """Mendapatkan ringkasan statistik kesehatan jaringan dan rincian perangkat pada suatu project.

    Args:
        group_id: ID grup/project Ruijie Cloud (opsional, jika dikosongkan otomatis memilih project utama).
    """
    try:
        client = get_client()
        projects = client.get_projects()
        target_group_id = client._resolve_default_group_id(group_id)

        target_proj = next((p for p in projects if p["group_id"] == target_group_id), None)
        devices = client.get_devices(group_id=target_group_id)

        model_distribution: dict[str, int] = {}
        for d in devices:
            m = d.get("model") or "Unknown"
            model_distribution[m] = model_distribution.get(m, 0) + 1

        summary = {
            "project_info": target_proj or {"group_id": target_group_id},
            "device_count_actual": len(devices),
            "model_distribution": model_distribution,
        }
        return json.dumps(summary, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_list_devices(
    group_id: Optional[int] = None,
    product_type: Optional[str] = None,
    status: Optional[str] = None,
) -> str:
    """Menampilkan daftar seluruh perangkat jaringan (Access Point, Switch, Gateway) pada project.

    Args:
        group_id: ID grup/project (opsional, jika kosong otomatis menggunakan project utama).
        product_type: Filter tipe perangkat ('AP', 'SWITCH', 'MSW', 'GATEWAY', 'EGW') (opsional).
        status: Filter status online ('ONLINE', 'OFFLINE') (opsional).
    """
    try:
        client = get_client()
        devices = client.get_devices(group_id=group_id, product_type=product_type, status=status)
        return json.dumps({
            "total_count": len(devices),
            "filter_applied": {"product_type": product_type, "status": status},
            "devices": devices
        }, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_get_device_detail(serial_number: str, group_id: Optional[int] = None) -> str:
    """Mendapatkan informasi detail mendalam tentang suatu perangkat berdasarkan Serial Number (SN).

    Args:
        serial_number: Serial number (SN) perangkat Ruijie (contoh: 'G1QH36X014397').
        group_id: ID grup/project (opsional).
    """
    try:
        client = get_client()
        detail = client.get_device_detail(sn=serial_number, group_id=group_id)
        return json.dumps(detail, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_rename_device(serial_number: str, new_name: str, group_id: Optional[int] = None) -> str:
    """Mengubah nama alias perangkat di Ruijie Cloud.

    Args:
        serial_number: Serial number (SN) perangkat yang akan diubah namanya.
        new_name: Nama baru untuk perangkat tersebut (contoh: 'AP-Lantai-2').
        group_id: ID grup/project (opsional).
    """
    try:
        client = get_client()
        result = client.rename_device(sn=serial_number, new_name=new_name, group_id=group_id)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_reboot_device(serial_number: str, group_id: Optional[int] = None) -> str:
    """Melakukan restart/reboot perangkat (Access Point, Switch, atau Gateway) berdasarkan Serial Number.

    Args:
        serial_number: Serial number (SN) perangkat yang ingin di-reboot.
        group_id: ID grup/project (opsional).
    """
    try:
        client = get_client()
        result = client.reboot_device(sn=serial_number, group_id=group_id)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_list_ssids(group_id: Optional[int] = None) -> str:
    """Menampilkan daftar nama SSID Wi-Fi yang aktif pada project.

    Args:
        group_id: ID grup/project (opsional).
    """
    try:
        client = get_client()
        ssids = client.get_ssids(group_id=group_id)
        return json.dumps({"total_ssids": len(ssids), "ssids": ssids}, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_get_switch_ports(switch_sn: str, group_id: Optional[int] = None) -> str:
    """Mendapatkan informasi slot dan port pada switch Ruijie / Reyee.

    Args:
        switch_sn: Serial Number switch Ruijie.
        group_id: ID grup/project (opsional).
    """
    try:
        client = get_client()
        ports = client.get_switch_ports(sn=switch_sn, group_id=group_id)
        return json.dumps(ports, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_create_ssid(
    ssid_name: str,
    password: Optional[str] = None,
    vlan_id: int = 1,
    group_id: Optional[int] = None,
    hidden: bool = False,
    radios: str = "1,2",
) -> str:
    """Membuat SSID Wi-Fi baru pada project Ruijie Cloud dan otomatis disinkronkan ke seluruh AP.

    Args:
        ssid_name: Nama SSID Wi-Fi yang akan dibuat (misal: 'TKJ ASOY').
        password: Password WPA/WPA2-PSK (minimal 8 karakter, atau kosongkan jika ingin Wi-Fi Open).
        vlan_id: Nomor VLAN ID untuk SSID ini (default: 1).
        group_id: ID grup/project Ruijie Cloud (opsional, default ke project utama).
        hidden: Set true jika ingin menyembunyikan SSID (default: false).
        radios: Pita frekuensi radio ('1,2' untuk 2.4GHz & 5GHz dual-band).
    """
    try:
        client = get_client()
        result = client.create_ssid(
            ssid_name=ssid_name,
            password=password,
            vlan_id=vlan_id,
            group_id=group_id,
            hidden=hidden,
            radios=radios,
        )
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)}, indent=2)


@mcp.tool()
def ruijie_delete_ssid(ssid_name_or_id: str, group_id: Optional[int] = None) -> str:
    """Menghapus SSID Wi-Fi pada project Ruijie Cloud berdasarkan Nama SSID atau ID SSID.

    Args:
        ssid_name_or_id: Nama SSID (misal: 'TKJ ASOY') atau ID SSID (misal: 16172776).
        group_id: ID grup/project (opsional).
    """
    try:
        client = get_client()
        result = client.delete_ssid(ssid_name_or_id=ssid_name_or_id, group_id=group_id)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)}, indent=2)


if __name__ == "__main__":
    logger.info("Memulai Ruijie Cloud MCP Server (Full Features)...")
    mcp.run()
