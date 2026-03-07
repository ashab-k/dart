"use client";

/**
 * LogViewer.jsx — DART Frontend
 *
 * Polls the dummy-server /api/logs endpoint every 5 seconds.
 * Shows last 50 log lines in a terminal-style scrollable box.
 * Color-codes: red for ERROR, yellow for WARN, green for INFO.
 * Toggle button to pause/resume polling.
 */

import { useState, useEffect, useRef } from "react";

const DUMMY_URL =
  process.env.NEXT_PUBLIC_DUMMY_SERVER_URL || "http://localhost:3002";

/** Determine line color based on log level content */
function lineColor(line) {
  const upper = line.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("FATAL") || upper.includes("CRITICAL")) {
    return "text-red-400";
  }
  if (upper.includes("WARN") || upper.includes("WARNING")) {
    return "text-yellow-400";
  }
  if (upper.includes("INFO") || upper.includes("SUCCESS")) {
    return "text-green-400";
  }
  return "text-[#94a3b8]";
}

export default function LogViewer() {
  const [logs, setLogs] = useState([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (paused) return;

    async function fetchLogs() {
      try {
        const res = await fetch(`${DUMMY_URL}/api/logs`);
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          setLoading(false);
          return;
        }
        const data = await res.json();
        // data may be an array of strings or objects
        const lines = Array.isArray(data)
          ? data.map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
          : [];
        setLogs(lines.slice(-50));
        setError(null);
        setLoading(false);
      } catch (err) {
        setError("Cannot reach server");
        setLoading(false);
      }
    }

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [paused]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, paused]);

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h2 className="text-lg font-semibold">Log Viewer</h2>
          <span className="text-xs text-[#64748b]">({logs.length} lines)</span>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}
          <button
            onClick={() => setPaused(!paused)}
            className={`px-3 py-1 text-xs font-medium rounded-md border transition-all ${
              paused
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30"
                : "bg-[#334155] text-[#94a3b8] border-[#334155] hover:bg-[#3d4f65]"
            }`}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      {/* Terminal Box */}
      <div
        ref={scrollRef}
        className="bg-[#020617] rounded-lg border border-[#1e293b] p-4 overflow-y-auto font-mono text-xs leading-relaxed"
        style={{ maxHeight: "250px", minHeight: "120px" }}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-[#64748b]">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-[#64748b] flex items-center gap-2">
            <span className="text-lg">$</span>
            <span className="animate-pulse">No log entries yet. Waiting for server activity...</span>
          </div>
        ) : (
          logs.map((line, i) => (
            <div key={i} className={`${lineColor(line)} hover:bg-[#0f172a] px-1 rounded`}>
              <span className="text-[#334155] select-none mr-2">{String(i + 1).padStart(3, " ")}</span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
