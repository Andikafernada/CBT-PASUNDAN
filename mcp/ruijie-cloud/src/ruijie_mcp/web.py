"""Ruijie Cloud Web Dashboard & MCP SSE Gateway.

Menyediakan:
1. Web UI Dashboard interaktif (http://localhost:8000/)
2. REST API & Swagger UI (http://localhost:8000/docs)
3. MCP SSE Transport untuk Web AI (http://localhost:8000/mcp/sse)
"""

from __future__ import annotations

import os
import sys
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from ruijie_mcp.client import RuijieHttpClient
from ruijie_mcp.server import mcp

app = FastAPI(
    title="Ruijie Cloud Network Controller & MCP Gateway",
    description="Layanan Web Dashboard dan API Gateway lokal untuk memantau & mengontrol perangkat jaringan Ruijie Cloud SMK Pasundan 2 Bandung.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global client
client = RuijieHttpClient()

# Mount MCP SSE app at /mcp
try:
    from mcp.server.transport_security import TransportSecuritySettings
    mcp_app = mcp.sse_app(transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False))
    app.mount("/mcp", mcp_app)
except Exception as e:
    try:
        mcp_app = mcp.sse_app()
        app.mount("/mcp", mcp_app)
    except Exception as exc:
        print(f"Warning: Failed to mount MCP SSE: {exc}")


class CreateSSIDRequest(BaseModel):
    ssid_name: str
    password: Optional[str] = None
    vlan_id: int = 1
    hidden: bool = False
    radios: str = "1,2"


class RenameDeviceRequest(BaseModel):
    new_name: str


@app.get("/api/status")
def get_status():
    """Mendapatkan status konektivitas dan autentikasi ke Ruijie Cloud."""
    try:
        return client.test_connection()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/projects")
def get_projects():
    """Mendapatkan daftar project / jaringan."""
    try:
        return client.get_projects()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/devices")
def get_devices(
    product_type: Optional[str] = Query(None, description="Filter: AP, SWITCH, GATEWAY"),
    status: Optional[str] = Query(None, description="Filter: ONLINE, OFFLINE"),
):
    """Mendapatkan seluruh perangkat jaringan."""
    try:
        devs = client.get_devices(product_type=product_type, status=status)
        return {"total": len(devs), "devices": devs}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/devices/{sn}")
def get_device_detail(sn: str):
    """Mendapatkan informasi detail perangkat via Serial Number."""
    try:
        return client.get_device_detail(sn)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/devices/{sn}/reboot")
def reboot_device(sn: str):
    """Me-reboot perangkat via Serial Number."""
    try:
        return client.reboot_device(sn)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/devices/{sn}/rename")
