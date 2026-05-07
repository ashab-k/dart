/**
 * brute-force-attack.js — DART Demo Script
 *
 * Manually triggers a brute force login alert by sending a payload
 * directly to the DART Backend ingest endpoint.
 *
 * Usage: node scripts/brute-force-attack.js [attacker_ip]
 */

const BACKEND_URL = process.env.DART_BACKEND_URL || "http://localhost:3001";

const attackerIP = process.argv[2] || "185.220.101.42"; // Default Tor exit node style IP

const payload = {
  source_ip: attackerIP,
  alert_type: "brute_force",
  failed_attempts: 42,
  time_window_seconds: 60,
  targeted_accounts: ["admin", "root", "devops"],
  anomaly_detected: true,
  raw_logs: [
    `[AUTH] Failed login for 'admin' from ${attackerIP}`,
    `[AUTH] Failed login for 'root' from ${attackerIP}`,
    `[SECURITY] 42 failed login attempts detected from ${attackerIP}`,
    `[ACTION] Threshold exceeded. Alerting SOC.`
  ]
};

async function trigger() {
  console.log(`[*] Sending brute force alert for ${attackerIP} to ${BACKEND_URL}...`);

  try {
    const res = await fetch(`${BACKEND_URL}/api/alerts/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[+] Success! Alert ID: ${data.id}`);
      console.log(`[+] Risk Score: ${data.risk_score}`);
      console.log(`[+] Playbook Triggered: ${data.selected_playbook}`);
    } else {
      const err = await res.text();
      console.error(`[-] Failed to trigger alert: ${res.status} ${err}`);
    }
  } catch (err) {
    console.error(`[-] Connection error: ${err.message}`);
  }
}

trigger();
