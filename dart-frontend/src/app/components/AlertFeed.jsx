"use client";

/**
 * AlertFeed.jsx — DART Frontend
 *
 * Connects to DART Backend SSE endpoint via EventSource.
 * Displays last 20 alerts as cards in reverse-chronological order.
 * New cards animate in from the top.
 * Shows empty state with pulsing radar icon when no alerts.
 */

import { useState, useEffect, useRef } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_DART_BACKEND_URL || "http://localhost:3001";

/** Risk score color mapping */
function riskColor(score) {
  if (score > 80) return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" };
  if (score > 50) return { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" };
  if (score > 30) return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" };
  return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" };
}

/** Playbook status badge */
function StatusBadge({ status }) {
  const styles = {
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    executing: "bg-blue-500/20 text-blue-400",
    pending: "bg-gray-500/20 text-gray-400",
  };
  return (
    <span className={`badge ${styles[status] || styles.pending}`}>
      {status || "pending"}
    </span>
  );
}

/** Format ISO timestamp to human-readable */
function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AlertFeed({ onConnectionChange }) {
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    let es;
    function connect() {
      es = new EventSource(`${BACKEND_URL}/api/alerts/stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(null);
        onConnectionChange?.(true);
      };

      es.onmessage = (event) => {
        try {
          const alert = JSON.parse(event.data);
          setAlerts((prev) => [alert, ...prev].slice(0, 20));
        } catch (e) {
          console.error("[AlertFeed] Parse error:", e);
        }
      };

      es.onerror = () => {
        setConnected(false);
        onConnectionChange?.(false);
        setError("Connection lost. Reconnecting...");
        es.close();
        // Retry in 3s
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [onConnectionChange]);

  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <h2 className="text-lg font-semibold">Live Alert Feed</h2>
          <span className="text-xs text-[#64748b]">({alerts.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        </div>
      </div>

      {/* Alert Cards */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
        {alerts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-64 text-[#64748b]">
            <div className="animate-pulse-radar mb-4">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
                <circle cx="12" cy="12" r="6" strokeDasharray="3 2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <line x1="12" y1="12" x2="17" y2="7" strokeWidth={1.5} />
              </svg>
            </div>
            <p className="text-sm font-medium">No alerts yet</p>
            <p className="text-xs mt-1">Waiting for incoming threats...</p>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const risk = riskColor(alert.risk_score);
            return (
              <div
                key={alert.id || i}
                className={`animate-slide-in bg-[#0f172a]/50 border ${risk.border} rounded-lg p-3 space-y-2`}
              >
                {/* Row 1: Time, IP, Type */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#64748b]">
                      {formatTime(alert.timestamp)}
                    </span>
                    <span className="text-sm font-semibold font-mono text-[#f1f5f9]">
                      {alert.source_ip}
                    </span>
                    <span className="badge bg-[#334155] text-[#94a3b8]">
                      {alert.alert_type}
                    </span>
                  </div>
                  {/* Risk Score Badge */}
                  <span className={`badge ${risk.bg} ${risk.text} font-mono`}>
                    {alert.risk_score}
                  </span>
                </div>
                {/* Row 2: Playbook + Status */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748b]">Playbook:</span>
                    <span className="text-[#94a3b8] font-medium">
                      {alert.selected_playbook || "none"}
                    </span>
                  </div>
                  <StatusBadge status={alert.playbook_status} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
