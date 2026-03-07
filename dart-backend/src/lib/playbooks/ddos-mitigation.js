/**
 * ddos-mitigation.js — Playbook
 *
 * Triggered on high-volume flood attacks confirmed by enrichment.
 *
 * Steps:
 *   1. Block the offending IP via dummy-server admin endpoint
 *   2. Set an aggressive rate limit (cap: 10 req/min)
 *   3. Restart the dummy-server to restore service state
 *
 * Returns a PlaybookResult object (schema in CONTEXT.md).
 */

const DUMMY_SERVER_URL =
  process.env.DUMMY_SERVER_URL || "http://localhost:3002";

/**
 * Execute the DDoS mitigation playbook.
 * @param {object} alert - The StandardAlert triggering this playbook.
 * @returns {object} PlaybookResult
 */
async function execute(alert) {
  const stepsExecuted = [];
  let success = true;
  const notes = [];

  try {
    // Step 1: Block the offending IP
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
    // Step 2: Set aggressive rate limit (cap: 10 req/min)
    const rateRes = await fetch(
      `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cap: 10 }),
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

  try {
    // Step 3: Restart the server to restore service state
    const restartRes = await fetch(`${DUMMY_SERVER_URL}/api/admin/restart`, {
      method: "POST",
    });
    stepsExecuted.push("restart");
    if (!restartRes.ok) {
      notes.push(`restart returned status ${restartRes.status}`);
    }
  } catch (err) {
    stepsExecuted.push("restart");
    notes.push(`restart failed: ${err.message}`);
    success = false;
  }

  return {
    playbook_id: "ddos-mitigation",
    steps_executed: stepsExecuted,
    success,
    restored_at: new Date().toISOString(),
    notes: notes.length > 0 ? notes.join("; ") : "All steps completed successfully.",
  };
}

module.exports = { execute };
