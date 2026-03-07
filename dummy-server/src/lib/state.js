/**
 * state.js — Dummy Server
 *
 * Single mutable in-memory state object for the simulated server.
 * All state resets on container restart — that's fine for a demo.
 *
 * Exports:
 *   - state: the mutable state object
 *   - addLog(level, message): pushes a log entry (keeps last 500)
 */

const state = {
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
};

/**
 * Add a log entry to the state. Keeps only the last 500 entries
 * to prevent unbounded memory growth.
 *
 * @param {"INFO"|"WARN"|"ERROR"} level - Log severity level
 * @param {string} message - Log message
 */
function addLog(level, message) {
  state.logs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
  });
  // Trim to last 500 entries
  if (state.logs.length > 500) {
    state.logs = state.logs.slice(-500);
  }
}

module.exports = { state, addLog };
