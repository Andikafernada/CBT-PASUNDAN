"use client";



import React, { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import {

  GraduationCap,

  LayoutDashboard,

  FileQuestion,

  FileCheck2,

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

  Activity,

  Tv,

  UploadCloud,

  LineChart,

  CreditCard,

  ClipboardCheck,

  Sparkles,

} from "lucide-react";



import { ThemeToggle } from "@/components/ThemeToggle";

import { NavinLogo } from "@/components/NavinLogo";

import { AdminTelemetryHeader } from "@/components/AdminTelemetryHeader";



export default function AdminLayout({ children }: { children: React.ReactNode }) {

  const pathname = usePathname();

  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);



  // 🚀 If viewing standalone TV/Projector Token Board, bypass Admin Layout completely

  if (pathname === "/admin/token-board") {

    return <>{children}</>;

  }



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



  const navSections = [

    {

      title: "Utama & Monitoring",

      roles: ["ADMIN", "OPERATOR", "TEACHER"],

      links: [

        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "OPERATOR"] },

        { href: "/admin/command-center", label: "Pusat Kendali 7 Lab", icon: Activity, roles: ["ADMIN", "OPERATOR"] },

        { href: "/admin/token-board", label: "Layar Token TV", icon: Tv, roles: ["ADMIN", "OPERATOR"] },

      ],

    },

    {

      title: "Bank Soal & Materi",

      roles: ["ADMIN", "TEACHER"],

      links: [

        { href: "/admin/questions", label: "Bank Soal", icon: FileQuestion, roles: ["ADMIN", "TEACHER"] },

        { href: "/admin/mcp-normalizer", label: "Model Context Protocol (MCP AI)", icon: Sparkles, roles: ["ADMIN", "TEACHER"] },

        { href: "/admin/questions/import", label: "Import Soal Word", icon: UploadCloud, roles: ["ADMIN", "TEACHER"] },

        { href: "/admin/questions/batch-audit", label: "Batch Audit Soal (70 File)", icon: FileCheck2, roles: ["ADMIN", "TEACHER"] },

        { href: "/admin/subjects", label: "Mata Pelajaran & Topik", icon: Layers, roles: ["ADMIN", "TEACHER"] },

      ],

    },

    {

      title: "Ujian & Nilai",

      roles: ["ADMIN", "OPERATOR", "TEACHER"],

      links: [

        { href: "/admin/exams", label: "Jadwal Ujian (Tes)", icon: CalendarDays, roles: ["ADMIN", "OPERATOR"] },

        { href: "/admin/essay-grading", label: "Periksa Jawaban Siswa", icon: CheckCircle2, roles: ["ADMIN", "TEACHER", "OPERATOR"] },

        { href: "/admin/grades", label: "Rekap Nilai Siswa", icon: BarChart3, roles: ["ADMIN", "TEACHER", "OPERATOR"] },
        { href: "/admin/surveys", label: "Kuesioner Guru (PTS)", icon: ClipboardCheck, roles: ["ADMIN", "TEACHER", "OPERATOR"] },

        { href: "/admin/reports/students", label: "Laporan Peserta", icon: LineChart, roles: ["ADMIN", "TEACHER", "OPERATOR"] },

      ],

    },

    {

      title: "Cetak Dokumen Ujian",

      roles: ["ADMIN", "OPERATOR", "TEACHER"],

      links: [

        { href: "/admin/print/cards", label: "Cetak Kartu Login", icon: CreditCard, roles: ["ADMIN", "OPERATOR"] },

        { href: "/admin/print/attendance", label: "Cetak Daftar Hadir", icon: ClipboardCheck, roles: ["ADMIN", "OPERATOR", "TEACHER"] },

        { href: "/admin/print/minutes", label: "Cetak Berita Acara", icon: FileSpreadsheet, roles: ["ADMIN", "OPERATOR", "TEACHER"] },

        { href: "/admin/print/violations", label: "Laporan Pelanggaran", icon: ShieldAlert, roles: ["ADMIN", "OPERATOR", "TEACHER"] },

        { href: "/admin/print/student-compliance", label: "Pakta Kepatuhan Siswa", icon: CheckCircle2, roles: ["ADMIN", "OPERATOR", "TEACHER"] },

      ],

    },

    {

      title: "Pengguna & Data",

      roles: ["ADMIN", "OPERATOR"],

      links: [

        { href: "/admin/students", label: "Data Peserta Siswa", icon: Users, roles: ["ADMIN", "OPERATOR"] },

        { href: "/admin/users/import", label: "Import Siswa (STS)", icon: FileSpreadsheet, roles: ["ADMIN", "OPERATOR"] },

        { href: "/admin/users", label: "Kelola Guru & Admin", icon: Shield, roles: ["ADMIN"] },

        { href: "/admin/legacy-import", label: "Migrasi Database Legacy", icon: Database, roles: ["ADMIN"] },

      ],

    },

  ];



  const userRole = currentUser?.role || "ADMIN";



  return (

    <div className="min-h-screen bg-slate-50 text-slate-900 flex transition-colors duration-150">

      {/* Sidebar for Desktop & Mobile Drawer */}

      <aside

        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 print:hidden ${

          sidebarOpen ? "translate-x-0" : "-translate-x-full"

        }`}

      >

        <div className="flex flex-col h-full min-h-0">

          {/* Logo Header */}

          <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">

            <div className="flex items-center gap-2.5">

              <NavinLogo variant="icon-only" size="sm" className="rounded-lg shadow-xs" />

              <div className="min-w-0">

                <div className="flex items-center gap-1.5">

                  <span className="font-black text-xs text-slate-900 tracking-tight truncate">NAVIN CBT</span>

                  <span

                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md border shrink-0 ${

                      userRole === "OPERATOR"

                        ? "bg-amber-50 text-amber-800 border-amber-300"

                        : userRole === "TEACHER"

                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"

                        : "bg-blue-50 text-blue-800 border-blue-200"

                    }`}

                  >

                    {userRole === "ADMIN" ? "SUPERUSER" : userRole === "TEACHER" ? "GURU" : "PROKTOR"}

                  </span>

                </div>

                <p className="text-[10px] text-slate-500 font-medium truncate">by Navins Dev</p>

              </div>

            </div>



            <button

              onClick={() => setSidebarOpen(false)}

              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"

            >

              <X className="w-4 h-4" />

            </button>

          </div>



          {/* Nav List with Clean Categorized Sections */}

          <nav className="p-3 space-y-4 overflow-y-auto flex-1 text-xs">

            {navSections.map((section, secIdx) => {

              const visibleLinks = section.links.filter((item) => item.roles.includes(userRole));

              if (visibleLinks.length === 0) return null;



              return (

                <div key={secIdx} className="space-y-1">

                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">

                    {section.title}

                  </div>

                  {visibleLinks.map((item) => {

                    const Icon = item.icon;

                    const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname?.startsWith(item.href + "/"));



                    return (

                      <button

                        key={item.href}

                        onClick={() => {

                          router.push(item.href);

                          setSidebarOpen(false);

                        }}

                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition text-left cursor-pointer ${

                          isActive

                            ? "bg-blue-600 text-white font-bold shadow-xs"

                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"

                        }`}

                      >

                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />

                        <span className="truncate">{item.label}</span>

                      </button>

                    );

                  })}

                </div>

              );

            })}

          </nav>



          {/* User Card & Logout */}

          <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">

            <div className="flex items-center justify-between mb-2 px-1">

              <div className="flex items-center gap-2 min-w-0">

                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">

                  {currentUser?.name?.charAt(0) || "U"}

                </div>

                <div className="text-left text-xs min-w-0">

                  <div className="font-bold text-slate-900 truncate max-w-[120px]">

                    {currentUser?.name || "Pengguna"}

                  </div>

                  <div className="text-[10px] text-slate-500 font-medium">{currentUser?.role || "GURU"}</div>

                </div>

              </div>



              <button

                onClick={handleLogout}

                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"

                title="Logout"

              >

                <LogOut className="w-4 h-4" />

              </button>

            </div>



            <button

              onClick={() => router.push("/student/dashboard")}

              className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs mb-2 cursor-pointer"

            >

              <ExternalLink className="w-3 h-3 text-slate-500" />

              <span>Lihat Tampilan Siswa</span>

            </button>



            <div className="pt-1.5 border-t border-slate-200/80 text-[10px] text-slate-400 font-medium text-center">

              Navin CBT • <span className="font-semibold text-slate-600">by Navins Dev</span>

            </div>

          </div>

        </div>

      </aside>



      {/* Main Content Area */}

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 print:pl-0">

        {/* Top Header Navbar */}

        <header className="print:hidden h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors shadow-xs">

          <div className="flex items-center gap-3">

            <button

              onClick={() => setSidebarOpen(true)}

              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs lg:hidden cursor-pointer"

            >

              <Menu className="w-5 h-5" />

            </button>

            <div className="hidden sm:block">

              <span className="font-bold text-sm text-slate-900">

                Navin CBT

              </span>

              <span className="text-xs text-slate-500 ml-2 font-medium">

                • Portal {userRole === "TEACHER" ? "Guru & Bank Soal" : "Administrasi & Proktor"} (Navins Dev)

              </span>

            </div>

          </div>



          <div className="flex items-center gap-2.5">

            {/* Super User Telemetry Bar */}

            <AdminTelemetryHeader currentUser={currentUser} />



            <ThemeToggle />



            <button

              onClick={handleLogout}

              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition lg:hidden cursor-pointer"

            >

              <LogOut className="w-4 h-4" />

            </button>

          </div>

        </header>



        {/* Child Pages */}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">

          {children}

        </main>

      </div>

    </div>

  );

}

