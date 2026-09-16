"use client";

import React, { useEffect, useState } from "react";
import { Download, Smartphone, X, CheckCircle2 } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if user dismissed it in this session
    const dismissed = sessionStorage.getItem("pwa_prompt_dismissed");
    if (dismissed) return;

    // 3. Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Fallback: If on mobile and prompt hasn't fired after 2 seconds, show helper prompt
    const timer = setTimeout(() => {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && !isStandalone && !sessionStorage.getItem("pwa_prompt_dismissed")) {
        setShowPrompt(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // Guide for iOS / Safari / unsupported prompt
      alert(
        "📱 Panduan Pasang Aplikasi:\n\n1. Ketuk tombol Menu Browser (titik tiga di kanan atas atau ikon Bagikan di Safari).\n2. Pilih 'Tambahkan ke Layar Utama' (Add to Home screen).\n3. Buka CBT HEBAT dari layar utama HP Anda."
      );
      setShowPrompt(false);
      sessionStorage.setItem("pwa_prompt_dismissed", "true");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-4 flex items-start gap-3.5 text-slate-800">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-slate-900 truncate">
              Pasang Aplikasi CBT HEBAT
            </h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-600 mt-1 leading-snug">
            Pasang di HP/Laptop agar ujian berjalan <strong>satu layar penuh</strong> tanpa gangguan tab & notifikasi browser.
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
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
  );
}
