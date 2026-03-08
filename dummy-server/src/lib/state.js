/**
 * state.js — Dummy Server
 *
 * Single mutable in-memory state object for the simulated server.
 * All state resets on container restart — that's fine for a demo.
 *
 * The anomaly detector is started as a side-effect on first import,
 * ensuring it runs whenever any route handler loads this module.
 */

export const state = {
  /** Server health status: "ok" | "degraded" | "offline" */
  status: "ok",

  /** Rolling requests per minute counter */
  requestsPerMinute: 0,

  /** Array of blocked IP address strings */
  blockedIPs: [],

  /** Max requests/min before returning 429 */
  rateLimit: 100,

  /** Array of { timestamp, level, message } log entries */
  logs: [],

  /** Server start time for uptime calculation */
  uptimeStart: Date.now(),

  /** Total requests ever served (for /api/data response) */
  totalRequests: 0,

  /** Rolling list of last 50 source IPs seen (for anomaly detector) */
  recentSourceIPs: [],

  /** Array of file upload scan records */
  uploadedFiles: [],

  /** Array of quarantined file records */
  quarantinedFiles: [],

  /** Total Log4Shell attempts tracked globally */
  log4shellAttempts: 0,

  /** Log4Shell attempts grouped by source IP */
  log4shellAttemptsByIP: {},
};

/**
 * Add a log entry to the state. Keeps only the last 500 entries.
 */
export function addLog(level, message) {
  state.logs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
  });
  if (state.logs.length > 500) {
    state.logs = state.logs.slice(-500);
  }
}

/**
 * Track a source IP. Keeps the last 50 for frequency analysis.
 */
export function addSourceIP(ip) {
  state.recentSourceIPs.push(ip);
  if (state.recentSourceIPs.length > 50) {
    state.recentSourceIPs = state.recentSourceIPs.slice(-50);
  }
}

/**
 * Add an upload record to state. Keeps only the last 100.
 */
export function addUploadRecord(record) {
  state.uploadedFiles.push(record);
  if (state.uploadedFiles.length > 100) {
    state.uploadedFiles = state.uploadedFiles.slice(-100);
  }
}

// ----- Anomaly Detection (runs as side-effect on import) -----

const DART_BACKEND_URL =
  process.env.DART_BACKEND_URL || "http://localhost:3001";

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

let detectorStarted = false;

function startAnomalyDetector() {
  if (detectorStarted) return;
  detectorStarted = true;

  console.log(`[anomalyDetector] Started (10s interval). DART backend: ${DART_BACKEND_URL}`);

  setInterval(async () => {
    try {
      if (state.requestsPerMinute > 200) {
        state.status = "degraded";

        const attackerIP = getMostFrequentIP(state.recentSourceIPs);
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
            addLog("WARN", `DART backend responded: ${res.status}`);
          }
        } catch (fetchErr) {
          addLog("WARN", `Failed to reach DART backend: ${fetchErr.message}`);
          console.log(`[anomalyDetector] Cannot reach backend: ${fetchErr.message}`);
        }
      }
    } catch (err) {
      console.error("[anomalyDetector] Error:", err.message);
    }
  }, 10_000);
}

// Auto-start on module load (server-side only)
if (typeof window === "undefined") {
  startAnomalyDetector();
}
