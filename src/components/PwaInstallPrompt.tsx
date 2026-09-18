"use client";

import React, { useEffect, useState } from "react";
import { Download, Smartphone, X, CheckCircle2 } from "lucide-react";

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
    // Check if already running in standalone mode (installed)
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

  // If already installed standalone, don't show the button
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
      // If iOS or unsupported native prompt
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
          className={`p-2 rounded-xl bg-white border border-sky-300 text-blue-600 hover:bg-sky-50 transition cursor-pointer shadow-xs ${className}`}
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

// Kembalikan null agar tidak ada pop-up mengambang otomatis yang mengganggu
export function PwaInstallPrompt() {
  return null;
}
