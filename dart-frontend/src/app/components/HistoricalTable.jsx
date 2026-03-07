"use client";

/**
 * HistoricalTable.jsx — DART Frontend
 *
 * Fetches from DART Backend /api/alerts/history on mount, refreshes every 10s.
 * Sortable table columns, expandable rows, and JSON export.
 * Row colors: red bg if severity==critical, orange if high.
 */

import { useState, useEffect, useCallback } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_DART_BACKEND_URL || "http://localhost:3001";

/** Sortable column defs */
const COLUMNS = [
  { key: "timestamp", label: "Time", sortable: true },
  { key: "source_ip", label: "Source IP", sortable: true },
  { key: "alert_type", label: "Type", sortable: true },
  { key: "risk_score", label: "Risk", sortable: true },
  { key: "selected_playbook", label: "Playbook", sortable: true },
  { key: "playbook_status", label: "Status", sortable: true },
  { key: "country", label: "Country", sortable: true },
];

/** Risk score color styles */
function riskBadge(score) {
  if (score > 80) return "bg-red-500/20 text-red-400";
  if (score > 50) return "bg-orange-500/20 text-orange-400";
  if (score > 30) return "bg-yellow-500/20 text-yellow-400";
  return "bg-green-500/20 text-green-400";
}

/** Row background based on severity */
function rowBg(severity) {
  if (severity === "critical") return "bg-red-500/5 hover:bg-red-500/10";
  if (severity === "high") return "bg-orange-500/5 hover:bg-orange-500/10";
  return "hover:bg-[#273548]";
}

/** Status badge styles */
function statusColor(status) {
  switch (status) {
    case "completed": return "text-green-400";
    case "failed": return "text-red-400";
    case "executing": return "text-blue-400";
    default: return "text-gray-400";
  }
}

/** Format ISO timestamp for table display */
function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

