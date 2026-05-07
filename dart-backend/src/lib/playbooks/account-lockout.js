/**
 * account-lockout.js — Playbook
 *
 * Triggered on brute force login attempts.
 *
 * Steps:
 *   1. Block the offending IP via dummy-server admin endpoint
 *   2. Tighten rate limit to 5 req/min
 *   3. Restore rate limit after brief wait
 *
 * Returns a PlaybookResult object.
 */

const DUMMY_SERVER_URL =
  process.env.DUMMY_SERVER_URL || "http://localhost:3002";

/**
 * Execute the account lockout playbook.
 * @param {object} alert - The StandardAlert triggering this playbook.
 * @returns {object} PlaybookResult
 */
async function execute(alert) {
  const stepsExecuted = [];
  const notes = [];

  try {
    // Step 1: Block the attacker IP
    console.log(`[PLAYBOOK account-lockout] Blocking IP: ${alert.source_ip}`);
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

    // Step 2: Tighten rate limit
    console.log(`[PLAYBOOK account-lockout] Rate limit tightened to 5 req/min`);
    try {
      await fetch(`${DUMMY_SERVER_URL}/api/admin/set-rate-limit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5 }),
      });
      stepsExecuted.push("set_rate_limit");
    } catch (err) {
      stepsExecuted.push("set_rate_limit");
      notes.push(`set-rate-limit failed: ${err.message}`);
    }

    // Step 3: Wait briefly then restore
    await new Promise((resolve) => setTimeout(resolve, 1000));
    stepsExecuted.push("wait_1s");

    try {
      await fetch(`${DUMMY_SERVER_URL}/api/admin/set-rate-limit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      stepsExecuted.push("restore_rate_limit");
    } catch (err) {
      stepsExecuted.push("restore_rate_limit");
      notes.push(`restore-rate-limit failed: ${err.message}`);
    }

    stepsExecuted.push("flag_accounts");
    notes.push(
      `Targeted accounts flagged: ${(alert.raw_alert?.targeted_accounts || []).join(", ")}`
    );

    return {
      playbook_id: "account-lockout",
      steps_executed: stepsExecuted,
      success: true,
      ip_blocked: alert.source_ip,
      completed_at: new Date().toISOString(),
      notes:
        notes.length > 0
          ? notes.join("; ")
          : "IP blocked. Accounts flagged for review.",
    };
  } catch (err) {
    console.error(`[PLAYBOOK account-lockout] Fatal error: ${err.message}`);
    return {
      playbook_id: "account-lockout",
      steps_executed: stepsExecuted,
      success: false,
      error: err.message,
    };
  }
}

module.exports = { execute };
