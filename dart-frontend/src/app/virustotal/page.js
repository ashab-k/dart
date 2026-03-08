"use client";

/**
 * DART Frontend — VirusTotal File Analysis Reports
 *
 * Dedicated page showing complete scan results for all
 * malicious upload detections. Split-panel layout:
 * - Left: Reports list with detection rate bars
 * - Right: Full VirusTotal report with engine breakdown
 */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_DART_BACKEND_URL || "http://localhost:3001";

// ── Helpers ──────────────────────────────────────────────────
function pct(n) {
  return typeof n === "number" ? n : 0;
}
function safe(val, fallback = "N/A") {
  return val != null ? val : fallback;
}
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
function rateColor(rate) {
  if (rate > 70) return "#ef4444";
  if (rate > 30) return "#f59e0b";
  if (rate > 0) return "#eab308";
  return "#22c55e";
}
function severityColor(score) {
  if (score >= 85) return { bg: "rgba(239,68,68,0.15)", text: "#ef4444", label: "CRITICAL" };
  if (score >= 60) return { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "HIGH" };
  if (score >= 40) return { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "MEDIUM" };
  return { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "LOW" };
}

const ENGINES_PER_PAGE = 20;

export default function VirusTotalReports() {
  const [reports, setReports] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [engineFilter, setEngineFilter] = useState("all");
  const [engineSearch, setEngineSearch] = useState("");
  const [enginePage, setEnginePage] = useState(0);
  const [copied, setCopied] = useState(false);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/virustotal/reports`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
      setSelectedIdx(0);
    } catch (err) {
      console.error("Failed to fetch VT reports:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReports();
  }, []);

  const selected = reports[selectedIdx] || null;
  const vtFile = selected?.virustotal_file || {};
  const engines = vtFile.engines || {};

  // Summary stats
  const totalScans = reports.length;
  const quarantined = reports.filter(
    (r) => r.playbook_status === "completed"
  ).length;
  const avgDetection = totalScans > 0
    ? Math.round(
        reports.reduce(
          (sum, r) => sum + pct(r.virustotal_file?.detection_rate),
          0
        ) / totalScans
      )
    : 0;
  const highestRisk = totalScans > 0
    ? Math.max(...reports.map((r) => pct(r.risk_score)))
    : 0;

  // Filtered engine list
  const filteredEngines = useMemo(() => {
    let entries = Object.entries(engines);
    if (engineFilter === "malicious") {
      entries = entries.filter(([, e]) => e.category === "malicious");
    } else if (engineFilter === "clean") {
      entries = entries.filter(
        ([, e]) => e.category !== "malicious" && e.category !== "suspicious"
      );
    }
    if (engineSearch) {
      const q = engineSearch.toLowerCase();
      entries = entries.filter(([name]) =>
        name.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [engines, engineFilter, engineSearch]);

  const totalEnginePages = Math.max(
    1,
    Math.ceil(filteredEngines.length / ENGINES_PER_PAGE)
  );
  const pagedEngines = filteredEngines.slice(
    enginePage * ENGINES_PER_PAGE,
    (enginePage + 1) * ENGINES_PER_PAGE
  );

  // Reset engine page when filter/search changes
  useEffect(() => {
    setEnginePage(0);
  }, [engineFilter, engineSearch, selectedIdx]);

  function copyHash() {
    if (selected?.sha256) {
      navigator.clipboard.writeText(selected.sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const malCount = Object.values(engines).filter(
    (e) => e.category === "malicious"
  ).length;
  const cleanCount = Object.values(engines).filter(
    (e) => e.category !== "malicious" && e.category !== "suspicious"
  ).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Nav Bar ─── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-[#334155] bg-[#0f172a]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#38bdf8] to-[#818cf8] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#38bdf8]">DART</span>
            </span>
          </div>
          <div className="flex items-center gap-1 ml-6">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition-all"
            >
              Dashboard
            </Link>
            <Link
              href="/virustotal"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#1e293b] border-b-2 border-[#38bdf8]"
            >
              VT Reports
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Page Header ─── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-7 h-7 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              VirusTotal File Analysis Reports
            </h1>
            <p className="text-sm text-[#94a3b8] mt-1">
              Complete scan results for all malicious upload detections
            </p>
          </div>
          <button
            onClick={fetchReports}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1e293b] border border-[#334155] text-[#38bdf8] hover:bg-[#273548] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Total Scans", value: totalScans, color: "#38bdf8" },
            { label: "Files Quarantined", value: quarantined, color: "#f59e0b" },
            { label: "Avg Detection Rate", value: `${avgDetection}%`, color: rateColor(avgDetection) },
            { label: "Highest Risk", value: `${highestRisk}%`, color: rateColor(highestRisk) },
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

      {/* ─── Main Content: Split Panel ─── */}
      <main className="flex-1 px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#94a3b8]">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="card flex flex-col items-center justify-center h-64 text-center">
            <svg className="w-16 h-16 text-[#64748b] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-lg font-medium text-[#94a3b8]">
              No malicious uploads detected yet
            </p>
            <p className="text-sm text-[#64748b] mt-2">
              Run <code className="bg-[#1e293b] px-2 py-0.5 rounded text-[#38bdf8]">node scripts/upload-attack.js</code> to simulate an attack
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* ── Left Panel: Reports List (~40%) ── */}
            <div className="lg:col-span-2 space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {reports.map((r, i) => {
                const dr = pct(r.virustotal_file?.detection_rate);
                const isSelected = i === selectedIdx;
                return (
                  <button
                    key={r.alert_id}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-[#38bdf8] bg-[#1e293b] shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                        : "border-[#334155] bg-[#1e293b]/50 hover:border-[#475569] hover:bg-[#1e293b]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-white truncate max-w-[60%]">
                        {safe(r.file_name, "unknown")}
                      </span>
                      <span className="text-xs text-[#64748b]">
                        {formatDate(r.timestamp)}
                      </span>
                    </div>

                    {/* Detection rate bar */}
                    <div className="w-full h-2 bg-[#0f172a] rounded-full overflow-hidden my-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(dr, 2)}%`,
                          backgroundColor: rateColor(dr),
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: rateColor(dr) }}>
                        {pct(r.virustotal_file?.malicious)} / {safe(r.virustotal_file?.total_engines, 0)} engines
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: severityColor(pct(r.risk_score)).bg,
                            color: severityColor(pct(r.risk_score)).text,
                          }}
                        >
                          {pct(r.risk_score)}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              r.playbook_status === "completed"
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(245,158,11,0.15)",
                            color:
                              r.playbook_status === "completed"
                                ? "#22c55e"
                                : "#f59e0b",
                          }}
                        >
                          {safe(r.playbook_status, "pending")}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Right Panel: Full Report (~60%) ── */}
            <div className="lg:col-span-3 space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {selected && (
                <>
                  {/* FILE INFORMATION */}
                  <div className="card">
                    <h3 className="text-sm font-semibold text-[#38bdf8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      File Information
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-[#64748b]">Filename:</span>{" "}
                        <span className="text-white font-medium">{safe(selected.file_name)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">File Size:</span>{" "}
                        <span className="text-white">{safe(selected.file_size, 0)} bytes</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#64748b]">SHA256:</span>{" "}
                        <div className="flex items-center gap-2 mt-1">
                          <code className="font-mono text-xs text-[#38bdf8] bg-[#0f172a] px-3 py-1.5 rounded border border-[#334155] break-all select-all flex-1">
                            {safe(selected.sha256)}
                          </code>
                          <button
                            onClick={copyHash}
                            className="shrink-0 px-2 py-1.5 rounded bg-[#0f172a] border border-[#334155] text-xs text-[#94a3b8] hover:text-white hover:border-[#38bdf8] transition-all"
                          >
                            {copied ? "✓" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Type:</span>{" "}
                        <span className="text-white">{safe(vtFile.file_type)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">EICAR Detected:</span>{" "}
                        <span
                          className="badge ml-1"
                          style={{
                            backgroundColor: selected.eicar_detected
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(34,197,94,0.15)",
                            color: selected.eicar_detected ? "#ef4444" : "#22c55e",
                          }}
                        >
                          {selected.eicar_detected ? "YES" : "NO"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">First Seen:</span>{" "}
                        <span className="text-white">{formatDate(vtFile.first_submission)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Last Analysis:</span>{" "}
                        <span className="text-white">{formatDate(vtFile.last_analysis)}</span>
                      </div>
                    </div>
                  </div>

                  {/* DETECTION SUMMARY */}
                  <div className="card">
                    <h3 className="text-sm font-semibold text-[#38bdf8] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      Detection Summary
                    </h3>
                    <div className="flex items-center gap-8">
                      {/* Circular gauge */}
                      <div className="relative w-28 h-28 shrink-0">
                        <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth="8"
                          />
                          <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke={rateColor(pct(vtFile.detection_rate))}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${pct(vtFile.detection_rate) * 2.64} 264`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span
                            className="text-2xl font-bold"
                            style={{ color: rateColor(pct(vtFile.detection_rate)) }}
                          >
                            {pct(vtFile.detection_rate)}%
                          </span>
                          <span className="text-xs text-[#64748b]">detection</span>
                        </div>
                      </div>

                      {/* Stat boxes */}
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        {[
                          { label: "Malicious", value: pct(vtFile.malicious), color: "#ef4444" },
                          { label: "Suspicious", value: pct(vtFile.suspicious), color: "#f59e0b" },
                          { label: "Harmless", value: pct(vtFile.harmless), color: "#22c55e" },
                          { label: "Undetected", value: pct(vtFile.undetected), color: "#64748b" },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-center"
                          >
                            <div className="text-xl font-bold" style={{ color: s.color }}>
                              {s.value}
                            </div>
                            <div className="text-xs text-[#64748b]">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RISK ASSESSMENT */}
                  <div className="card">
                    <h3 className="text-sm font-semibold text-[#38bdf8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                      Risk Assessment
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-[#64748b]">Risk Score:</span>
                        <span
                          className="text-lg font-bold"
                          style={{ color: severityColor(pct(selected.risk_score)).text }}
                        >
                          {pct(selected.risk_score)}/100
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: severityColor(pct(selected.risk_score)).bg,
                            color: severityColor(pct(selected.risk_score)).text,
                          }}
                        >
                          {severityColor(pct(selected.risk_score)).label}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Reasoning:</span>{" "}
                        <span className="text-[#94a3b8]">{safe(selected.risk_reasoning)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#64748b]">Playbook:</span>
                        <span className="text-white font-medium">
                          {safe(selected.playbook_result?.playbook_id)}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              selected.playbook_result?.success
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(239,68,68,0.15)",
                            color: selected.playbook_result?.success
                              ? "#22c55e"
                              : "#ef4444",
                          }}
                        >
                          {selected.playbook_result?.success ? "SUCCESS" : "FAILED"}
                        </span>
                      </div>
                      {selected.playbook_result?.steps_executed && (
                        <div>
                          <span className="text-[#64748b]">Steps:</span>{" "}
                          {selected.playbook_result.steps_executed.map((step, i) => (
                            <span
                              key={i}
                              className="inline-block bg-[#0f172a] border border-[#334155] rounded px-2 py-0.5 text-xs text-[#94a3b8] mr-1 mb-1"
                            >
                              {step}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ENGINE RESULTS */}
                  <div className="card">
                    <h3 className="text-sm font-semibold text-[#38bdf8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Engine Results
                    </h3>

                    {/* Controls */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <input
                        type="text"
                        placeholder="Search engines..."
                        value={engineSearch}
                        onChange={(e) => setEngineSearch(e.target.value)}
                        className="flex-1 min-w-[150px] bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#64748b] focus:border-[#38bdf8] outline-none transition-all"
                      />
                      <div className="flex rounded-lg overflow-hidden border border-[#334155]">
                        {["all", "malicious", "clean"].map((f) => (
                          <button
                            key={f}
                            onClick={() => setEngineFilter(f)}
                            className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                              engineFilter === f
                                ? "bg-[#38bdf8] text-white"
                                : "bg-[#0f172a] text-[#94a3b8] hover:text-white"
                            }`}
                          >
                            {f === "all" ? "All" : f === "malicious" ? "Malicious" : "Clean"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-[#64748b] mb-2">
                      Showing {filteredEngines.length} engines ({malCount} malicious, {cleanCount} clean)
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-lg border border-[#334155]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#0f172a] text-[#64748b] text-xs uppercase">
                            <th className="text-left px-3 py-2 font-medium">Engine</th>
                            <th className="text-left px-3 py-2 font-medium">Category</th>
                            <th className="text-left px-3 py-2 font-medium">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedEngines.map(([name, eng]) => {
                            const rowBg =
                              eng.category === "malicious"
                                ? "rgba(239,68,68,0.08)"
                                : eng.category === "suspicious"
                                ? "rgba(245,158,11,0.08)"
                                : eng.category === "harmless"
                                ? "rgba(34,197,94,0.05)"
                                : "transparent";
                            const catColor =
                              eng.category === "malicious"
                                ? "#ef4444"
                                : eng.category === "suspicious"
                                ? "#f59e0b"
                                : eng.category === "harmless"
                                ? "#22c55e"
                                : "#64748b";
                            return (
                              <tr
                                key={name}
                                className="border-t border-[#334155]/50"
                                style={{ backgroundColor: rowBg }}
                              >
                                <td className="px-3 py-1.5 text-white font-medium">
                                  {name}
                                </td>
                                <td className="px-3 py-1.5">
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor: `${catColor}20`,
                                      color: catColor,
                                    }}
                                  >
                                    {eng.category}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-[#94a3b8] text-xs font-mono">
                                  {eng.result || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalEnginePages > 1 && (
                      <div className="flex items-center justify-between mt-3 text-xs text-[#94a3b8]">
                        <span>
                          Page {enginePage + 1} of {totalEnginePages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEnginePage((p) => Math.max(0, p - 1))}
                            disabled={enginePage === 0}
                            className="px-3 py-1 rounded bg-[#0f172a] border border-[#334155] hover:border-[#38bdf8] disabled:opacity-30 transition-all"
                          >
                            ← Prev
                          </button>
                          <button
                            onClick={() =>
                              setEnginePage((p) =>
                                Math.min(totalEnginePages - 1, p + 1)
                              )
                            }
                            disabled={enginePage >= totalEnginePages - 1}
                            className="px-3 py-1 rounded bg-[#0f172a] border border-[#334155] hover:border-[#38bdf8] disabled:opacity-30 transition-all"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SOURCE IP ENRICHMENT */}
                  <div className="card">
                    <h3 className="text-sm font-semibold text-[#38bdf8] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                      Source IP Enrichment
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-[#64748b]">Reported IP:</span>{" "}
                        <span className="text-white font-mono">{safe(selected.source_ip)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Enriched IP:</span>{" "}
                        <span className="text-white font-mono">{safe(selected.enriched_ip)}</span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">GreyNoise:</span>{" "}
                        <span
                          style={{
                            color:
                              selected.enrichment?.greynoise?.classification === "malicious"
                                ? "#ef4444"
                                : "#94a3b8",
                          }}
                        >
                          {safe(selected.enrichment?.greynoise?.classification)}
                        </span>
                        {selected.enrichment?.greynoise?.name && (
                          <span className="text-[#64748b]">
                            {" "}
                            — {selected.enrichment.greynoise.name}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[#64748b]">AbuseIPDB:</span>{" "}
                        <span
                          style={{
                            color:
                              (selected.enrichment?.abuseipdb?.abuseConfidenceScore || 0) > 50
                                ? "#ef4444"
                                : "#94a3b8",
                          }}
                        >
                          {safe(selected.enrichment?.abuseipdb?.abuseConfidenceScore, 0)}/100
                        </span>
                        <span className="text-[#64748b]">
                          {" "}
                          ({safe(selected.enrichment?.abuseipdb?.totalReports, 0)} reports)
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Location:</span>{" "}
                        <span className="text-white">
                          {safe(selected.enrichment?.geoip?.city)},{" "}
                          {safe(selected.enrichment?.geoip?.country)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748b]">ISP:</span>{" "}
                        <span className="text-white">
                          {safe(selected.enrichment?.geoip?.isp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-[#64748b] py-3 border-t border-[#334155]">
        DART v1.0 — SOC Automation Demo
      </footer>
    </div>
  );
}
