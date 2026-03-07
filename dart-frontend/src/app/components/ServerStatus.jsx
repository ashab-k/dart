"use client";

/**
 * ServerStatus.jsx — DART Frontend
 *
 * Polls the dummy-server /api/health endpoint every 3 seconds.
 * Displays: status badge (ONLINE/DEGRADED/OFFLINE), requests/min,
 * blocked IPs, rate limit, and uptime counter.
 */

import { useState, useEffect, useRef } from "react";

const DUMMY_URL =
  process.env.NEXT_PUBLIC_DUMMY_SERVER_URL || "http://localhost:3002";

/** Determine server status based on health response */
function getStatus(data, responseTime) {
  if (!data) return "OFFLINE";
  if (responseTime > 500 || data.status !== "ok") return "DEGRADED";
  return "ONLINE";
}

/** Status color mapping */
function statusStyle(status) {
  switch (status) {
    case "ONLINE":
      return { dot: "bg-green-500", text: "text-green-400", glow: "shadow-[0_0_12px_rgba(34,197,94,0.4)]" };
    case "DEGRADED":
      return { dot: "bg-yellow-500", text: "text-yellow-400", glow: "shadow-[0_0_12px_rgba(245,158,11,0.4)]" };
    default:
      return { dot: "bg-red-500", text: "text-red-400", glow: "shadow-[0_0_12px_rgba(239,68,68,0.4)]" };
  }
}

/** Format uptime seconds to readable string */
function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ServerStatus() {
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState("OFFLINE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    async function poll() {
      try {
        // Abort previous request if still pending
        if (controllerRef.current) controllerRef.current.abort();
        controllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => controllerRef.current.abort(), 2000);

        const start = Date.now();
        const res = await fetch(`${DUMMY_URL}/api/health`, {
          signal: controllerRef.current.signal,
        });
        clearTimeout(timeoutId);
        const responseTime = Date.now() - start;

        if (!res.ok) {
          setStatus("DEGRADED");
          setError(`HTTP ${res.status}`);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setHealth(data);
        setStatus(getStatus(data, responseTime));
        setError(null);
        setLoading(false);
      } catch (err) {
        if (err.name === "AbortError") {
          setStatus("OFFLINE");
          setError("Request timed out");
        } else {
          setStatus("OFFLINE");
          setError("Cannot reach server");
        }
        setHealth(null);
        setLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      clearInterval(interval);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  const style = statusStyle(status);

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
        </svg>
        <h2 className="text-lg font-semibold">Server Status</h2>
      </div>

      {/* Status Indicator */}
      <div className="flex flex-col items-center mb-5">
        <div
          className={`w-20 h-20 rounded-full ${style.dot} ${style.glow} flex items-center justify-center mb-3 transition-all duration-300`}
          style={{
            animation: status === "OFFLINE" ? "pulse-red 1.5s infinite" : status === "ONLINE" ? "pulse-green 2s infinite" : "none",
          }}
        >
          <span className="text-2xl font-bold text-white">
            {status === "ONLINE" ? "✓" : status === "DEGRADED" ? "!" : "✕"}
          </span>
        </div>
        <span className={`text-sm font-bold ${style.text} tracking-wider`}>
          {status}
        </span>
        {error && (
          <span className="text-xs text-[#64748b] mt-1">{error}</span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {/* Requests/min */}
        <div className="bg-[#0f172a]/50 rounded-lg p-3 border border-[#334155]">
          <p className="text-xs text-[#64748b] mb-1">Req/min</p>
          <p className="text-xl font-bold font-mono text-[#f1f5f9]">
            {loading ? "—" : health?.requestsPerMinute ?? 0}
          </p>
        </div>

        {/* Rate Limit */}
        <div className="bg-[#0f172a]/50 rounded-lg p-3 border border-[#334155]">
          <p className="text-xs text-[#64748b] mb-1">Rate Limit</p>
          <p className="text-xl font-bold font-mono text-[#f1f5f9]">
            {loading ? "—" : health?.rateLimit ?? "none"}
          </p>
        </div>

        {/* Blocked IPs */}
        <div className="bg-[#0f172a]/50 rounded-lg p-3 border border-[#334155]">
          <p className="text-xs text-[#64748b] mb-1">Blocked IPs</p>
          {loading ? (
            <p className="text-sm text-[#64748b]">—</p>
          ) : health?.blockedIPs?.length > 0 ? (
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {health.blockedIPs.map((ip, i) => (
                <span key={i} className="block text-xs font-mono text-red-400">
                  {ip}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-400 font-medium">None</p>
          )}
        </div>

        {/* Uptime */}
        <div className="bg-[#0f172a]/50 rounded-lg p-3 border border-[#334155]">
          <p className="text-xs text-[#64748b] mb-1">Uptime</p>
          <p className="text-xl font-bold font-mono text-[#f1f5f9]">
            {loading ? "—" : formatUptime(health?.uptimeSeconds)}
          </p>
        </div>
      </div>
    </div>
  );
}