export default function HistoricalTable() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedId, setExpandedId] = useState(null);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/alerts/history`);
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError("Cannot reach backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Sort logic
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...alerts].sort((a, b) => {
    let va, vb;
    if (sortKey === "country") {
      va = a.enrichment?.geoip?.country || "";
      vb = b.enrichment?.geoip?.country || "";
    } else {
      va = a[sortKey] ?? "";
      vb = b[sortKey] ?? "";
    }
    if (typeof va === "number" && typeof vb === "number") {
      return sortDir === "asc" ? va - vb : vb - va;
    }
    return sortDir === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  // Export as JSON
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(alerts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alerts.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-12.75A1.125 1.125 0 014.5 4.5h15a1.125 1.125 0 011.125 1.125v12.75m-18 0h18m-18 0a1.125 1.125 0 01-1.125-1.125m19.125 0a1.125 1.125 0 01-1.125 1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m12 1.125h1.5c.621 0 1.125-.504 1.125-1.125" />
          </svg>
          <h2 className="text-lg font-semibold">Alert History</h2>
          <span className="text-xs text-[#64748b]">({alerts.length} alerts)</span>
        </div>
        <button
          onClick={handleExport}
          disabled={alerts.length === 0}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 hover:bg-[#38bdf8]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-[#64748b]">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading history...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 text-red-400 text-sm">
          {error}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-[#64748b]">
          <p className="text-sm">No alert history</p>
          <p className="text-xs mt-1">Processed alerts will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`text-left px-3 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider ${
                      col.sortable ? "cursor-pointer hover:text-[#94a3b8] select-none" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <span className="text-[#38bdf8]">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((alert) => (
                <>
                  <tr
                    key={alert.id}
                    onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                    className={`border-b border-[#334155]/50 cursor-pointer transition-colors ${rowBg(alert.severity)}`}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-[#94a3b8] whitespace-nowrap">
                      {formatTime(alert.timestamp)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-medium">
                      {alert.source_ip}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="badge bg-[#334155] text-[#94a3b8]">
                        {alert.alert_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`badge font-mono ${riskBadge(alert.risk_score)}`}>
                        {alert.risk_score}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#94a3b8]">
                      {alert.selected_playbook || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${statusColor(alert.playbook_status)}`}>
                        {alert.playbook_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#94a3b8]">
                      {alert.enrichment?.geoip?.country || "—"}
                    </td>
                  </tr>
                  {/* Expanded Detail Row */}
                  {expandedId === alert.id && (
                    <tr key={`${alert.id}-detail`} className="bg-[#0f172a]/70">
                      <td colSpan={7} className="px-4 py-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* Risk Reasoning */}
                          <div className="bg-[#1e293b] rounded-lg p-3 border border-[#334155]">
                            <h4 className="font-semibold text-[#38bdf8] mb-2 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                              </svg>
                              Risk Analysis
                            </h4>
                            <p className="text-[#94a3b8] leading-relaxed">
                              {alert.risk_reasoning || "No analysis available."}
                            </p>
                          </div>

                          {/* Enrichment / Threat Intelligence */}
                          <div className="bg-[#1e293b] rounded-lg p-3 border border-[#334155]">
                            <h4 className="font-semibold text-[#38bdf8] mb-2 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                              </svg>
                              Threat Intelligence
                            </h4>
                            <div className="space-y-1.5 text-[#94a3b8]">
                              <p>
                                <span className="text-[#64748b]">Reported Source:</span>{" "}
                                <span className="font-mono">{alert.source_ip}</span>
                              </p>
                              {alert.enriched_ip && alert.enriched_ip !== alert.source_ip && (
                                <p>
                                  <span className="text-[#64748b]">Enriched IP:</span>{" "}
                                  <span className="font-mono text-[#e2e8f0]">{alert.enriched_ip}</span>
                                </p>
                              )}
                              <div className="border-t border-[#334155] my-1.5 pt-1.5">
                                <p>
                                  <span className="text-[#64748b]">GreyNoise:</span>{" "}
                                  <span className={
                                    alert.enrichment?.greynoise?.classification === "malicious" ? "text-red-400 font-semibold" :
                                    alert.enrichment?.greynoise?.classification === "benign" ? "text-green-400" : ""
                                  }>
                                    {alert.enrichment?.greynoise?.classification || "unknown"}
                                  </span>
                                  {alert.enrichment?.greynoise?.name && alert.enrichment.greynoise.name !== "unknown" && (
                                    <span className="text-[#64748b]"> — {alert.enrichment.greynoise.name}</span>
                                  )}
                                </p>
                                <p>
                                  <span className="text-[#64748b]">AbuseIPDB:</span>{" "}
                                  <span className={(alert.enrichment?.abuseipdb?.abuseConfidenceScore ?? 0) > 50 ? "text-red-400 font-semibold" : ""}>
                                    {alert.enrichment?.abuseipdb?.abuseConfidenceScore ?? 0}% confidence
                                  </span>
                                  {" "}({alert.enrichment?.abuseipdb?.totalReports ?? 0} community reports)
                                </p>
                                <p>
                                  <span className="text-[#64748b]">Location:</span>{" "}
                                  {alert.enrichment?.geoip?.city || "—"},{" "}
                                  {alert.enrichment?.geoip?.country || "—"}{" "}
                                  <span className="text-[#475569]">via {alert.enrichment?.geoip?.isp || "—"}</span>
                                </p>
                                <p>
                                  <span className="text-[#64748b]">VirusTotal:</span>{" "}
                                  <span className={(alert.enrichment?.virustotal?.malicious ?? 0) > 0 ? "text-red-400" : ""}>
                                    {alert.enrichment?.virustotal?.malicious ?? 0} malicious
                                  </span>
                                  , {alert.enrichment?.virustotal?.suspicious ?? 0} suspicious
                                  , {alert.enrichment?.virustotal?.harmless ?? 0} clean
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Playbook Result */}
                          <div className="bg-[#1e293b] rounded-lg p-3 border border-[#334155]">
                            <h4 className="font-semibold text-[#38bdf8] mb-2 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                              </svg>
                              Playbook Result
                            </h4>
                            {alert.playbook_result ? (
                              <div className="space-y-1.5 text-[#94a3b8]">
                                <p>
                                  <span className="text-[#64748b]">ID:</span>{" "}
                                  {alert.playbook_result.playbook_id || "—"}
                                </p>
                                <p>
                                  <span className="text-[#64748b]">Success:</span>{" "}
                                  <span className={alert.playbook_result.success ? "text-green-400" : "text-red-400"}>
                                    {alert.playbook_result.success ? "Yes" : "No"}
                                  </span>
                                </p>
                                <p>
                                  <span className="text-[#64748b]">Steps:</span>{" "}
                                  {alert.playbook_result.steps_executed?.join(" → ") || "—"}
                                </p>
                                <p className="text-[10px] text-[#64748b] mt-1">
                                  {alert.playbook_result.notes}
                                </p>
                              </div>
                            ) : (
                              <p className="text-[#64748b]">No playbook executed</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
