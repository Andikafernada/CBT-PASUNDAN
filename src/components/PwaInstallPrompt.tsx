"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Download,
  Smartphone,
  Laptop,
  X,
  CheckCircle2,
  Share2,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

// Global variable untuk menyimpan beforeinstallprompt agar tidak hilang antar komponen
let cachedDeferredPrompt: any = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    cachedDeferredPrompt = e;
    window.dispatchEvent(new CustomEvent("pwa-deferred-prompt-ready"));
  });
}

/**
 * Hook bantuan untuk mendeteksi status PWA dan event install
 */
export function usePwaState() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(cachedDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deviceType, setDeviceType] = useState<"android" | "ios" | "desktop">("android");

  useEffect(() => {
    // 1. Cek mode standalone
    const standalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true);

    setIsStandalone(Boolean(standalone));

    // 2. Deteksi tipe perangkat
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod/i.test(ua)) {
        setDeviceType("ios");
      } else if (/Android/i.test(ua)) {
        setDeviceType("android");
      } else {
        setDeviceType("desktop");
      }
    }

    // 3. Listener untuk deferred prompt
    const onPromptReady = () => {
      setDeferredPrompt(cachedDeferredPrompt);
    };

    window.addEventListener("pwa-deferred-prompt-ready", onPromptReady);
    if (cachedDeferredPrompt) {
      setDeferredPrompt(cachedDeferredPrompt);
    }

    return () => {
      window.removeEventListener("pwa-deferred-prompt-ready", onPromptReady);
    };
  }, []);

  return { deferredPrompt, setDeferredPrompt, isStandalone, setIsStandalone, deviceType };
}

/**
 * 1. PwaGuideModal
 * Modal Interaktif Panduan Pemasangan yang ramah pengguna jika browser tidak mendukung 1-klik native prompt
 */
