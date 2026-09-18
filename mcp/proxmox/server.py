import os
import sys
import json
import urllib3
import requests
from mcp.server.mcpserver import MCPServer

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

current_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(current_dir, "config.json")

def load_config():
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "host": "172.16.0.177",
        "port": 8006,
        "token_id": "root@pam!token",
        "token_secret": "5e50d28f-f380-4357-988c-3a1d8cb4f57e",
        "verify_ssl": False
    }

def get_session():
    cfg = load_config()
    session = requests.Session()
    session.verify = cfg.get("verify_ssl", False)
    session.headers.update({
        "Authorization": f"PVEAPIToken={cfg.get('token_id')}={cfg.get('token_secret')}"
    })
    base_url = f"https://{cfg.get('host')}:{cfg.get('port', 8006)}/api2/json"
    return session, base_url

mcp = MCPServer("proxmox")

@mcp.tool()
def test_connection() -> str:
    """Tes koneksi ke server Proxmox VE dan ambil informasi versi."""
    try:
        session, base_url = get_session()
        resp = session.get(f"{base_url}/version", timeout=8)
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            return json.dumps({
                "status": "success",
                "message": "Koneksi ke Proxmox VE berhasil!",
                "version": data.get("version"),
                "release": data.get("release")
            }, indent=2)
        return json.dumps({"status": "error", "code": resp.status_code, "detail": resp.text}, indent=2)
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)}, indent=2)

