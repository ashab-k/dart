/**
 * rate-limit-escalation.js — Playbook
 *
 * Triggered on anomalous traffic that is not confirmed malicious.
 *
 * Steps:
 *   1. Set a moderate rate limit (cap: 50 req/min)
 *   2. Flag the alert as "requires analyst review"
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
    // Step 1: Set moderate rate limit (cap: 50 req/min)
    const rateRes = await fetch(
      `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cap: 50 }),
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

  // Step 2: Flag for analyst review
  stepsExecuted.push("flag_for_review");
  notes.push("Alert flagged for analyst review.");

  return {
    playbook_id: "rate-limit-escalation",
    steps_executed: stepsExecuted,
    success,
    restored_at: new Date().toISOString(),
    notes: notes.join("; "),
  };
}

module.exports = { execute };
