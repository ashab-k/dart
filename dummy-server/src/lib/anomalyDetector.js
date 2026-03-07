/**
 * anomalyDetector.js — Dummy Server
 *
 * Background job that checks server state every 10 seconds.
 * If requestsPerMinute > 200, sets status to "degraded" and
 * POSTs an alert to the DART Backend ingest endpoint.
 *
 * Started via instrumentation.js (Next.js 14 server startup hook).
 */

import { state, addLog } from "./state";

const DART_BACKEND_URL =
  process.env.DART_BACKEND_URL || "http://localhost:3001";

let detectorInterval = null;

/**
 * Find the most frequent IP in the recent list.
 * Falls back to a known-bad IP if list is empty.
 */
function getMostFrequentIP(ips) {
  if (!ips.length) return "185.220.101.34"; // fallback known-bad IP
  const counts = {};
  ips.forEach((ip) => {
    counts[ip] = (counts[ip] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Start the anomaly detection background loop.
 * Runs every 10 seconds. Safe to call multiple times (idempotent).
 */
export function startDetector() {
  if (detectorInterval) return; // Already running

  console.log(`[anomalyDetector] Starting anomaly detection (10s interval). DART backend: ${DART_BACKEND_URL}`);

  detectorInterval = setInterval(async () => {
    try {
      if (state.requestsPerMinute > 200) {
        state.status = "degraded";

        const attackerIP = getMostFrequentIP(state.recentSourceIPs);

        // Gather last 20 log messages for context
        const recentLogs = state.logs
          .slice(-20)
          .map((l) => `[${l.level}] ${l.message}`);

        const alertPayload = {
          source_ip: attackerIP,
          alert_type: "ddos",
          request_rate: state.requestsPerMinute,
          anomaly_detected: true,
          raw_logs: recentLogs,
        };

        addLog("ERROR", `Anomaly detected — ${state.requestsPerMinute} req/min from ${attackerIP}`);
        console.log(`[anomalyDetector] Anomaly: ${state.requestsPerMinute} req/min from ${attackerIP} — sending alert...`);

        // POST alert to DART Backend
        try {
          const res = await fetch(`${DART_BACKEND_URL}/api/alerts/ingest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(alertPayload),
          });

          if (res.ok) {
            addLog("INFO", `Alert sent to DART — source: ${attackerIP}`);
            console.log(`[anomalyDetector] Alert sent (source: ${attackerIP})`);
          } else {
            const text = await res.text().catch(() => "");
            addLog("WARN", `DART backend responded with status ${res.status}: ${text}`);
            console.log(`[anomalyDetector] DART backend responded: ${res.status}`);
          }
        } catch (fetchErr) {
          addLog("WARN", `Failed to reach DART backend: ${fetchErr.message}`);
          console.log(`[anomalyDetector] Failed to reach DART backend: ${fetchErr.message}`);
        }
      }
    } catch (err) {
      console.error("[anomalyDetector] Error:", err.message);
    }
  }, 10_000);
}
