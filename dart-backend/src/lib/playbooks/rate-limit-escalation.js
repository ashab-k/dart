/**
 * rate-limit-escalation.js — Playbook
 *
 * Triggered on anomalous traffic that is not confirmed malicious.
 *
 * Steps:
 *   1. Block the offending IP to stop the attack immediately
 *   2. Set a moderate rate limit (cap: 50 req/min)
 *   3. Flag the alert as "requires analyst review"
 *
 * Returns a PlaybookResult object (schema in CONTEXT.md).
 */

const DUMMY_SERVER_URL =
  process.env.DUMMY_SERVER_URL || "http://localhost:3002";

/**
 * Execute the rate limit escalation playbook.
 * @param {object} alert - The StandardAlert triggering this playbook.
 * @returns {object} PlaybookResult
 */
async function execute(alert) {
  const stepsExecuted = [];
  let success = true;
  const notes = [];

  try {
    // Step 1: Block the offending IP immediately
    console.log(
      `[PLAYBOOK rate-limit-escalation] Blocking IP: ${alert.source_ip}`
    );
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
    success = false;
  }

  try {
    // Step 2: Set moderate rate limit (cap: 50 req/min)
    const rateRes = await fetch(
      `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      }
    );
    stepsExecuted.push("set_rate_limit");
    if (!rateRes.ok) {
      notes.push(`set-rate-limit returned status ${rateRes.status}`);
    }
  } catch (err) {
    stepsExecuted.push("set_rate_limit");
    notes.push(`set-rate-limit failed: ${err.message}`);
    success = false;
  }

  // Step 3: Flag for analyst review
  stepsExecuted.push("flag_for_review");
  notes.push("Alert flagged for analyst review.");

  return {
    playbook_id: "rate-limit-escalation",
    steps_executed: stepsExecuted,
    success,
    ip_blocked: alert.source_ip,
    restored_at: new Date().toISOString(),
    notes: notes.join("; "),
  };
}

module.exports = { execute };
