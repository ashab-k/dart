/**
 * ddos-mitigation.js — Playbook
 *
 * Triggered on high-volume flood attacks confirmed by enrichment.
 *
 * Steps:
 *   A. Block the offending IP
 *   B. Tighten rate limit to 10 req/min
 *   C. Wait 5 seconds
 *   D. Restore rate limit to 100 req/min
 *   E. Call restart to reset server state
 *   F. Schedule IP unblock after 30 seconds (fire-and-forget)
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
  const notes = [];

  try {
    // ── Step A: Block the attacker IP ─────────────────────────
    console.log(
      `[PLAYBOOK ddos-mitigation] Blocking IP: ${alert.source_ip}`
    );
    try {
      const blockRes = await fetch(
        `${DUMMY_SERVER_URL}/api/admin/block-ip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip: alert.source_ip }),
        }
      );
      stepsExecuted.push("block_ip");
      if (!blockRes.ok) {
        notes.push(`block-ip returned status ${blockRes.status}`);
      }
    } catch (err) {
      stepsExecuted.push("block_ip");
      notes.push(`block-ip failed: ${err.message}`);
      console.error(
        `[PLAYBOOK ddos-mitigation] block-ip error: ${err.message}`
      );
    }

    // ── Step B: Tighten rate limit to 10 req/min ──────────────
    console.log(
      `[PLAYBOOK ddos-mitigation] Rate limit tightened to 10 req/min`
    );
    try {
      const rateRes = await fetch(
        `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 10 }),
        }
      );
      stepsExecuted.push("tighten_rate_limit");
      if (!rateRes.ok) {
        notes.push(`set-rate-limit (tighten) returned status ${rateRes.status}`);
      }
    } catch (err) {
      stepsExecuted.push("tighten_rate_limit");
      notes.push(`set-rate-limit (tighten) failed: ${err.message}`);
      console.error(
        `[PLAYBOOK ddos-mitigation] tighten rate limit error: ${err.message}`
      );
    }

    // ── Step C: Wait 5 seconds ────────────────────────────────
    console.log(
      `[PLAYBOOK ddos-mitigation] Waiting 5s before restore...`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    stepsExecuted.push("wait_5s");

    // ── Step D: Restore rate limit to 100 req/min ─────────────
    console.log(
      `[PLAYBOOK ddos-mitigation] Rate limit restored to 100 req/min`
    );
    try {
      const restoreRes = await fetch(
        `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 100 }),
        }
      );
      stepsExecuted.push("restore_rate_limit");
      if (!restoreRes.ok) {
        notes.push(
          `set-rate-limit (restore) returned status ${restoreRes.status}`
        );
      }
    } catch (err) {
      stepsExecuted.push("restore_rate_limit");
      notes.push(`set-rate-limit (restore) failed: ${err.message}`);
      console.error(
        `[PLAYBOOK ddos-mitigation] restore rate limit error: ${err.message}`
      );
    }

    // ── Step E: Call restart to reset server state ─────────────
    console.log(`[PLAYBOOK ddos-mitigation] Server restart called.`);
    try {
      const restartRes = await fetch(
        `${DUMMY_SERVER_URL}/api/admin/restart`,
        { method: "POST" }
      );
      stepsExecuted.push("restart_server");
      if (!restartRes.ok) {
        notes.push(`restart returned status ${restartRes.status}`);
      }
    } catch (err) {
      stepsExecuted.push("restart_server");
      notes.push(`restart failed: ${err.message}`);
      console.error(
        `[PLAYBOOK ddos-mitigation] restart error: ${err.message}`
      );
    }

    // ── Step F: Schedule IP unblock after 30 seconds ──────────
    stepsExecuted.push("schedule_ip_unblock_30s");
    setTimeout(async () => {
      try {
        await fetch(`${DUMMY_SERVER_URL}/api/admin/unblock-ip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip: alert.source_ip }),
        });
        console.log(
          `[PLAYBOOK ddos-mitigation] IP ${alert.source_ip} unblocked after 30s`
        );
      } catch (err) {
        console.error(
          `[PLAYBOOK ddos-mitigation] unblock-ip error: ${err.message}`
        );
      }
    }, 30000);

    return {
      playbook_id: "ddos-mitigation",
      steps_executed: stepsExecuted,
      success: true,
      ip_blocked: alert.source_ip,
      rate_limit_tightened_to: 10,
      rate_limit_restored_to: 100,
      restored_at: new Date().toISOString(),
      notes:
        notes.length > 0
          ? notes.join("; ")
          : "IP blocked, rate limit tightened then restored. IP will be unblocked in 30 seconds.",
    };
  } catch (err) {
    console.error(
      `[PLAYBOOK ddos-mitigation] Fatal error: ${err.message}`
    );
    return {
      playbook_id: "ddos-mitigation",
      steps_executed: stepsExecuted,
      success: false,
      error: err.message,
    };
  }
}

module.exports = { execute };
