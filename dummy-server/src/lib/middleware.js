/**
 * middleware.js — Dummy Server
 *
 * Request tracking, IP blocking, and rate limiting logic.
 * Uses a module-level rolling window counter that resets every 60s.
 */

import { state, addLog, addSourceIP } from "./state";

// ----- Rolling window counter -----
let windowStart = Date.now();
let windowCount = 0;

// Reset the window counter every 60 seconds
setInterval(() => {
  state.requestsPerMinute = windowCount;
  windowCount = 0;
  windowStart = Date.now();
}, 60_000);

// Update requestsPerMinute more frequently for real-time display
setInterval(() => {
  const elapsed = (Date.now() - windowStart) / 1000;
  if (elapsed > 0) {
    state.requestsPerMinute = Math.round((windowCount / elapsed) * 60);
  }
}, 5_000);

/**
 * Extract client IP from request headers.
 */
export function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check an incoming request against blockedIPs and rateLimit.
 * @returns {Response|null} — A 403/429 Response if blocked/limited, or null if OK
 */
export function checkRequest(request) {
  const ip = getClientIP(request);

  // Check blocked IPs
  if (state.blockedIPs.includes(ip)) {
    addLog("ERROR", `Blocked request from banned IP: ${ip}`);
    return Response.json(
      { error: "Forbidden — IP is blocked", ip },
      { status: 403 }
    );
  }

  // Increment counter and track source IP
  windowCount++;
  state.totalRequests++;
  addSourceIP(ip);

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
