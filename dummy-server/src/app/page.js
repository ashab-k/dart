"use client";

/**
 * Dummy Server — Homepage with Live Traffic Monitor
 *
 * Shows the "Acme Corp" branding PLUS a real-time traffic
 * dashboard that polls /api/health and /api/logs so the user
 * can see DDoS attack requests arriving on this server.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

function TrafficMonitor() {
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function poll() {
      try {
        const [hRes, lRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/logs"),
        ]);
        if (hRes.ok) setHealth(await hRes.json());
        if (lRes.ok) {
          const data = await lRes.json();
          setLogs(Array.isArray(data) ? data.slice(-30) : []);
        }
        setError(null);
      } catch {
        setError("Polling failed");
      }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const rpm = health?.requestsPerMinute ?? 0;
  const status = !health ? "OFFLINE" : rpm > 200 ? "UNDER ATTACK" : health.status === "ok" ? "ONLINE" : "DEGRADED";
  const statusColor = status === "ONLINE" ? "#22c55e" : status === "UNDER ATTACK" ? "#ef4444" : status === "DEGRADED" ? "#eab308" : "#64748b";

  function logColor(entry) {
    const msg = typeof entry === "string" ? entry : entry?.level || "";
    if (msg.includes("ERROR") || msg.includes("CRITICAL")) return "#ef4444";
    if (msg.includes("WARN")) return "#eab308";
    if (msg.includes("INFO")) return "#22c55e";
    return "#94a3b8";
  }

  function formatLog(entry) {
    if (typeof entry === "string") return entry;
    const t = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false }) : "";
    return `${t} [${entry.level}] ${entry.message}`;
  }

  return (
    <section style={{
      maxWidth: "900px",
      margin: "0 auto 3rem",
      padding: "0 2rem",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.25rem" }}>📡</span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Live Network Traffic</h2>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.35rem 1rem",
          borderRadius: "999px",
          background: `${statusColor}20`,
          border: `1px solid ${statusColor}50`,
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: statusColor,
            animation: status === "UNDER ATTACK" ? "pulse-dot 0.5s infinite" : "pulse-dot 2s infinite",
          }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: statusColor }}>{status}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "0.75rem",
        marginBottom: "1rem",
      }}>
        {[
          { label: "Req/min", value: rpm.toLocaleString(), color: rpm > 200 ? "#ef4444" : rpm > 50 ? "#eab308" : "#22c55e" },
          { label: "Rate Limit", value: health?.rateLimit ?? "—", color: "#38bdf8" },
          { label: "Blocked IPs", value: health?.blockedIPs?.length ?? 0, color: health?.blockedIPs?.length > 0 ? "#ef4444" : "#22c55e" },
          { label: "Total Requests", value: (health?.totalRequests ?? 0).toLocaleString(), color: "#38bdf8" },
        ].map((s, i) => (
          <div key={i} style={{
            textAlign: "center",
            padding: "0.75rem",
            background: "rgba(15,23,42,0.6)",
            borderRadius: "8px",
            border: "1px solid #334155",
          }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Request Log */}
      <div style={{
        background: "rgba(2,6,23,0.8)",
        borderRadius: "8px",
        border: "1px solid #1e293b",
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          background: "rgba(30,41,59,0.5)",
          borderBottom: "1px solid #1e293b",
        }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8" }}>
            Request Log ({logs.length} entries)
          </span>
          {error && <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>{error}</span>}
        </div>
        <div
          ref={scrollRef}
          style={{
            maxHeight: "250px",
            overflowY: "auto",
            padding: "0.75rem 1rem",
            fontFamily: "monospace",
            fontSize: "0.75rem",
            lineHeight: "1.6",
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "#475569", padding: "1rem 0", textAlign: "center" }}>
              Waiting for incoming requests...
            </div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} style={{ color: logColor(entry) }}>
                <span style={{ color: "#334155", userSelect: "none", marginRight: "0.5rem" }}>
                  {String(i + 1).padStart(3, " ")}
                </span>
                {formatLog(entry)}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </section>
  );
}

export default function Home() {
  return (
    <main style={{
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      color: "#f1f5f9",
      minHeight: "100vh",
    }}>
      {/* Nav */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 2rem",
        borderBottom: "1px solid #334155",
        background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🌐</span>
          <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>Acme Corp</span>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem", color: "#94a3b8" }}>
          <span>Products</span>
          <span>Solutions</span>
          <span>Pricing</span>
          <span>Docs</span>
          <Link href="/uploads" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>📁 Upload Scanner</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        textAlign: "center",
        padding: "4rem 2rem 2rem",
        maxWidth: "800px",
        margin: "0 auto",
      }}>
        <div style={{
          display: "inline-block",
          padding: "0.35rem 1rem",
          background: "rgba(56,189,248,0.15)",
          border: "1px solid rgba(56,189,248,0.3)",
          borderRadius: "999px",
          fontSize: "0.8rem",
          color: "#38bdf8",
          marginBottom: "1.5rem",
        }}>
          🚀 Now with AI-powered analytics
        </div>
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: "1rem",
          background: "linear-gradient(135deg, #f1f5f9, #38bdf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Build faster.<br />Scale smarter.
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "1rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          The all-in-one platform for modern engineering teams.
          Deploy, monitor, and scale your applications with confidence.
        </p>
        <Link href="/uploads" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1.75rem",
          background: "linear-gradient(135deg, #38bdf8, #818cf8)",
          color: "#fff",
          fontWeight: 700,
          fontSize: "1rem",
          borderRadius: "12px",
          textDecoration: "none",
          boxShadow: "0 0 20px rgba(56,189,248,0.3)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}>
          📁 Upload File
        </Link>
      </section>

      {/* Live Traffic Monitor */}
      <TrafficMonitor />

      {/* Stats */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1.5rem",
        maxWidth: "800px",
        margin: "0 auto 3rem",
        padding: "0 2rem",
      }}>
        {[
          { value: "99.99%", label: "Uptime SLA" },
          { value: "10M+", label: "Requests / day" },
          { value: "<50ms", label: "Avg latency" },
        ].map((stat, i) => (
          <div key={i} style={{
            textAlign: "center",
            padding: "1.5rem",
            background: "rgba(30,41,59,0.6)",
            borderRadius: "12px",
            border: "1px solid #334155",
          }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#38bdf8" }}>{stat.value}</div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "2rem",
        borderTop: "1px solid #334155",
        color: "#64748b",
        fontSize: "0.85rem",
      }}>
        © 2026 Acme Corp — Simulated Server for DART Demo
      </footer>
    </main>
  );
}