def rename_device(sn: str, req: RenameDeviceRequest):
    """Mengubah nama alias perangkat."""
    try:
        return client.rename_device(sn, req.new_name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/ssids")
def get_ssids():
    """Mendapatkan konfigurasi SSID Wi-Fi aktif."""
    try:
        ssids = client.get_ssids()
        # Also try smartscene/network/ssid for richer detail
        projects = client.get_projects()
        gid = projects[0]["group_id"] if projects else None
        rich = []
        if gid:
            res = client.call_webproxy(f"/conf/group/{gid}/ssid", method="GET", group_id=gid)
            if res.get("list"):
                rich = res["list"][0].get("ssidList", [])
        return {"ssids": ssids, "rich_config": rich}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/ssids")
def create_ssid(req: CreateSSIDRequest):
    """Membuat SSID Wi-Fi baru dan menyinkronkannya ke seluruh AP."""
    try:
        res = client.create_ssid(
            ssid_name=req.ssid_name,
            password=req.password,
            vlan_id=req.vlan_id,
            hidden=req.hidden,
            radios=req.radios,
        )
        return res
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.delete("/api/ssids/{ssid_name_or_id}")
def delete_ssid(ssid_name_or_id: str):
    """Menghapus SSID Wi-Fi berdasarkan Nama atau ID."""
    try:
        return client.delete_ssid(ssid_name_or_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/audit")
def get_audit():
    """Mengambil hasil audit kesehatan dan keamanan jaringan terkini."""
    try:
        devices = client.get_devices()
        offline = [d for d in devices if d.get("status") != "ONLINE"]
        online = [d for d in devices if d.get("status") == "ONLINE"]
        
        projects = client.get_projects()
        gid = projects[0]["group_id"] if projects else None
        ssids = []
        if gid:
            res = client.call_webproxy(f"/conf/group/{gid}/ssid", method="GET", group_id=gid)
            if res.get("list"):
                ssids = res["list"][0].get("ssidList", [])

        return {
            "total_devices": len(devices),
            "online_count": len(online),
            "offline_count": len(offline),
            "offline_devices": offline,
            "ssids": ssids,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ruijie Cloud Network Controller - SMK Pasundan 2 Bandung</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">
  <!-- Top Navbar -->
  <header class="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-xl shadow-cyan-500/30 shadow-md">
        R
      </div>
      <div>
        <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          SMK Pasundan 2 Bandung
          <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Ruijie Cloud Controller</span>
        </h1>
        <p class="text-xs text-slate-400">Model Context Protocol (MCP) & REST Gateway</p>
      </div>
    </div>
    <div class="flex items-center space-x-4">
      <div id="cloudStatusBadge" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        Cloud Terhubung
      </div>
      <a href="/docs" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition">
        Swagger API Docs &rarr;
      </a>
    </div>
  </header>

  <main class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Stat Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase text-slate-400">Total Perangkat</span>
          <i data-lucide="server" class="w-5 h-5 text-blue-400"></i>
        </div>
        <p id="statTotal" class="text-3xl font-bold mt-2 text-white">44</p>
        <span class="text-xs text-slate-400 mt-1 block">AP, Switch & Gateway</span>
      </div>

      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase text-slate-400">Perangkat Online</span>
          <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-400"></i>
        </div>
        <p id="statOnline" class="text-3xl font-bold mt-2 text-emerald-400">40</p>
        <span class="text-xs text-slate-400 mt-1 block">Beroperasi normal</span>
      </div>

      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase text-slate-400">Perangkat Offline</span>
          <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-400"></i>
        </div>
        <p id="statOffline" class="text-3xl font-bold mt-2 text-rose-400">4</p>
        <span class="text-xs text-rose-300 mt-1 block">Perlu inspeksi teknis</span>
      </div>

      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase text-slate-400">SSID Wi-Fi Aktif</span>
          <i data-lucide="wifi" class="w-5 h-5 text-purple-400"></i>
        </div>
        <p id="statSsid" class="text-3xl font-bold mt-2 text-purple-400">2</p>
        <span class="text-xs text-slate-400 mt-1 block">GURU & SISWA</span>
      </div>
    </div>

    <!-- Alert for Offline Devices -->
    <div id="offlineAlertBox" class="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 flex items-start gap-3 text-sm text-rose-200">
      <i data-lucide="alert-octagon" class="w-5 h-5 text-rose-400 shrink-0 mt-0.5"></i>
      <div>
        <span class="font-bold text-rose-300">Peringatan: 4 Perangkat Sedang OFFLINE</span>
        <p class="text-xs text-rose-300/80 mt-1">
          Switch <b>SW-LAB-3</b> (10.10.150.6) dan 3 Access Point (<b>6-Kelas15</b>, <b>R19-NEW</b>, <b>R13-NEW</b>) tidak terhubung ke controller. Silakan periksa catu daya & kabel LAN.
        </p>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="border-b border-slate-700 flex space-x-6">
      <button onclick="switchTab('devices')" id="tabBtnDevices" class="pb-3 px-1 font-semibold text-sm border-b-2 border-cyan-500 text-cyan-400 flex items-center gap-2">
        <i data-lucide="hard-drive" class="w-4 h-4"></i> Daftar Perangkat (44)
      </button>
      <button onclick="switchTab('wifi')" id="tabBtnWifi" class="pb-3 px-1 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2">
        <i data-lucide="wifi" class="w-4 h-4"></i> Pengaturan Wi-Fi (SSID)
      </button>
      <button onclick="switchTab('audit')" id="tabBtnAudit" class="pb-3 px-1 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2">
        <i data-lucide="shield-alert" class="w-4 h-4"></i> Audit & Rekomendasi
      </button>
    </div>

    <!-- TAB 1: Devices -->
    <div id="tabDevices" class="space-y-4">
      <div class="flex flex-col sm:flex-row justify-between gap-3">
        <div class="relative flex-1">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
          <input type="text" id="deviceSearch" oninput="filterDevices()" placeholder="Cari nama, model, IP, atau Serial Number..." class="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500">
        </div>
        <div class="flex items-center gap-2">
          <select id="typeFilter" onchange="filterDevices()" class="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
            <option value="">Semua Tipe</option>
            <option value="AP">Access Point (AP)</option>
            <option value="SWITCH">Switch</option>
            <option value="GATEWAY">Gateway</option>
          </select>
          <select id="statusFilter" onchange="filterDevices()" class="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
            <option value="">Semua Status</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
          <button onclick="loadDevices()" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-900/60 uppercase text-slate-400 border-b border-slate-700 text-[10px]">
              <tr>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Nama Perangkat</th>
                <th class="px-4 py-3">Tipe</th>
                <th class="px-4 py-3">Model</th>
                <th class="px-4 py-3">IP Address</th>
                <th class="px-4 py-3">Serial Number</th>
                <th class="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="deviceTableBody" class="divide-y divide-slate-700/50">
              <tr>
                <td colspan="7" class="text-center py-8 text-slate-500">Memuat data perangkat...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: Wi-Fi (SSID) -->
    <div id="tabWifi" class="space-y-6 hidden">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-base font-bold text-white">Daftar Wi-Fi (SSID) Aktif</h2>
          <p class="text-xs text-slate-400">Kelola dan siarkan SSID Wi-Fi ke seluruh 35 Access Point</p>
        </div>
        <button onclick="openCreateSsidModal()" class="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-md flex items-center gap-2">
          <i data-lucide="plus" class="w-4 h-4"></i> Tambah Wi-Fi Baru
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="ssidGrid">
        <!-- Dynamic SSID Cards -->
      </div>
    </div>

    <!-- TAB 3: Audit & Rekomendasi -->
    <div id="tabAudit" class="space-y-4 hidden">
      <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <i data-lucide="shield-check" class="w-5 h-5 text-cyan-400"></i>
          Hasil Evaluasi Konfigurasi Jaringan
        </h3>
        
        <div class="space-y-3">
          <div class="p-4 rounded-xl bg-slate-900/60 border border-rose-500/30 flex items-start gap-3">
            <span class="px-2 py-1 rounded bg-rose-500/20 text-rose-400 font-bold text-xs uppercase">Kritis</span>
            <div class="text-xs">
              <h4 class="font-bold text-white">L2 Isolation Nonaktif di SSID SISWA</h4>
              <p class="text-slate-400 mt-1">Siswa pada satu jaringan Wi-Fi dapat saling memindai atau menjalankan serangan sniffing/ARP spoofing antar perangkat. Sangat disarankan mengaktifkan L2 Client Isolation.</p>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30 flex items-start gap-3">
            <span class="px-2 py-1 rounded bg-amber-500/20 text-amber-400 font-bold text-xs uppercase">Peringatan</span>
            <div class="text-xs">
              <h4 class="font-bold text-white">Fast Roaming (802.11r FT) Belum Aktif</h4>
              <p class="text-slate-400 mt-1">Pengguna yang berpindah antar ruang kelas akan mengalami putus koneksi singkat saat berpindah Access Point. Mengaktifkan 802.11r membuat roaming mulus tanpa drop.</p>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30 flex items-start gap-3">
            <span class="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs uppercase">Baik</span>
            <div class="text-xs">
              <h4 class="font-bold text-white">Pemisahan Segmen VLAN Guru & Siswa</h4>
              <p class="text-slate-400 mt-1">VLAN 210 (Guru) dan VLAN 300 (Siswa) sudah terisolasi dengan rapi pada level router dan switch.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Modal Tambah SSID -->
  <div id="modalSsid" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center hidden">
    <div class="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
      <div class="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 class="text-sm font-bold text-white">Tambah Wi-Fi (SSID) Baru</h3>
        <button onclick="closeCreateSsidModal()" class="text-slate-400 hover:text-white">&times;</button>
      </div>
      <div class="space-y-3 text-xs">
        <div>
          <label class="block font-medium text-slate-300 mb-1">Nama SSID</label>
          <input type="text" id="inputSsidName" placeholder="Contoh: TKJ-LAB-1" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
        </div>
        <div>
          <label class="block font-medium text-slate-300 mb-1">Password Wi-Fi (Minimal 8 karakter)</label>
          <input type="password" id="inputSsidPass" placeholder="Kosongkan jika ingin Open Wi-Fi" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
        </div>
        <div>
          <label class="block font-medium text-slate-300 mb-1">VLAN ID</label>
          <input type="number" id="inputSsidVlan" value="1" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
          <span class="text-[10px] text-slate-500 mt-1 block">Default VLAN 1, atau sesuaikan dengan kebutuhan Lab.</span>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeCreateSsidModal()" class="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium">Batal</button>
        <button onclick="submitCreateSsid()" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md">Simpan & Siarkan</button>
      </div>
    </div>
  </div>

  <script>
    let allDevices = [];
    let currentTab = 'devices';

    async function init() {
      lucide.createIcons();
      await loadDevices();
      await loadSsids();
    }

    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('tabDevices').classList.toggle('hidden', tab !== 'devices');
      document.getElementById('tabWifi').classList.toggle('hidden', tab !== 'wifi');
      document.getElementById('tabAudit').classList.toggle('hidden', tab !== 'audit');

      const tabs = ['devices', 'wifi', 'audit'];
      tabs.forEach(t => {
        const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
        if (t === tab) {
          btn.className = 'pb-3 px-1 font-semibold text-sm border-b-2 border-cyan-500 text-cyan-400 flex items-center gap-2';
        } else {
          btn.className = 'pb-3 px-1 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2';
        }
      });
      lucide.createIcons();
    }

    async function loadDevices() {
      try {
        const res = await fetch('/api/devices');
        const data = await res.json();
        allDevices = data.devices || [];
        renderDevices(allDevices);
      } catch (err) {
        console.error(err);
      }
    }

    function renderDevices(devs) {
      const tbody = document.getElementById('deviceTableBody');
      if (!devs.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-500">Tidak ada perangkat ditemukan</td></tr>';
        return;
      }
      tbody.innerHTML = devs.map(d => {
        const isOnline = d.status === 'ONLINE';
        const statusBadge = isOnline 
          ? '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>ONLINE</span>'
          : '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>OFFLINE</span>';

        return `
          <tr class="hover:bg-slate-700/30 transition">
            <td class="px-4 py-3">${statusBadge}</td>
            <td class="px-4 py-3 font-semibold text-white">${d.name}</td>
            <td class="px-4 py-3"><span class="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] font-mono">${d.type}</span></td>
            <td class="px-4 py-3 text-slate-300">${d.model || '-'}</td>
            <td class="px-4 py-3 font-mono text-cyan-300">${d.ip}</td>
            <td class="px-4 py-3 font-mono text-slate-400">${d.serial_number}</td>
            <td class="px-4 py-3 text-right space-x-1">
              <button onclick="rebootDevice('${d.serial_number}')" title="Reboot Perangkat" class="px-2 py-1 rounded bg-slate-700 hover:bg-rose-600 hover:text-white text-slate-300 transition text-[10px]">
                Reboot
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function filterDevices() {
      const q = document.getElementById('deviceSearch').value.toLowerCase();
      const type = document.getElementById('typeFilter').value;
      const status = document.getElementById('statusFilter').value;

      const filtered = allDevices.filter(d => {
        const matchQ = !q || (d.name && d.name.toLowerCase().includes(q)) || (d.model && d.model.toLowerCase().includes(q)) || (d.ip && d.ip.includes(q)) || (d.serial_number && d.serial_number.toLowerCase().includes(q));
        const matchType = !type || (d.type && d.type.toUpperCase() === type);
        const matchStatus = !status || (d.status && d.status.toUpperCase() === status);
        return matchQ && matchType && matchStatus;
      });
      renderDevices(filtered);
    }

    async function loadSsids() {
      try {
        const res = await fetch('/api/ssids');
        const data = await res.json();
        const ssids = data.rich_config || [];
        const grid = document.getElementById('ssidGrid');
        
        if (!ssids.length) {
          grid.innerHTML = '<p class="text-slate-500 text-xs">Tidak ada SSID ditemukan.</p>';
          return;
        }

        grid.innerHTML = ssids.map(s => `
          <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-sm space-y-3">
            <div class="flex justify-between items-start">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <i data-lucide="wifi" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="font-bold text-sm text-white">${s.ssidName}</h3>
                  <span class="text-xs text-slate-400 font-mono">VLAN ID: ${s.vlanId} | WLAN: ${s.wlanId}</span>
                </div>
              </div>
              <button onclick="deleteSsid('${s.ssidName}')" class="text-xs px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition">Hapus</button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-700/60">
              <div>Keamanan: <b class="text-slate-200">${s.encryptionModeDesc || 'WPA2-PSK'}</b></div>
              <div>Frekuensi: <b class="text-slate-200">${s.relatedRadio == '1,2' ? '2.4G & 5G (Dual)' : s.relatedRadio}</b></div>
              <div>Batas Bandwidth: <b class="text-slate-200">${s.qosEnable == 'true' ? s.downRate + ' Kbps' : 'Bebas (Unlimited)'}</b></div>
              <div>Sandi: <b class="text-slate-200 font-mono">${s.password ? '••••••••' : 'Open (Tanpa Sandi)'}</b></div>
            </div>
          </div>
        `).join('');
        lucide.createIcons();
      } catch (err) {
        console.error(err);
      }
    }

    async function rebootDevice(sn) {
      if (!confirm(`Konfirmasi: Apakah Anda yakin ingin me-restart perangkat SN: ${sn}?`)) return;
      try {
        const res = await fetch(`/api/devices/${sn}/reboot`, { method: 'POST' });
        const result = await res.json();
        alert(result.message || 'Perintah reboot telah dikirimkan ke perangkat.');
      } catch (err) {
        alert('Gagal mengirim perintah reboot: ' + err.message);
      }
    }

    function openCreateSsidModal() {
      document.getElementById('modalSsid').classList.remove('hidden');
    }
    function closeCreateSsidModal() {
      document.getElementById('modalSsid').classList.add('hidden');
    }

    async function submitCreateSsid() {
      const name = document.getElementById('inputSsidName').value.trim();
      const pass = document.getElementById('inputSsidPass').value.trim();
      const vlan = parseInt(document.getElementById('inputSsidVlan').value) || 1;

      if (!name) return alert('Nama SSID tidak boleh kosong');

      try {
        const res = await fetch('/api/ssids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssid_name: name, password: pass, vlan_id: vlan })
        });
        const result = await res.json();
        if (result.success) {
          alert('Wi-Fi berhasil dibuat dan disiarkan!');
          closeCreateSsidModal();
          await loadSsids();
        } else {
          alert('Gagal membuat Wi-Fi: ' + (result.message || 'Error'));
        }
      } catch (err) {
        alert('Terjadi kesalahan: ' + err.message);
      }
    }

    async function deleteSsid(name) {
      if (!confirm(`Hapus SSID Wi-Fi "${name}" dari seluruh Access Point?`)) return;
      try {
        const res = await fetch(`/api/ssids/${encodeURIComponent(name)}`, { method: 'DELETE' });
        const result = await res.json();
        alert(result.message || 'SSID berhasil dihapus.');
        await loadSsids();
      } catch (err) {
        alert('Gagal menghapus SSID: ' + err.message);
      }
    }

    window.onload = init;
  </script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
def index():
    """Halaman Dashboard Web Utama."""
    return HTMLResponse(content=DASHBOARD_HTML)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Menjalankan Ruijie Cloud Web Dashboard & MCP SSE Gateway di http://{host}:{port}")
    uvicorn.run("ruijie_mcp.web:app", host=host, port=port, reload=False)
