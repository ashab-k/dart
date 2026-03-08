"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavHeader from "../components/NavHeader";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_DART_BACKEND_URL || "http://localhost:3001";

// Helper for country flags
function countryFlag(code) {
  if (!code) return "";
  return code
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

export default function Log4ShellPage() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  // Poll for incidents every 3 seconds
  useEffect(() => {
    async function fetchIncidents() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/alerts/history`);
        const allAlerts = await res.json();

        // Filter for log4shell only
        const log4shellAlerts = allAlerts.filter(
          (a) => a.alert_type === "log4shell_attempt"
        );

        setIncidents(log4shellAlerts);

        // Auto-select first if none selected
        if (log4shellAlerts.length > 0 && !selectedIncident) {
          setSelectedIncident(log4shellAlerts[0]);
        }
      } catch (err) {
        console.error("Failed to fetch log4shell incidents:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, [selectedIncident]);

  // Derived stats
  const totalAttempts = incidents.reduce(
    (acc, alert) => acc + (alert.match_count || 1),
    0
  );
  const uniqueIPs = new Set(incidents.map((a) => a.source_ip)).size;
  const playbooksExecuted = incidents.filter(
    (a) => a.playbook_status === "completed"
  ).length;

  const responseTimes = incidents
    .map((a) => a.playbook_result?.response_time_ms)
    .filter((t) => t != null);
  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        )
      : 0;

  function formatResponseTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-[#f1f5f9] font-sans">
      {/* ─── Top Nav Bar ─── */}
      <NavHeader />

      {/* ─── SECTION A: Critical Alert Banner ─── */}
      <div className="bg-[#1e293b] border-b border-[#334155] px-6 py-4">
        <div className="max-w-[1920px] mx-auto flex items-center gap-4">
          <div className="text-3xl text-[#ef4444]">⚠</div>
          <div>
            <div className="font-bold text-white text-lg tracking-wide flex items-center gap-3">
              CVE-2021-44228 · Log4Shell
              <span className="bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/50 px-2 py-0.5 rounded text-xs">CVSS 10.0 CRITICAL</span>
            </div>
            <div className="text-[#94a3b8] text-sm mt-0.5">
              Remote Code Execution via JNDI Injection in Apache Log4j. Affected
              versions: Log4j 2.0-beta9 through 2.14.1.
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="bg-[#1e293b] border-b border-[#334155] px-6 py-3">
        <div className="max-w-[1920px] mx-auto grid grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider mb-1">
              Total Attempts
            </div>
            <div className="text-2xl font-bold text-white">
              {totalAttempts}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider mb-1">
              Unique Attacker IPs
            </div>
            <div className="text-2xl font-bold text-white">{uniqueIPs}</div>
          </div>
          <div>
            <div className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider mb-1">
              Playbooks Executed
            </div>
            <div className="text-2xl font-bold text-white">
              {playbooksExecuted}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider mb-1">
              Avg Response Time
            </div>
            <div className="text-2xl font-bold text-white">
              {formatResponseTime(avgResponseTime)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 p-6 max-w-[1920px] mx-auto w-full flex gap-6 overflow-hidden h-[calc(100vh-180px)]">
        {/* ─── SECTION B: Incident List (Left, 35%) ─── */}
        <div className="w-[35%] flex flex-col bg-[#1e293b]/50 border border-[#334155] rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-3 bg-[#1e293b] border-b border-[#334155] flex justify-between items-center">
            <h2 className="text-sm font-semibold text-[#cbd5e1]">
              Incident Feed
            </h2>
            <span className="bg-[#0f172a] text-[#94a3b8] px-2 py-0.5 rounded text-xs border border-[#334155]">
              {incidents.length} recorded
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="text-4xl mb-4 opacity-50">🛡</div>
                <h3 className="text-[#f1f5f9] font-medium mb-2">
                  No Log4Shell attempts detected
                </h3>
                <p className="text-[#64748b] text-sm">
                  Run <code className="bg-[#0f172a] px-1.5 py-0.5 rounded text-[#ef4444]">scripts/log4shell-attack.js</code> to simulate an attack.
                </p>
              </div>
            ) : (
              incidents.map((incident) => {
                const isSelected = selectedIncident?.id === incident.id;
                const loc = incident.enrichment?.geoip;
                const flag = countryFlag(loc?.countryCode);
                const PlaybookIcon = incident.playbook_status === "completed" ? "✓" : "⏳";

                return (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#1e293b] border-[#38bdf8]"
                        : "bg-[#0f172a]/60 border-[#334155] hover:border-[#475569] hover:bg-[#1e293b]"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-[#94a3b8] font-mono">
                        {new Date(incident.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/50">
                        CRITICAL
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-mono text-sm font-semibold text-white">
                        {incident.enriched_ip}
                      </div>
                      <div className="text-xs text-[#cbd5e1] flex items-center gap-1">
                        {loc?.city}, {loc?.countryCode} {flag}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[#ef4444] truncate bg-[#1e293b] p-1 rounded border border-[#334155] opacity-80 mb-2">
                      {incident.jndi_url || "unknown payload"}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-[#94a3b8]">
                        Playbook: <span className="text-white">{incident.selected_playbook}</span>
                      </div>
                      <div className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        incident.playbook_status === "completed" ? "bg-[#14532d] text-[#86efac]" : "bg-[#713f12] text-[#fde047]"
                      }`}>
                        {PlaybookIcon} {incident.playbook_status}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── SECTION C: Full Incident Report (Right, 65%) ─── */}
        <div className="w-[65%] bg-[#0f172a] border border-[#334155] rounded-xl overflow-y-auto shadow-2xl">
          {!selectedIncident ? (
            <div className="h-full flex items-center justify-center text-[#64748b]">
              Select an incident from the feed to view the full report.
            </div>
          ) : (
            <div className="p-8 space-y-6">
              {/* Report Header */}
              <div className="border border-[#334155] bg-[#1e293b]/50 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4 border-b border-[#334155] pb-4">
                  <div className="w-10 h-10 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/50 flex items-center justify-center text-[#ef4444] text-xl">
                    !
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      INCIDENT REPORT
                    </h2>
                    <div className="text-[#94a3b8] text-sm">
                      <span className="text-[#ef4444] mr-2">●</span>
                      Log4Shell RCE Attempt
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#94a3b8] inline-block w-28">Incident ID:</span>
                    <span className="font-mono text-[#cbd5e1]">{selectedIncident.id}</span>
                  </div>
                  <div>
                    <span className="text-[#94a3b8] inline-block w-28">Response Time:</span>
                    <span className="font-mono text-[#cbd5e1]">
                      {selectedIncident.playbook_result?.response_time_ms !== undefined
                        ? formatResponseTime(selectedIncident.playbook_result.response_time_ms)
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94a3b8] inline-block w-28">Detected:</span>
                    <span className="font-mono text-[#cbd5e1]">
                      {new Date(selectedIncident.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94a3b8] inline-block w-28">Contained:</span>
                    <span className="font-mono text-[#22c55e]">
                      {selectedIncident.playbook_result?.incident_report?.contained_at
                        ? new Date(selectedIncident.playbook_result.incident_report.contained_at).toLocaleString()
                        : "Pending..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid: CVE Details & Attacker Intel */}
              <div className="grid grid-cols-2 gap-6">
                {/* CVE Details */}
                <div className="border border-[#334155] bg-[#1e293b]/50 rounded-lg p-5">
                  <h3 className="text-sm font-bold text-[#94a3b8] mb-4 border-b border-[#334155] pb-2 uppercase tracking-wide">
                    CVE Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex">
                      <span className="text-[#64748b] w-24 flex-shrink-0">CVE ID:</span>
                      <span className="font-mono text-white font-semibold">CVE-2021-44228</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[#64748b] w-24 flex-shrink-0">CVSS Score:</span>
                      <span className="font-mono text-white mr-2">10.0 / 10.0</span>
                      <div className="h-2 w-24 bg-[#7f1d1d] rounded overflow-hidden flex-shrink-0">
                        <div className="h-full bg-[#ef4444] w-full"></div>
                      </div>
                      <span className="text-[#ef4444] font-bold text-xs ml-2">CRITICAL</span>
                    </div>
                    <div className="flex">
                      <span className="text-[#64748b] w-24 flex-shrink-0">CVSS Vector:</span>
                      <span className="font-mono text-[#cbd5e1] text-xs mt-0.5 break-all">
                        {selectedIncident.playbook_result?.incident_report?.cvss_vector ||
                          "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"}
                      </span>
                    </div>
                    <div className="flex mt-2 pt-2 border-t border-[#334155]">
                      <span className="text-[#94a3b8] leading-relaxed">
                        {selectedIncident.playbook_result?.incident_report?.attack_description ||
                          "Attacker injected JNDI lookup string into HTTP headers attempting to trigger remote class loading."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attacker Intelligence */}
                <div className="border border-[#334155] bg-[#1e293b]/50 rounded-lg p-5">
                  <h3 className="text-sm font-bold text-[#94a3b8] mb-4 border-b border-[#334155] pb-2 uppercase tracking-wide">
                    Attacker Intelligence
                  </h3>
                  <div className="space-y-3 text-sm">
                     <div className="flex">
                      <span className="text-[#64748b] w-24 flex-shrink-0">Enriched IP:</span>
                      <span className="font-mono text-white">{selectedIncident.enriched_ip}</span>
                    </div>
                    <div className="flex">
                      <span className="text-[#64748b] w-24 flex-shrink-0">Location:</span>
                      <span className="text-[#cbd5e1]">
                         {selectedIncident.enrichment?.geoip?.city || 'Unknown'}, {selectedIncident.enrichment?.geoip?.country || 'Unknown'} {countryFlag(selectedIncident.enrichment?.geoip?.countryCode)}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="text-[#64748b] w-24 flex-shrink-0">ISP/Org:</span>
                      <span className="text-[#cbd5e1] truncate">{selectedIncident.enrichment?.geoip?.isp || 'Unknown'}</span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-[#334155]">
                       <div className="flex mb-2">
                        <span className="text-[#64748b] w-24 flex-shrink-0 mt-0.5">GreyNoise:</span>
                        <div>
                          <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-1 border ${
                            selectedIncident.enrichment?.greynoise?.classification === 'malicious' 
                            ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/50'
                            : 'bg-[#1e293b] text-[#94a3b8] border-[#475569]'
                          }`}>
                            {selectedIncident.enrichment?.greynoise?.classification || 'unknown'}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(selectedIncident.enrichment?.greynoise?.tags || []).map(tag => {
                              const isLog4 = tag.toLowerCase().includes('log4') || tag.toLowerCase().includes('jndi');
                              return (
                                <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  isLog4 ? 'bg-[#ef4444] text-white' : 'bg-[#334155] text-[#cbd5e1]'
                                }`}>
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#334155]">
                       <div className="flex items-center">
                        <span className="text-[#64748b] w-24 flex-shrink-0">AbuseIPDB:</span>
                        <div className="flex-1">
                           <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#cbd5e1]">{selectedIncident.enrichment?.abuseipdb?.abuseConfidenceScore || 0}% Confidence</span>
                              <span className="text-[#64748b]">{selectedIncident.enrichment?.abuseipdb?.totalReports || 0} reports</span>
                           </div>
                           <div className="h-1.5 w-full bg-[#0f172a] rounded overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-yellow-500 to-red-500" 
                                style={{ width: `${selectedIncident.enrichment?.abuseipdb?.abuseConfidenceScore || 0}%` }}
                              ></div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attack Payload */}
              <div className="border border-[#334155] bg-[#1e293b]/50 rounded-lg p-5">
                <h3 className="text-sm font-bold text-[#94a3b8] mb-4 border-b border-[#334155] pb-2 uppercase tracking-wide flex items-center gap-2">
                  <span>Attack Payload</span>
                  <span className="text-[10px] bg-[#0f172a] border border-[#475569] text-[#94a3b8] px-1.5 py-0.5 rounded normal-case tracking-normal">Forensic view only</span>
                </h3>
                
                <div className="mb-4">
                  <div className="text-xs text-[#94a3b8] mb-1">Extracted JNDI URL:</div>
                  <code className="block w-full bg-[#0f172a] border border-[#334155] text-[#ef4444] p-3 rounded font-mono text-sm shadow-inner overflow-x-auto break-all">
                    {selectedIncident.jndi_url || "N/A"}
                  </code>
                </div>

                <div>
                  <div className="text-xs text-[#94a3b8] mb-2">Matched HTTP Headers ({selectedIncident.match_count}):</div>
                  <div className="space-y-3">
                    {selectedIncident.matched_headers?.map((match, i) => (
                      <div key={i} className="bg-[#0f172a] border border-[#334155] rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[#38bdf8] font-mono text-sm">{match.header}</span>
                          <span className="text-xs text-[#64748b] font-mono bg-[#1e293b] px-1.5 py-0.5 rounded">{match.pattern}</span>
                        </div>
                        <code className="block text-[#ef4444] text-xs font-mono break-all leading-relaxed p-2 bg-[#0f172a] rounded border border-[#334155]">
                          {match.value}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Response Actions */}
              <div className="border border-[#14532d] bg-[#1e293b]/50 rounded-lg p-5">
                <h3 className="text-sm font-bold text-[#86efac] mb-4 border-b border-[#14532d] pb-2 uppercase tracking-wide">
                  Response Actions (log4shell-patch-isolate playbook)
                </h3>
                <div className="space-y-2">
                  {(selectedIncident.playbook_result?.incident_report?.remediation_applied || []).map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 text-[#22c55e]">✓</div>
                      <div className="text-[#cbd5e1] text-sm">{step}</div>
                    </div>
                  ))}
                  {(!selectedIncident.playbook_result?.incident_report?.remediation_applied) && (
                    <div className="text-[#94a3b8] text-sm italic">Actions pending or playbook failed.</div>
                  )}
                </div>
              </div>

              {/* Patch Recommendation */}
              <div className="border border-[#334155] bg-[#1e293b]/50 rounded-lg p-5">
                <h3 className="text-sm font-bold text-[#94a3b8] mb-3 uppercase tracking-wide">
                  Patch Recommendation
                </h3>
                <p className="text-[#cbd5e1] text-sm leading-relaxed mb-4">
                  {selectedIncident.playbook_result?.incident_report?.patch_recommendation || 
                    "Upgrade Apache Log4j to version 2.17.1 or later. Set log4j2.formatMsgNoLookups=true as interim mitigation."}
                </p>
                <div className="flex gap-4 text-xs font-medium">
                  <a href="https://nvd.nist.gov/vuln/detail/CVE-2021-44228" target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] hover:underline flex items-center gap-1">
                    → NVD Detail
                  </a>
                  <a href="https://logging.apache.org/log4j/2.x/security.html" target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] hover:underline flex items-center gap-1">
                    → Apache Security Bulletin
                  </a>
                  <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] hover:underline flex items-center gap-1">
                    → CISA KEV Catalog
                  </a>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
