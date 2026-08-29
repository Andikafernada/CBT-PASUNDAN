"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("cbt_theme") as "light" | "dark" | null;
    if (saved === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("cbt_theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative p-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-semibold ${
        theme === "light"
          ? "bg-white hover:bg-slate-100 text-amber-600 border-slate-200 shadow-sm"
          : "bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-sm"
      } ${className}`}
      title={theme === "light" ? "Ganti ke Mode Gelap (Malam)" : "Ganti ke Mode Terang (Siang / Lab)"}
      aria-label="Toggle Theme"
    >
      {theme === "light" ? (
        <>
          <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          <span className="hidden sm:inline text-slate-700 font-bold text-[11px]">Terang</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
          <span className="hidden sm:inline text-slate-200 font-bold text-[11px]">Gelap</span>
        </>
      )}
    </button>
  );
}
