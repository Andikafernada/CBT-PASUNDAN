"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ShieldAlert,
  UserPlus,
  Search,
  Key,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Sliders,
  FileSpreadsheet,
  Download,
} from "lucide-react";

export default function SuperuserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterGroup, setFilterGroup] = useState("ALL");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "TEACHER",
    nis: "",
    email: "",
    phone: "",
    groupId: "",
  });

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setGroups(data.groups || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pengguna");
      alert("Pengguna berhasil ditambahkan!");
      setShowCreateModal(false);
      setCreateForm({
        username: "",
        password: "",
        name: "",
        role: "TEACHER",
        nis: "",
        email: "",
        phone: "",
        groupId: "",
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui pengguna");
      alert("Data pengguna berhasil diperbarui!");
      setShowEditModal(false);
      setEditForm(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus pengguna "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus pengguna");
      alert("Pengguna berhasil dihapus");
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickResetPassword = async (id: string, name: string) => {
    if (!confirm(`Reset password untuk "${name}" menjadi default '123456'?`)) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password: "123456" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Password untuk ${name} berhasil direset ke: 123456`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnlockDevice = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isLoginLocked: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Kunci perangkat untuk ${name} berhasil dibuka!`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.nis && u.nis.toLowerCase().includes(search.toLowerCase()));
    const matchRole = filterRole === "ALL" || u.role === filterRole;
    const matchGroup = filterGroup === "ALL" || u.groupId === filterGroup;
    return matchSearch && matchRole && matchGroup;
  });

  const handleExportExcel = () => {
    const exportData = filteredUsers.map((u, idx) => ({
      No: idx + 1,
      Username: u.username,
      "Nama Lengkap": u.name,
      Role: u.role,
      "Kelas / Rombel": u.group?.name || "-",
      "NIS / NIP": u.nis || "-",
      Email: u.email || "-",
      Telepon: u.phone || "-",
      Status: u.isActive ? "Aktif" : "Nonaktif",
      "Kunci Device": u.deviceFingerprint ? "Terkunci" : "Bebas",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Pengguna");
    XLSX.writeFile(workbook, `Rekap_Pengguna_CBT_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Superuser Privilege</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Manajemen Pengguna & Hak Akses
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kontrol penuh CRUD akun Administrator, Guru Penguji, Operator Proktor, dan Siswa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            title="Download Rekap Seluruh Pengguna ke Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>

          <Link
            href="/admin/users/import"
            className="px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import Excel / CSV</span>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, username, atau NIS..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Hak Akses (Role)</option>
            <option value="ADMIN">Administrator (Superuser)</option>
            <option value="TEACHER">Guru / Penguji</option>
            <option value="OPERATOR">Operator / Proktor</option>
            <option value="STUDENT">Siswa Peserta</option>
          </select>

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Kelas / Rombel</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchUsers}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Segarkan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Memuat data pengguna...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Tidak ada data pengguna yang sesuai.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Hak Akses (Role)</th>
                  <th className="py-3 px-4">Kelas / Grup</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4 text-center">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((user) => {
                  return (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div>{user.name}</div>
                        {user.nis && <div className="text-[10px] text-slate-500 font-mono">NIS: {user.nis}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 font-bold">{user.username}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            user.role === "ADMIN"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : user.role === "TEACHER"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : user.role === "OPERATOR"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {user.role === "ADMIN"
                            ? "SUPERUSER (ADMIN)"
                            : user.role === "TEACHER"
                            ? "GURU / PENGUJI"
                            : user.role === "OPERATOR"
                            ? "OPERATOR"
                            : "SISWA"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{user.group?.name || "-"}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {user.isActive ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400 text-[11px] font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Nonaktif</span>
                            </span>
                          )}
                          {user.deviceFingerprint && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                              Device Lock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditForm({
                                id: user.id,
                                name: user.name,
                                username: user.username,
                                role: user.role,
                                nis: user.nis || "",
                                email: user.email || "",
                                phone: user.phone || "",
                                groupId: user.groupId || "",
                                isActive: user.isActive,
                                password: "",
                              });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded-lg transition"
                            title="Edit Data & Role Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleQuickResetPassword(user.id, user.name)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white rounded-lg transition"
                            title="Reset Password ke 123456"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {user.deviceFingerprint && (
                            <button
                              onClick={() => handleUnlockDevice(user.id, user.name)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-white rounded-lg transition"
                              title="Buka Kunci Perangkat"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-white mb-1">Tambah Pengguna Baru</h2>
            <p className="text-xs text-slate-400 mb-5">Pilih role hak akses dan isi kredensial akun.</p>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Hak Akses (Role)</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
                  >
                    <option value="ADMIN">ADMINISTRATOR (Superuser)</option>
                    <option value="TEACHER">GURU / PENGUJI</option>
                    <option value="OPERATOR">OPERATOR / PROKTOR</option>
                    <option value="STUDENT">SISWA PESERTA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kelas / Rombel</label>
                  <select
                    value={createForm.groupId}
                    onChange={(e) => setCreateForm({ ...createForm, groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="">Tanpa Kelas</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="misal: Dr. Budi Santoso, M.Kom"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="misal: budi_santoso"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Password akun"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">NIS / NIP (Opsional)</label>
                  <input
                    type="text"
                    value={createForm.nis}
                    onChange={(e) => setCreateForm({ ...createForm, nis: e.target.value })}
                    placeholder="Nomor identitas"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="email@sekolah.sch.id"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit User */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-white mb-1">Edit Pengguna: {editForm.name}</h2>
            <p className="text-xs text-slate-400 mb-5">Ubah hak akses, nama, atau reset password pengguna.</p>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Hak Akses (Role)</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
                  >
                    <option value="ADMIN">ADMINISTRATOR (Superuser)</option>
                    <option value="TEACHER">GURU / PENGUJI</option>
                    <option value="OPERATOR">OPERATOR / PROKTOR</option>
                    <option value="STUDENT">SISWA PESERTA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kelas / Rombel</label>
                  <select
                    value={editForm.groupId || ""}
                    onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="">Tanpa Kelas</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Password Baru (Kosongkan jika tidak ubah)</label>
                  <input
                    type="password"
                    value={editForm.password || ""}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Kosongkan jika tetap"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">NIS / NIP</label>
                  <input
                    type="text"
                    value={editForm.nis || ""}
                    onChange={(e) => setEditForm({ ...editForm, nis: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Akun</label>
                  <select
                    value={editForm.isActive ? "1" : "0"}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "1" })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif / Diblokir</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
