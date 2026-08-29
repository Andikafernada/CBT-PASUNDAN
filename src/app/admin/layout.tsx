"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  FileQuestion,
  FileSpreadsheet,
  CalendarDays,
  Users,
  Database,
  LogOut,
  Menu,
  X,
  User,
  ExternalLink,
  Shield,
  ShieldAlert,
  Layers,
  Printer,
  CheckCircle2,
  FileText,
  BarChart3,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) router.push("/login");
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          if (data.user.role === "TEACHER") {
            if (pathname === "/admin/dashboard" || pathname === "/admin/exams") {
              router.replace("/admin/questions");
            }
          }
        }
      })
      .catch(() => router.push("/login"));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const allNavLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "OPERATOR"] },
    { href: "/admin/users", label: "Manajemen Pengguna (Superuser)", icon: ShieldAlert, roles: ["ADMIN"] },
    { href: "/admin/exams", label: "Manajemen Ujian & Proktor", icon: CalendarDays, roles: ["ADMIN", "OPERATOR"] },
    { href: "/admin/subjects", label: "Mata Pelajaran & Kelas", icon: Layers, roles: ["ADMIN", "OPERATOR"] },
    {
      href: "/admin/questions",
      label: currentUser?.role === "TEACHER" ? "Review Soal Saya" : "Bank Soal & Review",
      icon: FileQuestion,
      roles: ["ADMIN", "TEACHER"],
    },
    { href: "/admin/questions/import", label: "Import Word & Template", icon: FileSpreadsheet, roles: ["ADMIN", "TEACHER"] },
    {
      href: "/admin/grades",
      label: currentUser?.role === "TEACHER" ? "Rekap Nilai Siswa" : "Rekap Nilai & Absensi",
      icon: BarChart3,
      roles: ["ADMIN", "TEACHER", "OPERATOR"],
    },
    { href: "/admin/students", label: "Peserta & Kelas", icon: Users, roles: ["ADMIN", "OPERATOR"] },
    { href: "/admin/print/cards", label: "Cetak Kartu Peserta", icon: Printer, roles: ["ADMIN", "OPERATOR"] },
    { href: "/admin/print/attendance", label: "Cetak Presensi / Hadir", icon: CheckCircle2, roles: ["ADMIN", "OPERATOR"] },
    { href: "/admin/print/minutes", label: "Berita Acara Ujian", icon: FileText, roles: ["ADMIN", "OPERATOR"] },
    { href: "/admin/legacy-import", label: "Migrasi ZYACBT Legacy", icon: Database, roles: ["ADMIN"] },
  ];

  const userRole = currentUser?.role || "ADMIN";
  const navLinks = allNavLinks.filter((item) => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-150">
      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 shadow-sm dark:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 px-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight truncate">PASUNDAN 2</span>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border shrink-0 ${
                      userRole === "ADMIN"
                        ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                        : userRole === "TEACHER"
                        ? "bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30"
                        : "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                    }`}
                  >
                    {userRole === "ADMIN" ? "SUPERUSER" : userRole === "TEACHER" ? "GURU" : "PROKTOR"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">CBT SMK Pasundan 2 Bandung</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-3.5 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>Menu {userRole === "ADMIN" ? "Superuser" : userRole === "TEACHER" ? "Guru Penguji" : "Operator Proktor"}</span>
            </div>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                {currentUser?.name?.charAt(0) || "A"}
              </div>
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-800 dark:text-white truncate max-w-[110px]">
                  {currentUser?.name || "Pengguna"}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{currentUser?.role || "GURU"}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => router.push("/student/dashboard")}
            className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs mb-2"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Lihat Tampilan Siswa</span>
          </button>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center">
            Development by <strong className="text-slate-700 dark:text-slate-300">Andika Fernanda</strong>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header Navbar with Theme Toggle */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                CBT SMK Pasundan 2 Bandung
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-medium">
                • Portal {userRole === "TEACHER" ? "Guru & Bank Soal" : "Administrasi & Proktor"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button (Light/Dark) */}
            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition lg:hidden"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Child Pages */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
