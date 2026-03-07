/**
 * middleware.js — Dummy Server
 *
 * Request tracking, IP blocking, and rate limiting logic.
 *
 * Uses a module-level rolling window counter that resets every 60s.
 * Each request is checked against blockedIPs and the rateLimit.
 *
 * Exports:
 *   - checkRequest(request): returns null if OK, or a Response if blocked/limited
 *   - resetWindow(): resets the rolling window (called by the 60s interval)
 */

const { state, addLog } = require("./state");

// ----- Rolling window counter -----
let windowStart = Date.now();
let windowCount = 0;

// Reset the window counter every 60 seconds
setInterval(() => {
  state.requestsPerMinute = windowCount;
  windowCount = 0;
  windowStart = Date.now();
}, 60_000);

// Also update requestsPerMinute more frequently for real-time display
setInterval(() => {
  // Estimate current RPM based on partial window
  const elapsed = (Date.now() - windowStart) / 1000;
  if (elapsed > 0) {
    state.requestsPerMinute = Math.round((windowCount / elapsed) * 60);
  }
}, 5_000);

/**
 * Extract client IP from request headers.
 * Falls back to "unknown" if not available.
 */
function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check an incoming request against blockedIPs and rateLimit.
 *
 * @param {Request} request - The incoming request
 * @returns {Response|null} - A 403/429 Response if blocked/limited, or null if OK
 */
function checkRequest(request) {
  const ip = getClientIP(request);

  // Check blocked IPs
  if (state.blockedIPs.includes(ip)) {
    addLog("ERROR", `Blocked request from banned IP: ${ip}`);
    return Response.json(
      { error: "Forbidden — IP is blocked", ip },
      { status: 403 }
    );
  }

  // Increment counter
  windowCount++;
  state.totalRequests++;

  // Check rate limit — need at least 2s of data to avoid cold-start false positives
  const elapsed = (Date.now() - windowStart) / 1000;
  const currentRPM = elapsed > 2 ? Math.round((windowCount / elapsed) * 60) : windowCount;
  state.requestsPerMinute = currentRPM;

  if (currentRPM > state.rateLimit) {
    state.status = "degraded";
    addLog("WARN", `Rate limit exceeded: ${currentRPM} req/min (limit: ${state.rateLimit}) from ${ip}`);
    return Response.json(
      { error: "Too Many Requests", requestsPerMinute: currentRPM, rateLimit: state.rateLimit },
      { status: 429 }
    );
  }

  // Normal request
  addLog("INFO", `Request from ${ip} — ${request.method} ${new URL(request.url).pathname}`);
  return null;
}

module.exports = { checkRequest, getClientIP };
