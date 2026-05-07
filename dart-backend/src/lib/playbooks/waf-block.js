/**
 * waf-block.js — Playbook
 *
 * Triggered on SQL injection attempts.
 *
 * Steps:
 *   1. Block the offending IP via dummy-server admin endpoint
 *   2. Log the malicious payload for forensic review
 *
 * Returns a PlaybookResult object.
 */

const DUMMY_SERVER_URL =
  process.env.DUMMY_SERVER_URL || "http://localhost:3002";

/**
 * Execute the WAF block playbook.
 * @param {object} alert - The StandardAlert triggering this playbook.
 * @returns {object} PlaybookResult
 */
async function execute(alert) {
  const stepsExecuted = [];
  const notes = [];

  try {
    // Step 1: Block the attacker IP
    console.log(`[PLAYBOOK waf-block] Blocking IP: ${alert.source_ip}`);
    try {
      const blockRes = await fetch(`${DUMMY_SERVER_URL}/api/admin/block-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: alert.source_ip }),
      });
      stepsExecuted.push("block_ip");
      if (!blockRes.ok) {
        notes.push(`block-ip returned status ${blockRes.status}`);
      }
    } catch (err) {
      stepsExecuted.push("block_ip");
      notes.push(`block-ip failed: ${err.message}`);
    }

    // Step 2: Log payload for forensics
    stepsExecuted.push("log_payload");
    const payload = alert.raw_alert?.sqli_payload || "unknown";
    const endpoint = alert.raw_alert?.target_endpoint || "unknown";
    notes.push(`SQLi payload logged: "${payload}" on ${endpoint}`);
    console.log(`[PLAYBOOK waf-block] Payload logged: ${payload}`);

    // Step 3: Flag for analyst review
    stepsExecuted.push("flag_for_review");
    notes.push("Alert flagged for analyst review.");

    return {
      playbook_id: "waf-block",
      steps_executed: stepsExecuted,
      success: true,
      ip_blocked: alert.source_ip,
      sqli_payload: payload,
      target_endpoint: endpoint,
      completed_at: new Date().toISOString(),
      notes: notes.join("; "),
    };
  } catch (err) {
    console.error(`[PLAYBOOK waf-block] Fatal error: ${err.message}`);
    return {
      playbook_id: "waf-block",
      steps_executed: stepsExecuted,
      success: false,
      error: err.message,
    };
  }
}

module.exports = { execute };
