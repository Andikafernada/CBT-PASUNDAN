"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Tv, Wifi, ShieldAlert } from "lucide-react";

export function AdminTelemetryHeader({ currentUser }: { currentUser?: any }) {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Only show telemetry for Superuser (ADMIN) or Operator (PROKTOR)
  const isSuperOrOp = currentUser?.role === "ADMIN" || currentUser?.role === "OPERATOR";

  const fetchTelemetry = async () => {
    if (currentUser && !isSuperOrOp) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/command-center");
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data.telemetry);
        setSummary(data.summary);
      }
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000); // 10s poll
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!isSuperOrOp) return null;

  if (loading && !telemetry) {
    return (
      <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-medium px-2 py-1 bg-white/70 rounded-xl border border-sky-200 shadow-xs animate-pulse">
        <Activity className="w-3.5 h-3.5 text-sky-500" />
        <span>Menghubungkan telemetri...</span>
      </div>
    );
  }

  if (!telemetry) return null;

  const hasWarning = (summary?.totalLocked || 0) > 0 || (summary?.totalZombies || 0) > 0;

  return (
    <div className="hidden md:flex items-center gap-2 text-xs">
      {/* Telemetry Status Pill */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/90 dark:bg-sky-950/40 backdrop-blur-md rounded-xl border border-sky-300 shadow-xs font-bold text-slate-800">
        {/* Server & RAM */}
        <div className="flex items-center gap-1.5" title={`CPU Load: ${telemetry?.cpuLoad1m || 0} | Node Heap: ${telemetry?.nodeHeapMb || 0}MB`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-400">SERVER OK</span>
          <span className="text-[11px] text-slate-500 font-normal">|</span>
          <span className="text-[11px] text-slate-700 dark:text-slate-200">
            RAM <strong>{telemetry?.osRamPercent || 0}%</strong>
          </span>
        </div>

        <span className="text-slate-300">|</span>

        {/* 7-Lab 280 PC Hub */}
        <div className="flex items-center gap-1.5" title="Kapasitas 7 Lab Komputer (40 PC / Lab)">
          <Wifi className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-[11px]">
            <strong>{summary?.totalConnected || 0}</strong>
            <span className="text-slate-400">/280 PC</span>
          </span>
        </div>

        {/* Warning Indicator if any */}
        {hasWarning && (
          <>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 text-amber-600 text-[11px] font-black animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{summary?.totalLocked || 0} Terkunci</span>
            </div>
          </>
        )}
      </div>

      {/* Quick Action: 7-Lab Command Center */}
      <Link
        href="/admin/command-center"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl font-black text-[11px] shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <Activity className="w-3.5 h-3.5" />
        <span>Pusat Kendali 7 Lab</span>
        {hasWarning && (
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
        )}
      </Link>

      {/* Quick Action: TV Token Board */}
      <Link
        href="/admin/token-board"
        target="_blank"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-sky-50 text-slate-700 border border-sky-300 rounded-xl font-bold text-[11px] shadow-xs transition"
        title="Buka Layar Token untuk TV / Proyektor"
      >
        <Tv className="w-3.5 h-3.5 text-slate-600" />
        <span>Layar TV</span>
      </Link>
    </div>
  );
}
