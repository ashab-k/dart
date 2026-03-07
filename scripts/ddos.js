#!/usr/bin/env node

/**
 * ddos.js — DDoS Attack Simulator
 *
 * Fires sustained HTTP requests with spoofed X-Forwarded-For headers
 * containing known-malicious IPs. This produces real enrichment data
 * from threat intelligence APIs.
 *
 * Usage: node scripts/ddos.js
 *
 * Configuration (top of file or via env vars):
 *   TARGET_URL           — URL to attack (default: http://localhost:3002/api/data)
 *   REQUESTS_PER_SECOND  — Requests per tick (default: 10)
 *   DURATION_SECONDS     — How long to run (default: 180 = 3 minutes)
 */

// ----- Configuration -----
const TARGET_URL =
  process.env.TARGET_URL || "http://localhost:3002/api/data";
const REQUESTS_PER_SECOND = 10;
const DURATION_SECONDS =
  parseInt(process.env.DURATION_SECONDS, 10) || 180;

// ----- Known-malicious IPs for spoofing -----
const SPOOF_IPS = [
  "185.220.101.34",
  "45.142.212.100",
  "89.248.167.131",
  "198.235.24.130",
  "80.82.77.139",
];

function randomSpoofIP() {
  return SPOOF_IPS[Math.floor(Math.random() * SPOOF_IPS.length)];
}

// ----- Stats -----
let totalSent = 0;
let totalSuccess = 0;
let total429 = 0;
let total403 = 0;
let totalError = 0;
let tickNumber = 0;
let first429Logged = false;
let first403Logged = false;

console.log("═".repeat(60));
console.log("  DART DDoS Attack Simulator");
console.log("═".repeat(60));
console.log(`  Target:     ${TARGET_URL}`);
console.log(`  Rate:       ${REQUESTS_PER_SECOND} req/sec`);
console.log(`  Duration:   ${DURATION_SECONDS}s (${(DURATION_SECONDS / 60).toFixed(1)} min)`);
console.log(`  Spoof IPs:  ${SPOOF_IPS.join(", ")}`);
console.log("═".repeat(60));
console.log("");

const startTime = Date.now();

/**
 * Send a single request with a spoofed IP header.
 */
async function sendRequest() {
  const ip = randomSpoofIP();
  try {
    const res = await fetch(TARGET_URL, {
      method: "GET",
      headers: {
        "X-Forwarded-For": ip,
        "X-Real-IP": ip,
        "User-Agent": "Mozilla/5.0 (compatible; flood/1.0)",
      },
      signal: AbortSignal.timeout(3000),
    });
    return { success: true, status: res.status, ip };
  } catch (err) {
    return { success: false, error: err.message, ip };
  }
}

/**
 * Main loop — fires REQUESTS_PER_SECOND requests every 1 second.
 */
async function main() {
  console.log("  Attack started!\n");

  const interval = setInterval(async () => {
    tickNumber++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

    // Check if duration exceeded
    if (Date.now() - startTime >= DURATION_SECONDS * 1000) {
      clearInterval(interval);
      printSummary();
      return;
    }

    // Fire REQUESTS_PER_SECOND requests in parallel
    const results = await Promise.all(
      Array.from({ length: REQUESTS_PER_SECOND }, sendRequest)
    );

    // Tally results
    for (const r of results) {
      totalSent++;
      if (!r.success) {
        totalError++;
      } else if (r.status === 429) {
        total429++;
      } else if (r.status === 403) {
        total403++;
      } else if (r.status >= 200 && r.status < 300) {
        totalSuccess++;
      }
    }

    // Log progress
    const pct200 = totalSent > 0 ? ((totalSuccess / totalSent) * 100).toFixed(0) : 0;
    const pct429 = totalSent > 0 ? ((total429 / totalSent) * 100).toFixed(0) : 0;
    const pct403 = totalSent > 0 ? ((total403 / totalSent) * 100).toFixed(0) : 0;

    console.log(
      `[DDOS] t=${elapsed}s | sent=${totalSent} | ` +
      `200=${totalSuccess} | 429=${total429} | ` +
      `403=${total403} | err=${totalError}`
    );

    // First-time status messages
    if (total429 > 0 && !first429Logged) {
      first429Logged = true;
      console.log(
        "\n[DDOS] ⚠ Rate limiting active — DART mitigation may be working\n"
      );
    }

    if (total403 > 0 && !first403Logged) {
      first403Logged = true;
      console.log(
        "\n[DDOS] ✓ IP blocked — DART ddos-mitigation playbook succeeded\n"
      );
    }
  }, 1000);
}

function printSummary() {
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const pct = (n) =>
    totalSent > 0 ? ((n / totalSent) * 100).toFixed(1) : "0.0";

  console.log("");
  console.log("═".repeat(60));
  console.log("  ATTACK COMPLETE");
  console.log("═".repeat(60));
  console.log(`  Duration:     ${totalTime}s`);
  console.log(`  Total sent:   ${totalSent}`);
  console.log(`  200 OK:       ${totalSuccess} (${pct(totalSuccess)}%)`);
  console.log(`  429 Limited:  ${total429} (${pct(total429)}%)`);
  console.log(`  403 Blocked:  ${total403} (${pct(total403)}%)`);
  console.log(`  Errors:       ${totalError} (${pct(totalError)}%)`);
  console.log("═".repeat(60));
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
