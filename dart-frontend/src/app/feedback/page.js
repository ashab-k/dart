"use client";

/**
 * DART Frontend — Analyst Feedback Dashboard
 *
 * Allows SOC analysts to review automated playbook decisions
 * and provide feedback: approve, reject, or escalate.
 * Shows approval stats and a filterable alert review queue.
 */

import { useState, useEffect, useMemo } from "react";
import NavHeader from "../components/NavHeader";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_DART_BACKEND_URL || "http://localhost:3001";

// ── Helpers ──────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return "N/A";
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "N/A";
  }
}

function alertTypeLabel(type) {
  const labels = {
    ddos: "DDoS Flood",
    malicious_upload: "Malicious Upload",
    log4shell_attempt: "Log4Shell RCE",
    brute_force: "Brute Force",
    sql_injection: "SQL Injection",
  };
  return labels[type] || type || "Unknown";
}

function alertTypeColor(type) {
  const colors = {
    ddos: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
    malicious_upload: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
    log4shell_attempt: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
    brute_force: { bg: "rgba(251,146,60,0.15)", text: "#fb923c" },
    sql_injection: { bg: "rgba(56,189,248,0.15)", text: "#38bdf8" },
  };
  return colors[type] || { bg: "rgba(100,116,139,0.15)", text: "#64748b" };
}

function severityColor(score) {
  if (score >= 85) return { bg: "rgba(239,68,68,0.15)", text: "#ef4444", label: "CRITICAL" };
  if (score >= 60) return { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "HIGH" };
  if (score >= 40) return { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "MEDIUM" };
  return { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "LOW" };
}

const FEEDBACK_ACTIONS = [
  { id: "approve", label: "Approve", icon: "✓", color: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)" },
  { id: "reject", label: "Reject", icon: "✕", color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)" },
  { id: "escalate", label: "Escalate", icon: "⬆", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)" },
];