@mcp.tool()
def get_nodes() -> str:
    """Ambil daftar node Proxmox beserta status penggunaan CPU, RAM, dan uptime."""
    try:
        session, base_url = get_session()
        resp = session.get(f"{base_url}/nodes", timeout=8)
        resp.raise_for_status()
        nodes = resp.json().get("data", [])
        result = []
        for n in nodes:
            max_mem = n.get("maxmem", 1)
            mem = n.get("mem", 0)
            mem_pct = round((mem / max_mem) * 100, 2) if max_mem else 0
            result.append({
                "node": n.get("node"),
                "status": n.get("status"),
                "cpu_usage_pct": round(n.get("cpu", 0) * 100, 2),
                "ram_usage": f"{round(mem / (1024**3), 2)} GB / {round(max_mem / (1024**3), 2)} GB ({mem_pct}%)",
                "uptime_seconds": n.get("uptime")
            })
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def list_vms_and_containers(node: str = "") -> str:
    """Tampilkan semua VM (KVM/QEMU) dan Container (LXC) beserta ID, nama, status (running/stopped), CPU, dan RAM."""
    try:
        session, base_url = get_session()
        url = f"{base_url}/cluster/resources?type=vm"
        resp = session.get(url, timeout=8)
        resp.raise_for_status()
        items = resp.json().get("data", [])
        results = []
        for item in items:
            if node and item.get("node") != node:
                continue
            max_mem = item.get("maxmem", 1)
            mem = item.get("mem", 0)
            mem_pct = round((mem / max_mem) * 100, 1) if max_mem else 0
            results.append({
                "vmid": item.get("vmid"),
                "name": item.get("name"),
                "type": item.get("type"),
                "node": item.get("node"),
                "status": item.get("status"),
                "cpu_pct": round(item.get("cpu", 0) * 100, 1),
                "ram_usage": f"{round(mem / (1024**2), 1)} MB / {round(max_mem / (1024**2), 1)} MB ({mem_pct}%)",
                "uptime": item.get("uptime")
            })
        results.sort(key=lambda x: x.get("vmid", 0))
        return json.dumps(results, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

def _get_vm_type_and_node(vmid: int):
    session, base_url = get_session()
    resp = session.get(f"{base_url}/cluster/resources?type=vm", timeout=8)
    resp.raise_for_status()
    for item in resp.json().get("data", []):
        if item.get("vmid") == vmid:
            return item.get("type"), item.get("node")
    return None, None

@mcp.tool()
def start_vm(vmid: int) -> str:
    """Menyalakan VM atau LXC Container berdasarkan VMID (contoh: 100, 101)."""
    try:
        vm_type, node = _get_vm_type_and_node(vmid)
        if not vm_type or not node:
            return json.dumps({"status": "error", "message": f"VM/CT dengan ID {vmid} tidak ditemukan."})
        session, base_url = get_session()
        target_type = "qemu" if vm_type == "qemu" else "lxc"
        url = f"{base_url}/nodes/{node}/{target_type}/{vmid}/status/start"
        resp = session.post(url, timeout=10)
        resp.raise_for_status()
        return json.dumps({
            "status": "success",
            "message": f"Perintah START berhasil dikirim ke {vm_type.upper()} {vmid} pada node {node}.",
            "task_upid": resp.json().get("data")
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def stop_vm(vmid: int, graceful: bool = True) -> str:
    """Mematikan VM atau LXC Container. Jika graceful=True (default), akan shutdown normal. Jika False, force stop."""
    try:
        vm_type, node = _get_vm_type_and_node(vmid)
        if not vm_type or not node:
            return json.dumps({"status": "error", "message": f"VM/CT dengan ID {vmid} tidak ditemukan."})
        session, base_url = get_session()
        target_type = "qemu" if vm_type == "qemu" else "lxc"
        action = "shutdown" if graceful else "stop"
        url = f"{base_url}/nodes/{node}/{target_type}/{vmid}/status/{action}"
        resp = session.post(url, timeout=10)
        resp.raise_for_status()
        return json.dumps({
            "status": "success",
            "message": f"Perintah {action.upper()} berhasil dikirim ke {vm_type.upper()} {vmid} pada node {node}.",
            "task_upid": resp.json().get("data")
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def reboot_vm(vmid: int) -> str:
    """Reboot VM atau LXC Container berdasarkan VMID."""
    try:
        vm_type, node = _get_vm_type_and_node(vmid)
        if not vm_type or not node:
            return json.dumps({"status": "error", "message": f"VM/CT dengan ID {vmid} tidak ditemukan."})
        session, base_url = get_session()
        target_type = "qemu" if vm_type == "qemu" else "lxc"
        url = f"{base_url}/nodes/{node}/{target_type}/{vmid}/status/reboot"
        resp = session.post(url, timeout=10)
        resp.raise_for_status()
        return json.dumps({
            "status": "success",
            "message": f"Perintah REBOOT berhasil dikirim ke {vm_type.upper()} {vmid} pada node {node}.",
            "task_upid": resp.json().get("data")
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def get_storage_status(node: str = "") -> str:
    """Melihat kapasitas penyimpanan (storage) Proxmox seperti local, local-lvm, ZFS, atau NFS."""
    try:
        session, base_url = get_session()
        if not node:
            nodes_resp = session.get(f"{base_url}/nodes", timeout=8)
            nodes_resp.raise_for_status()
            nodes = nodes_resp.json().get("data", [])
            node = nodes[0].get("node") if nodes else "pve"
        url = f"{base_url}/nodes/{node}/storage"
        resp = session.get(url, timeout=8)
        resp.raise_for_status()
        storages = resp.json().get("data", [])
        result = []
        for s in storages:
            total = s.get("total", 0)
            used = s.get("used", 0)
            avail = s.get("avail", 0)
            pct = round((used / total) * 100, 1) if total else 0
            result.append({
                "storage": s.get("storage"),
                "type": s.get("type"),
                "total_gb": round(total / (1024**3), 2),
                "used_gb": round(used / (1024**3), 2),
                "avail_gb": round(avail / (1024**3), 2),
                "usage_pct": f"{pct}%",
                "active": s.get("active")
            })
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def create_lxc_container(
    hostname: str,
    cores: int = 2,
    memory_mb: int = 1024,
    disk_gb: int = 10,
    ostemplate: str = "local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst",
    node: str = "node1",
    ip_config: str = "dhcp",
    password: str = "RuijieMCP2026!",
    start: bool = True,
    tags: str = "mcp"
) -> str:
    """Membuat LXC Container baru dengan spesifikasi standar di Proxmox."""
    try:
        session, base_url = get_session()
        nextid = session.get(f"{base_url}/cluster/nextid", timeout=8).json().get("data")
        net0 = "name=eth0,bridge=vmbr0,firewall=1,ip=dhcp" if ip_config == "dhcp" else f"name=eth0,bridge=vmbr0,firewall=1,ip={ip_config}"
        payload = {
            "vmid": nextid,
            "hostname": hostname,
            "ostemplate": ostemplate,
            "cores": cores,
            "memory": memory_mb,
            "swap": 512,
            "rootfs": f"local-lvm:{disk_gb}",
            "net0": net0,
            "unprivileged": 1,
            "features": "nesting=1",
            "tags": tags,
            "password": password,
            "start": 1 if start else 0
        }
        resp = session.post(f"{base_url}/nodes/{node}/lxc", json=payload, timeout=15)
        resp.raise_for_status()
        return json.dumps({
            "status": "success",
            "message": f"Container {hostname} (ID {nextid}) berhasil dibuat!",
            "vmid": nextid,
            "task_upid": resp.json().get("data")
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

if __name__ == "__main__":
    mcp.run(transport="stdio")
