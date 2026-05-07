/**
 * bruteForceDetector.js — Dummy Server
 *
 * Simulates brute force login attempts against the server.
 * Tracks failed login attempts per IP and fires an alert to
 * DART Backend when the threshold is exceeded.
 *
 * For demo purposes, this generates simulated brute force events
 * using known-bad IPs at a regular interval.
 */

import { state, addLog } from "./state";

const DART_BACKEND_URL =
  process.env.DART_BACKEND_URL || "http://localhost:3001";

// Known attacker IPs that simulate brute force attempts
const BRUTE_FORCE_IPS = [
  "45.33.32.156",
  "91.240.118.172",
  "185.56.83.83",
];

// Track which IPs have already been alerted (dedup)
const alertedIPs = new Set();

let detectorStarted = false;
let attemptCounter = 0;

/**
 * Simulate brute force login activity and fire alerts.
 * Runs every 30 seconds. Generates 1 event per cycle for demo.
 */
export function startBruteForceDetector() {
  if (detectorStarted) return;
  detectorStarted = true;

  console.log(`[bruteForceDetector] Started (30s interval). DART backend: ${DART_BACKEND_URL}`);

  setInterval(async () => {
    try {
      // Pick an attacker IP (rotate through the list)
      const attackerIP = BRUTE_FORCE_IPS[attemptCounter % BRUTE_FORCE_IPS.length];
      attemptCounter++;

      // Skip if already alerted for this IP
      if (alertedIPs.has(attackerIP)) return;

      // Simulate failed login attempts (between 15-50)
      const failedAttempts = 15 + Math.floor(Math.random() * 35);
      const targetAccounts = ["admin", "root", "user", "test", "administrator"];
      const attemptedUsers = targetAccounts.slice(0, 2 + Math.floor(Math.random() * 3));

      const alertPayload = {
        source_ip: attackerIP,
        alert_type: "brute_force",
        failed_attempts: failedAttempts,
        time_window_seconds: 60,
        targeted_accounts: attemptedUsers,
        anomaly_detected: true,
        raw_logs: [
          `[ERROR] Failed login for 'admin' from ${attackerIP}`,
          `[ERROR] Failed login for 'root' from ${attackerIP}`,
          `[ERROR] ${failedAttempts} failed attempts in 60 seconds from ${attackerIP}`,
          `[WARN] Possible brute force attack detected`,
        ],
      };

      addLog("ERROR", `Brute force detected — ${failedAttempts} failed logins from ${attackerIP}`);
      console.log(`[bruteForceDetector] ${failedAttempts} failed logins from ${attackerIP} — sending alert...`);

      const res = await fetch(`${DART_BACKEND_URL}/api/alerts/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertPayload),
      });

      if (res.ok) {
        alertedIPs.add(attackerIP);
        addLog("INFO", `Brute force alert sent to DART — source: ${attackerIP}`);
        console.log(`[bruteForceDetector] Alert sent (source: ${attackerIP})`);
      }
    } catch (err) {
      console.error("[bruteForceDetector] Error:", err.message);
    }
  }, 30_000);
}
