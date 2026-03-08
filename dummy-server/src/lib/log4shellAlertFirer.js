import { state, addLog } from "./state.js"

let firedIPs = new Set()

export async function fireLog4ShellAlert(
  sourceIP,
  detectionResult,
  jndiUrl
) {
  if (firedIPs.has(sourceIP)) return
  firedIPs.add(sourceIP)

  const DART_BACKEND_URL = process.env.DART_BACKEND_URL ||
    "http://localhost:3001"

  const payload = {
    source_ip: sourceIP,
    alert_type: "log4shell_attempt",
    request_rate: state.requestsPerMinute,
    anomaly_detected: true,
    cve_id: "CVE-2021-44228",
    cvss_score: 10.0,
    jndi_url: jndiUrl,
    matched_headers: detectionResult.matches,
    match_count: detectionResult.match_count,
    attempt_count: state.log4shellAttemptsByIP[sourceIP],
    raw_logs: state.logs.slice(-20)
  }

  try {
    addLog("ERROR",
      `CRITICAL: Firing Log4Shell alert to DART for IP: ${sourceIP} jndi_url: ${jndiUrl}`
    )
    await fetch(
      `${DART_BACKEND_URL}/api/alerts/ingest`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    )
  } catch (err) {
    addLog("ERROR",
      `Failed to send Log4Shell alert: ${err.message}`
    )
  }

  // Reset after 2 minutes
  setTimeout(() => {
    firedIPs.delete(sourceIP)
    state.log4shellAttemptsByIP[sourceIP] = 0
  }, 120000)
}
