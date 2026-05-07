/**
 * sqli-attack.js — DART Demo Script
 *
 * Manually triggers a SQL injection alert by sending a payload
 * directly to the DART Backend ingest endpoint.
 *
 * Usage: node scripts/sqli-attack.js [attacker_ip]
 */

const BACKEND_URL = process.env.DART_BACKEND_URL || "http://localhost:3001";

const attackerIP = process.argv[2] || "89.248.163.153"; // Default scanner IP

const payload = {
  source_ip: attackerIP,
  alert_type: "sql_injection",
  sqli_payload: "' OR '1'='1' --",
  target_endpoint: "/api/login",
  match_count: 3,
  anomaly_detected: true,
  raw_logs: [
    `[WAF] SQL injection pattern detected in POST /api/login`,
    `[WAF] Matched pattern: ' OR '1'='1' --`,
    `[WAF] Source: ${attackerIP}`,
    `[ACTION] Request blocked. Notifying SOC.`
  ]
};

async function trigger() {
  console.log(`[*] Sending SQLi alert for ${attackerIP} to ${BACKEND_URL}...`);

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