export default function FeedbackPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending | reviewed | all
  const [typeFilter, setTypeFilter] = useState("all");
  const [submitting, setSubmitting] = useState(null); // alert ID being submitted

  async function fetchAlerts() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/alerts/history`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived Stats ──
  const totalAlerts = alerts.length;
  const reviewed = alerts.filter((a) => a.analyst_feedback).length;
  const pending = totalAlerts - reviewed;
  const approved = alerts.filter((a) => a.analyst_feedback?.action === "approve").length;
  const rejected = alerts.filter((a) => a.analyst_feedback?.action === "reject").length;
  const escalated = alerts.filter((a) => a.analyst_feedback?.action === "escalate").length;
  const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : 0;

  // ── Filtered Alerts ──
  const filteredAlerts = useMemo(() => {
    let list = [...alerts].reverse(); // newest first
    if (filter === "pending") {
      list = list.filter((a) => !a.analyst_feedback);
    } else if (filter === "reviewed") {
      list = list.filter((a) => a.analyst_feedback);
    }
    if (typeFilter !== "all") {
      list = list.filter((a) => a.alert_type === typeFilter);
    }
    return list;
  }, [alerts, filter, typeFilter]);

  // ── Get unique alert types for filter ──
  const alertTypes = useMemo(() => {
    const types = new Set(alerts.map((a) => a.alert_type));
    return ["all", ...types];
  }, [alerts]);

  // ── Submit Feedback ──
  async function submitFeedback(alertId, action) {
    setSubmitting(alertId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/alerts/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId, action }),
      });
      if (res.ok) {
        // Optimistically update local state
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alertId
              ? {
                  ...a,
                  analyst_feedback: {
                    action,
                    timestamp: new Date().toISOString(),
                    analyst: "SOC-Analyst-1",
                  },
                }
              : a
          )
        );
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
    setSubmitting(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader />

      {/* ─── Page Header ─── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-7 h-7 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
              Analyst Feedback
            </h1>
            <p className="text-sm text-[#94a3b8] mt-1">
              Review automated playbook decisions — approve, reject, or escalate
            </p>
          </div>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1e293b] border border-[#334155] text-[#38bdf8] hover:bg-[#273548] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Refresh
          </button>
        </div>

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
          {[
            { label: "Total Alerts", value: totalAlerts, color: "#38bdf8" },
            { label: "Pending Review", value: pending, color: pending > 0 ? "#f59e0b" : "#22c55e" },
            { label: "Approved", value: approved, color: "#22c55e" },
            { label: "Rejected", value: rejected, color: "#ef4444" },
            { label: "Escalated", value: escalated, color: "#f59e0b" },
            { label: "Approval Rate", value: `${approvalRate}%`, color: approvalRate > 80 ? "#22c55e" : approvalRate > 50 ? "#f59e0b" : "#ef4444" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card flex flex-col items-center py-3"
              style={{ borderTop: `2px solid ${stat.color}` }}
            >
              <span className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </span>
              <span className="text-xs text-[#94a3b8] mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Filter Controls ─── */}
      <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-[#334155]">
          {[
            { id: "pending", label: `Pending (${pending})` },
            { id: "reviewed", label: `Reviewed (${reviewed})` },
            { id: "all", label: `All (${totalAlerts})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.id
                  ? "bg-[#38bdf8] text-white"
                  : "bg-[#0f172a] text-[#94a3b8] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg overflow-hidden border border-[#334155]">
          {alertTypes.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                typeFilter === t
                  ? "bg-[#38bdf8] text-white"
                  : "bg-[#0f172a] text-[#94a3b8] hover:text-white"
              }`}
            >
              {t === "all" ? "All Types" : alertTypeLabel(t)}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#64748b] ml-auto">
          Showing {filteredAlerts.length} alerts
        </span>
      </div>

      {/* ─── Alert Review Queue ─── */}
      <main className="flex-1 px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#94a3b8]">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading alerts...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="card flex flex-col items-center justify-center h-48 text-center">
            <svg className="w-12 h-12 text-[#64748b] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[#94a3b8]">
              {filter === "pending" ? "All alerts have been reviewed!" : "No alerts match the current filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
            {filteredAlerts.map((alert) => {
              const severity = severityColor(alert.risk_score || 0);
              const typeClr = alertTypeColor(alert.alert_type);
              const hasFeedback = !!alert.analyst_feedback;
              const feedbackAction = alert.analyst_feedback?.action;

              return (
                <div
                  key={alert.id}
                  className={`card transition-all ${
                    hasFeedback ? "opacity-80" : ""
                  }`}
                  style={{
                    borderLeft: `3px solid ${severity.text}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Alert Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className="badge"
                          style={{ backgroundColor: typeClr.bg, color: typeClr.text }}
                        >
                          {alertTypeLabel(alert.alert_type)}
                        </span>
                        <span
                          className="badge"
                          style={{ backgroundColor: severity.bg, color: severity.text }}
                        >
                          {severity.label} ({alert.risk_score})
                        </span>
                        <span className="text-xs text-[#64748b]">
                          {formatDate(alert.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-[#64748b]">Source IP: </span>
                          <span className="text-white font-mono">{alert.source_ip}</span>
                        </div>
                        <div>
                          <span className="text-[#64748b]">Playbook: </span>
                          <span className="text-[#38bdf8]">{alert.selected_playbook || "none"}</span>
                        </div>
                        <div>
                          <span className="text-[#64748b]">Status: </span>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                alert.playbook_status === "completed"
                                  ? "rgba(34,197,94,0.15)"
                                  : "rgba(245,158,11,0.15)",
                              color:
                                alert.playbook_status === "completed"
                                  ? "#22c55e"
                                  : "#f59e0b",
                            }}
                          >
                            {alert.playbook_status}
                          </span>
                        </div>
                        <div className="truncate">
                          <span className="text-[#64748b]">Reasoning: </span>
                          <span className="text-[#94a3b8] text-xs">{alert.risk_reasoning}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Feedback Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {hasFeedback ? (
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className="badge text-sm"
                            style={{
                              backgroundColor:
                                feedbackAction === "approve"
                                  ? "rgba(34,197,94,0.15)"
                                  : feedbackAction === "reject"
                                  ? "rgba(239,68,68,0.15)"
                                  : "rgba(245,158,11,0.15)",
                              color:
                                feedbackAction === "approve"
                                  ? "#22c55e"
                                  : feedbackAction === "reject"
                                  ? "#ef4444"
                                  : "#f59e0b",
                            }}
                          >
                            {feedbackAction === "approve"
                              ? "✓ Approved"
                              : feedbackAction === "reject"
                              ? "✕ Rejected"
                              : "⬆ Escalated"}
                          </span>
                          <span className="text-[10px] text-[#64748b]">
                            {formatDate(alert.analyst_feedback.timestamp)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {FEEDBACK_ACTIONS.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => submitFeedback(alert.id, action.id)}
                              disabled={submitting === alert.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                              style={{
                                backgroundColor: action.bg,
                                color: action.color,
                                borderColor: action.border,
                              }}
                            >
                              {submitting === alert.id ? "..." : `${action.icon} ${action.label}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-[#64748b] py-3 border-t border-[#334155]">
        DART v2.0 — SOC Automation Demo
      </footer>
    </div>
  );
}
