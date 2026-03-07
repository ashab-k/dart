/**
 * anomalyDetector.js — Dummy Server
 *
 * Background job that checks server state every 10 seconds.
 * If requestsPerMinute > 200, sets status to "degraded" and
 * POSTs an alert to the DART Backend ingest endpoint.
 *
 * Started via instrumentation.js (Next.js 14 server startup hook).
 */

const { state, addLog } = require("./state");

const DART_BACKEND_URL =
  process.env.DART_BACKEND_URL || "http://localhost:3001";

let detectorInterval = null;

/**
 * Start the anomaly detection background loop.
 * Runs every 10 seconds. Safe to call multiple times (idempotent).
 */
function startDetector() {
  if (detectorInterval) return; // Already running

  console.log("[anomalyDetector] Starting anomaly detection (10s interval)");

  detectorInterval = setInterval(async () => {
    try {
      if (state.requestsPerMinute > 200) {
        state.status = "degraded";

        // Gather last 20 log messages for context
        const recentLogs = state.logs
          .slice(-20)
          .map((l) => `[${l.level}] ${l.message}`);

        const alertPayload = {
          source_ip: "simulated-attack",
          alert_type: "ddos",
          request_rate: state.requestsPerMinute,
          anomaly_detected: true,
          raw_logs: recentLogs,
        };

        addLog("ERROR", `Anomaly detected — ${state.requestsPerMinute} req/min exceeds threshold (200)`);

        // POST alert to DART Backend
        try {
          const res = await fetch(`${DART_BACKEND_URL}/api/alerts/ingest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(alertPayload),
          });

          if (res.ok) {
            addLog("INFO", "Anomaly alert sent to DART backend successfully");
          } else {
            addLog("WARN", `DART backend responded with status ${res.status}`);
          }
        } catch (fetchErr) {
          addLog("WARN", `Failed to reach DART backend: ${fetchErr.message}`);
        }

        console.log(
          `[anomalyDetector] Anomaly detected — ${state.requestsPerMinute} req/min. Alert sent to DART.`
        );
      }
    } catch (err) {
      console.error("[anomalyDetector] Error:", err.message);
    }
  }, 10_000);
}

module.exports = { startDetector };
