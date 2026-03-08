"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavHeader({ rightContent }) {
  const pathname = usePathname();
  const [clock, setClock] = useState("");

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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              pathname === "/"
                ? "text-white bg-[#1e293b] border-b-2 border-[#38bdf8]"
                : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border-b-2 border-transparent"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/virustotal"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              pathname === "/virustotal"
                ? "text-white bg-[#1e293b] border-b-2 border-[#38bdf8]"
                : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border-b-2 border-transparent"
            }`}
          >
            VT Reports
          </Link>
          <Link
            href="/log4shell"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              pathname === "/log4shell"
                ? "text-white bg-[#1e293b] border-b-2 border-[#38bdf8]"
                : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border-b-2 border-transparent"
            }`}
          >
            Log4Shell
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {rightContent}
        {/* Clock */}
        {clock && (
          <div className="text-sm font-mono text-[#94a3b8] bg-[#1e293b] px-3 py-1.5 rounded-lg border border-[#334155]">
            {clock}
          </div>
        )}
      </div>
    </nav>
  );
}
