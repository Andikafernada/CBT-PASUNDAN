"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Error caught by Error Boundary:", error);
    // Automatically reload if chunk loading failed (e.g. after a new build / deployment)
    if (
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Failed to fetch dynamically imported module")
    ) {
      if (typeof window !== "undefined" && !sessionStorage.getItem("chunk_reloaded")) {
        sessionStorage.setItem("chunk_reloaded", "true");
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-black text-slate-900 mb-2">Terjadi Kendala Memuat Halaman</h2>
      <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
        {error?.message || "Halaman mengalami gangguan sesaat saat memuat modul antarmuka. Biasanya ini terjadi jika aplikasi baru diperbarui atau koneksi terputus sejenak."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => {
            sessionStorage.removeItem("chunk_reloaded");
            reset();
          }}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Coba Buka Ulang</span>
        </button>
        <button
          onClick={() => {
            sessionStorage.removeItem("chunk_reloaded");
            window.location.reload();
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          Muat Ulang Halaman
        </button>
        <Link
          href="/admin/dashboard"
          className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>Ke Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
