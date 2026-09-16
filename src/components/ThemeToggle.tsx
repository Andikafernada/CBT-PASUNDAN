"use client";

import React, { useEffect } from "react";
import { Sparkles } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  useEffect(() => {
    // Ensure dark class is removed everywhere
    document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("cbt_theme", "light");
    } catch {}
  }, []);

  return (
    <div
      className={`px-3 py-1.5 rounded-xl border border-sky-300 bg-sky-200/80 text-black flex items-center gap-1.5 text-xs font-black shadow-xs select-none ${className}`}
      title="Tema CBT: Soft Blue Modern"
    >
      <Sparkles className="w-3.5 h-3.5 text-black" />
      <span className="text-[11px] font-black text-black">Soft Blue</span>
    </div>
  );
}
