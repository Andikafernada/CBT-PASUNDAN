"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Smartphone, X, CheckCircle2 } from "lucide-react";

/**
 * 1. PwaInstallButton
 * Tombol instalasi mandiri yang disematkan pada halaman Login dan Dashboard Siswa.
 */
export function PwaInstallButton({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact" | "icon";
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const standalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true);

    setIsStandalone(Boolean(standalone));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  if (isStandalone) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      const isIos = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIos) {
        setShowIosGuide(true);
      } else {
        alert(
          "📱 Pasang Aplikasi Navin CBT:\n\n" +
          "1. Buka Menu Browser (titik tiga di kanan atas atau ikon menu).\n" +
          "2. Pilih 'Tambahkan ke Layar Utama' (Add to Home screen) atau 'Pasang Aplikasi'.\n" +
          "3. Aplikasi Navin CBT akan langsung terpasang di layar perangkat Anda."
        );
      }
    }
  };

  return (
    <>
      {variant === "compact" ? (
        <button
          onClick={handleInstall}
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-sky-300 hover:bg-sky-50 text-sky-950 text-xs font-bold transition shadow-xs cursor-pointer ${className}`}
          title="Pasang Aplikasi Navin CBT di Perangkat (Layar Penuh)"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>Pasang App</span>
        </button>
      ) : variant === "icon" ? (
        <button
          onClick={handleInstall}
          type="button"
          className={`p-2 rounded-xl bg-white border border-sky-300 text-blue-600 hover:bg-blue-50 transition cursor-pointer shadow-xs ${className}`}
          title="Pasang Aplikasi Navin CBT"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handleInstall}
          type="button"
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-sky-300 bg-white/90 hover:bg-white text-sky-950 text-xs font-bold transition shadow-xs cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4 text-blue-600" />
          <span>Pasang Aplikasi di HP / Laptop (PWA)</span>
        </button>
      )}

      {/* iOS Modal Guide */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-sky-950/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                Pasang di iPhone / iPad
              </h4>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside leading-relaxed mb-4">
              <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah peramban Safari.</li>
              <li>Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
              <li>Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 2. PwaInstallPrompt
 * Pop-up Banner pintar yang memberitahukan pengguna bahwa aplikasi bisa dipasang.
 * Tidak muncul di halaman Admin atau saat sedang ujian aktif.
 */
export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah berjalan di mode standalone (sudah terpasang)
    const standalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true);

    if (standalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Cek apakah pengguna sudah menutup pop-up pada sesi ini
    if (typeof window !== "undefined" && sessionStorage.getItem("pwa_prompt_dismissed")) {
      return;
    }

    // 3. Tangkap event browser sebelum instalasi
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Fallback: Munculkan banner informatif setelah 1.5 detik jika belum terpasang
    const timer = setTimeout(() => {
      const dismissed = typeof window !== "undefined" && sessionStorage.getItem("pwa_prompt_dismissed");
      if (!standalone && !dismissed) {
        setShowPrompt(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  // Jangan pernah munculkan pop-up di halaman admin atau lembar ujian aktif
  if (pathname?.startsWith("/admin") || pathname?.includes("/exam/")) {
    return null;
  }

  if (!showPrompt || isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      const isIos = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIos) {
        setShowIosGuide(true);
      } else {
        alert(
          "📱 Pasang Aplikasi Navin CBT:\n\n" +
          "1. Buka Menu Browser (titik tiga di kanan atas atau ikon menu).\n" +
          "2. Pilih 'Tambahkan ke Layar Utama' (Add to Home screen) atau 'Pasang Aplikasi'.\n" +
          "3. Buka Navin CBT langsung dari layar utama HP Anda."
        );
        setShowPrompt(false);
        sessionStorage.setItem("pwa_prompt_dismissed", "true");
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-white/95 backdrop-blur-md border border-sky-300 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5 text-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-md">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                <span>Pasang Aplikasi Navin CBT</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800">PWA</span>
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              Aplikasi ini bisa dipasang di HP / Laptop agar ujian berjalan <strong>layar penuh</strong> tanpa gangguan tab & notifikasi browser.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang Sekarang</span>
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Modal Guide */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-sky-950/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                Pasang di iPhone / iPad
              </h4>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside leading-relaxed mb-4">
              <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah peramban Safari.</li>
              <li>Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
              <li>Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
