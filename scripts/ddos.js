#!/usr/bin/env node

/**
 * ddos.js — DDoS Attack Simulator
 *
 * Plain Node.js script (no framework, no imports beyond native fetch).
 * Fires batches of concurrent HTTP requests to the dummy-server.
 *
 * Usage: node scripts/ddos.js
 *
 * Configuration (top of file or via env vars):
 *   TARGET_URL          — URL to attack (default: http://localhost:3002/api/data)
 *   REQUESTS_PER_BATCH  — Concurrent requests per batch (default: 50)
 *   BATCH_INTERVAL_MS   — Milliseconds between batches (default: 500)
 *   DURATION_SECONDS    — How long to run (default: 60)
 */

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
let batchNumber = 0;

console.log("=".repeat(60));
console.log("  DART DDoS Attack Simulator");
console.log("=".repeat(60));
console.log(`  Target:     ${TARGET_URL}`);
console.log(`  Batch Size: ${REQUESTS_PER_BATCH} requests`);
console.log(`  Interval:   ${BATCH_INTERVAL_MS}ms`);
console.log(`  Duration:   ${DURATION_SECONDS}s`);
console.log("=".repeat(60));
console.log("");

const startTime = Date.now();
const endTime = startTime + DURATION_SECONDS * 1000;

/**
 * Send a single request and classify the result.
 */
async function sendRequest() {
  try {
    const res = await fetch(TARGET_URL);
    if (res.status === 429) {
      total429++;
    } else if (res.ok) {
      totalSuccess++;
    }
  } catch {
    totalErrors++;
  }
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

  await Promise.all(promises);
  totalSent += REQUESTS_PER_BATCH;

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `  Batch ${String(batchNumber).padStart(4)}: sent ${REQUESTS_PER_BATCH} requests | ` +
      `Total: ${totalSent} | OK: ${totalSuccess} | 429: ${total429} | ` +
      `Errors: ${totalErrors} | ${elapsed}s elapsed`
  );
}

/**
 * Main loop — run batches until duration expires.
 */
async function main() {
  console.log("  🚀 Attack started!\n");

  while (Date.now() < endTime) {
    await fireBatch();
    // Wait for the interval before the next batch
    if (Date.now() < endTime) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_INTERVAL_MS));
    }
  }

  // ----- Summary -----
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log("=".repeat(60));
  console.log("  Attack Complete — Summary");
  console.log("=".repeat(60));
  console.log(`  Duration:       ${totalTime}s`);
  console.log(`  Total Requests: ${totalSent}`);
  console.log(`  Successful:     ${totalSuccess}`);
  console.log(`  Rate Limited:   ${total429}`);
  console.log(`  Errors:         ${totalErrors}`);
  console.log(`  Batches:        ${batchNumber}`);
  console.log(`  Avg req/s:      ${(totalSent / parseFloat(totalTime)).toFixed(1)}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
