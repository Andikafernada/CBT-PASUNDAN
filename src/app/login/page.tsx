"use client";

import React, { useState } from "react";
import {
  Lock,
  User,
  ShieldAlert,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavinLogo } from "@/components/NavinLogo";

function getOrCreateDeviceFingerprint(): string {
  try {
    if (typeof window === "undefined") return "";
    let devId = localStorage.getItem("cbt_device_uuid");
    if (!devId) {
      if (typeof window.crypto !== "undefined" && typeof window.crypto.randomUUID === "function") {
        devId = window.crypto.randomUUID();
      } else {
        devId = "dev-" + Math.random().toString(36).substring(2, 12) + "-" + Date.now().toString(36);
      }
      localStorage.setItem("cbt_device_uuid", devId);
    }
    const screenRes = typeof window.screen !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "desktop";
    return `FP-${devId.substring(0, 16)}-${screenRes}`;
  } catch {
    return "";
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const deviceFingerprint = getOrCreateDeviceFingerprint();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, deviceFingerprint }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk. Periksa username dan password Anda.");
      }

      window.location.href = data.redirectTo || "/";
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 text-black transition-colors duration-150 overflow-hidden">
      {/* Soft Blue Decorative Blur Blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-200/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-blue-200/60 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-[-8rem] w-72 h-72 rounded-full bg-sky-300/40 blur-3xl" />

      {/* Top Floating Header Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-sky-300 text-xs font-black text-black shadow-soft backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
          <span>Server CBT Online</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-2">
            <NavinLogo variant="icon-only" size="xl" className="shadow-lg rounded-2xl" />
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2 mt-1">
            <span>NAVIN CBT</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500 text-white shadow-xs">
              PRO
            </span>
          </h1>
          <p className="text-xs text-black mt-1 font-bold">
            Digital Assessment Platform &bull; Navins Dev
          </p>
          <p className="text-[11px] text-slate-700 mt-0.5 max-w-xs font-semibold">
            Platform Ujian Berbasis Komputer & Asesmen Terintegrasi
          </p>
        </div>

        {/* Login Card */}
        <div className="glass p-6 sm:p-8 rounded-3xl shadow-soft">
          <div className="mb-5 text-center">
            <h2 className="text-base font-black text-black tracking-tight">
              Masuk ke Akun Anda
            </h2>
            <p className="text-xs text-black mt-1 font-semibold">
              Silakan masukkan Username / NIS dan Kata Sandi terdaftar.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-600 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Username / NIS
              </label>
              <div className="relative group">
                <User className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 transition" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan Username atau NIS..."
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Kata Sandi
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 transition" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black hover:opacity-80 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-black" /> : <Eye className="w-4 h-4 text-black" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 btn-primary justify-center text-sm font-black shadow-glow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span className="text-black font-black">Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span className="text-black font-black">Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-black font-bold">
          <span className="h-px w-8 bg-sky-300" />
          <span>Navin CBT Platform</span>
          <span className="h-px w-8 bg-sky-300" />
        </div>
        <div className="text-center mt-1 text-[11px] text-black font-semibold">
          &copy; 2026 Navin CBT by <span className="font-black text-black">Navins Dev Digital Solutions</span> &bull; Bandung, Indonesia
        </div>
      </div>
    </div>
  );
}
