/**
 * ip-block.js — Playbook
 *
 * Triggered when a known malicious IP is detected with moderate traffic.
 *
 * Steps:
 *   1. Block the offending IP via dummy-server admin endpoint
 *
 * Returns a PlaybookResult object (schema in CONTEXT.md).
 */

const DUMMY_SERVER_URL =
  process.env.DUMMY_SERVER_URL || "http://localhost:3002";

/**
 * Execute the IP block playbook.
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

  return {
    playbook_id: "ip-block",
    steps_executed: stepsExecuted,
    success,
    restored_at: new Date().toISOString(),
    notes: notes.length > 0 ? notes.join("; ") : "IP blocked successfully.",
  };
}

module.exports = { execute };
