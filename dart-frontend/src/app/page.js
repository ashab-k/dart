"use client";

/**
 * DART Frontend — Dashboard Page
 *
 * Single-page SOC dashboard with:
 * - Top nav bar: DART logo, live clock, connection status
 * - 2-column grid: AlertFeed (left), ServerStatus (right)
 * - Full-width bottom row: LogViewer + HistoricalTable
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import AlertFeed from "./components/AlertFeed";
import ServerStatus from "./components/ServerStatus";
import LogViewer from "./components/LogViewer";
import HistoricalTable from "./components/HistoricalTable";

export default function Dashboard() {
  const [clock, setClock] = useState("");
  const [sseConnected, setSseConnected] = useState(false);

  // Live clock — updates every second
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) +
          " " +
          now.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Top Nav Bar ─── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-[#334155] bg-[#0f172a]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* DART Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#38bdf8] to-[#818cf8] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#38bdf8]">DART</span>
              <span className="text-[#64748b] text-sm font-normal ml-2 hidden sm:inline">
                Dynamic Routing & Alert Triage
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1 ml-6">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#1e293b] border-b-2 border-[#38bdf8]"
            >
              Dashboard
            </Link>
            <Link
              href="/virustotal"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-all"
            >
              VT Reports
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                sseConnected
                  ? "bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  : "bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              }`}
              style={{
                animation: sseConnected
                  ? "pulse-green 2s infinite"
                  : "pulse-red 1.5s infinite",
              }}
            />
            <span className="text-[#94a3b8] hidden sm:inline">
              {sseConnected ? "Live" : "Disconnected"}
            </span>
          </div>
          {/* Clock */}
          <div className="text-sm font-mono text-[#94a3b8] bg-[#1e293b] px-3 py-1.5 rounded-lg border border-[#334155]">
            {clock}
          </div>
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <main className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-[1920px] mx-auto w-full">
        {/* Top Row: 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left: Alert Feed (wider) */}
          <div className="lg:col-span-2">
            <AlertFeed onConnectionChange={setSseConnected} />
          </div>
          {/* Right: Server Status */}
          <div className="lg:col-span-1">
            <ServerStatus />
          </div>
        </div>

        {/* Bottom Row: Log Viewer */}
        <LogViewer />

        {/* Full-width Bottom: Historical Table */}
        <HistoricalTable />
      </main>

      {/* ─── Footer ─── */}
      <footer className="text-center text-xs text-[#64748b] py-3 border-t border-[#334155]">
        DART v1.0 — SOC Automation Demo
      </footer>
    </div>
  );
}