export function PwaGuideModal({
  isOpen,
  onClose,
  initialTab = "android",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "android" | "ios" | "desktop";
}) {
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-sky-950/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-sky-200 text-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                Pasang Aplikasi Navin CBT
              </h3>
              <p className="text-[11px] text-slate-700">Ujian layar penuh & bebas gangguan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigasi Perangkat */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-2xl my-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab("android")}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "android"
                ? "bg-white text-blue-800 shadow-xs"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setActiveTab("ios")}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "ios"
                ? "bg-white text-blue-800 shadow-xs"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone</span>
          </button>
          <button
            onClick={() => setActiveTab("desktop")}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "desktop"
                ? "bg-white text-blue-800 shadow-xs"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Laptop/PC</span>
          </button>
        </div>

        {/* Konten Tab Android */}
        {activeTab === "android" && (
          <div className="space-y-3 py-1">
            <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-3.5 text-xs text-sky-900 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="leading-snug">
                  Ketuk ikon <strong>Titik Tiga ( <MoreVertical className="w-3 h-3 inline text-slate-700" /> )</strong> di pojok kanan atas browser Google Chrome.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="leading-snug">
                  Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Pasang Aplikasi"</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="leading-snug">
                  Ketuk <strong>"Tambah / Instal"</strong>. Ikon <strong>Navin CBT</strong> akan langsung muncul di menu HP Anda!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Setelah terpasang, aplikasi otomatis terbuka layar penuh tanpa bilah URL!</span>
            </div>
          </div>
        )}

        {/* Konten Tab iPhone / iOS */}
        {activeTab === "ios" && (
          <div className="space-y-3 py-1">
            <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-3.5 text-xs text-sky-900 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="leading-snug">
                  Ketuk tombol <strong>Bagikan / Share ( <Share2 className="w-3.5 h-3.5 inline text-slate-700" /> )</strong> di bilah menu bawah peramban Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="leading-snug">
                  Gulir ke bawah dan ketuk <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="leading-snug">
                  Ketuk <strong>"Tambah" (Add)</strong> di pojok kanan atas layar.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Buka aplikasi dari layar utama iPhone untuk pengalaman ujian optimal.</span>
            </div>
          </div>
        )}

        {/* Konten Tab Desktop / Laptop */}
        {activeTab === "desktop" && (
          <div className="space-y-3 py-1">
            {/* Opsi 1: Exambro Windows */}
            <div className="p-3.5 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-extrabold text-xs text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  CBT Exambrowser Resmi (Windows)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-bold">
                  Rekomendasi Lab
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug mb-2.5">
                Khusus Lab Komputer & Laptop siswa. Mengunci layar ujian secara total.
              </p>
              <a
                href="/download/CBT_EXAMBROWSER.exe"
                download
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CBT Exambrowser (.exe)</span>
              </a>
            </div>

            {/* Opsi 2: Pasang via Chrome / Edge */}
            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-1.5">
              <p className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                <Laptop className="w-3.5 h-3.5 text-slate-500" />
                Atau Pasang via Peramban (PWA):
              </p>
              <p className="text-[11px] text-slate-600 leading-snug">
                • <strong>Microsoft Edge:</strong> Klik Menu (⋯) ➔ Aplikasi ➔ Pasang situs ini sebagai aplikasi.
              </p>
              <p className="text-[11px] text-slate-600 leading-snug">
                • <strong>Google Chrome:</strong> Klik Menu (⋮) ➔ Simpan dan Bagikan ➔ Buat Pintasan (centang <em>Buka sebagai jendela</em>).
              </p>
            </div>
          </div>
        )}

        {/* Footer Modal */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. PwaInstallButton
 * Tombol instalasi mandiri yang disematkan pada halaman Login dan Dashboard Siswa.
 */
export function PwaInstallButton({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact" | "icon";
}) {
  const { deferredPrompt, setDeferredPrompt, isStandalone, setIsStandalone, deviceType } =
    usePwaState();
  const [showModal, setShowModal] = useState(false);

  if (isStandalone) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${className}`}
          title="Pasang Aplikasi Navin CBT"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>Pasang App</span>
        </button>
        <PwaGuideModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          initialTab={deviceType}
        />
      </>
    );
  }

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleClick}
          className={`p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition cursor-pointer shadow-xs ${className}`}
          title="Pasang Aplikasi Navin CBT"
        >
          <Smartphone className="w-4 h-4 text-blue-600" />
        </button>
        <PwaGuideModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          initialTab={deviceType}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full py-2.5 px-4 bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 border border-sky-200/90 rounded-2xl flex items-center justify-between transition group shadow-xs cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>Pasang Aplikasi Navin CBT</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Bebas gangguan tab & layar penuh</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition">
          <span>Pasang</span>
          <Download className="w-3.5 h-3.5" />
        </div>
      </button>

      <PwaGuideModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialTab={deviceType}
      />
    </>
  );
}

/**
 * 3. PwaInstallPrompt
 * Pop-up Banner pintar yang memberitahukan pengguna bahwa aplikasi bisa dipasang.
 * Tidak muncul di halaman Admin atau saat sedang ujian aktif.
 */
export function PwaInstallPrompt() {
  const pathname = usePathname();
  const { deferredPrompt, setDeferredPrompt, isStandalone, setIsStandalone, deviceType } =
    usePwaState();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    // Cek apakah pernah di-dismiss di sesi ini
    const dismissed =
      typeof window !== "undefined" && sessionStorage.getItem("pwa_prompt_dismissed");

    // Jika ada deferredPrompt langsung munculkan
    if (deferredPrompt && !dismissed) {
      setShowPrompt(true);
      return;
    }

    // Fallback: Munculkan banner setelah 1.2 detik agar user tahu aplikasi bisa dipasang
    const timer = setTimeout(() => {
      const dismissedNow =
        typeof window !== "undefined" && sessionStorage.getItem("pwa_prompt_dismissed");
      if (!isStandalone && !dismissedNow) {
        setShowPrompt(true);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [deferredPrompt, isStandalone]);

  // Jangan pernah munculkan pop-up di halaman admin atau lembar ujian aktif
  if (pathname?.startsWith("/admin") || pathname?.includes("/exam/")) {
    return null;
  }

  if (isStandalone) return null;

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
      setShowModal(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  return (
    <>
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white/95 backdrop-blur-md border border-sky-300 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5 text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                  <span>Pasang Aplikasi Navin CBT</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800">
                    PWA
                  </span>
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
                Aplikasi ini bisa dipasang di HP / Laptop agar ujian berjalan{" "}
                <strong>layar penuh</strong> tanpa gangguan tab & notifikasi browser.
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
      )}

      {/* Interactive Guide Modal */}
      <PwaGuideModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialTab={deviceType}
      />
    </>
  );
}
