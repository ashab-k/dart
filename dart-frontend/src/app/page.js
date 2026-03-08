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
import NavHeader from "./components/NavHeader";

export default function Dashboard() {
  const [sseConnected, setSseConnected] = useState(false);



  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Top Nav Bar ─── */}
      <NavHeader
        rightContent={
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
        }
      />

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
