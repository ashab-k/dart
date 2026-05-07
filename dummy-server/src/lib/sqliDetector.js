/**
 * sqliDetector.js — Dummy Server
 *
 * Simulates SQL injection attack detection against the server.
 * Fires alerts to DART Backend when SQLi patterns are found
 * in simulated request payloads.
 *
 * For demo purposes, this generates simulated SQLi events
 * using known-bad IPs at a regular interval.
 */

import { state, addLog } from "./state";

const DART_BACKEND_URL =
  process.env.DART_BACKEND_URL || "http://localhost:3001";

// Known attacker IPs that simulate SQL injection attempts
const SQLI_IPS = [
  "103.75.201.2",
  "195.54.160.149",
  "45.148.10.240",
];

// Example SQLi payloads for realistic demo
const SQLI_PAYLOADS = [
  "' OR '1'='1' --",
  "' UNION SELECT username, password FROM users --",
  "'; DROP TABLE users; --",
  "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a) --",
  "admin'--",
];

const SQLI_ENDPOINTS = [
  "/api/login",
  "/api/search?q=",
  "/api/users?id=",
  "/api/data?filter=",
];

// Track which IPs have already been alerted (dedup)
const alertedIPs = new Set();

let detectorStarted = false;
let attemptCounter = 0;

/**
 * Simulate SQL injection detection and fire alerts.
 * Runs every 35 seconds. Generates 1 event per cycle for demo.
 */
export function startSQLiDetector() {
  if (detectorStarted) return;
  detectorStarted = true;

  console.log(`[sqliDetector] Started (35s interval). DART backend: ${DART_BACKEND_URL}`);

  setInterval(async () => {
    try {
      const attackerIP = SQLI_IPS[attemptCounter % SQLI_IPS.length];
      attemptCounter++;

      // Skip if already alerted for this IP
      if (alertedIPs.has(attackerIP)) return;

      const payload = SQLI_PAYLOADS[Math.floor(Math.random() * SQLI_PAYLOADS.length)];
      const endpoint = SQLI_ENDPOINTS[Math.floor(Math.random() * SQLI_ENDPOINTS.length)];
      const matchCount = 1 + Math.floor(Math.random() * 3);

      const alertPayload = {
        source_ip: attackerIP,
        alert_type: "sql_injection",
        sqli_payload: payload,
        target_endpoint: endpoint,
        match_count: matchCount,
        anomaly_detected: true,
        raw_logs: [
          `[WAF] SQL injection pattern detected in request to ${endpoint}`,
          `[WAF] Payload: ${payload}`,
          `[WAF] Source IP: ${attackerIP}`,
          `[ERROR] ${matchCount} SQLi pattern(s) matched in request body`,
        ],
      };

      addLog("ERROR", `SQL injection detected from ${attackerIP} on ${endpoint}`);
      console.log(`[sqliDetector] SQLi from ${attackerIP} on ${endpoint} — sending alert...`);

      const res = await fetch(`${DART_BACKEND_URL}/api/alerts/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertPayload),
      });

      if (res.ok) {
        alertedIPs.add(attackerIP);
        addLog("INFO", `SQLi alert sent to DART — source: ${attackerIP}`);
        console.log(`[sqliDetector] Alert sent (source: ${attackerIP})`);
      }
    } catch (err) {
      console.error("[sqliDetector] Error:", err.message);
    }
  }, 35_000);
}
