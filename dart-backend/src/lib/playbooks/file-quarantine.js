/**
 * file-quarantine.js — Playbook
 *
 * Triggered when a malicious file upload is detected.
 *
 * Steps:
 *   1. Quarantine the file on the dummy server
 *   2. Block the uploading IP
 *
 * The blocked IP stays blocked permanently (no auto-unblock
 * during active attack). File remains quarantined.
 *
 * Returns a PlaybookResult object (schema in CONTEXT.md).
 */

const DUMMY_SERVER_URL =
  process.env.DUMMY_SERVER_URL || "http://localhost:3002";

async function execute(alert) {
  const stepsExecuted = [];

  try {
    console.log(
      `[PLAYBOOK file-quarantine] Starting for file: ${alert.file_name}`
    );

    // ── Step 1: Quarantine the file on dummy server ──────────
    console.log(
      `[PLAYBOOK file-quarantine] Quarantining file: ${alert.sha256}`
    );
    try {
      const vtFile = alert.enrichment?.virustotal_file || {};
      const quarantineRes = await fetch(
        `${DUMMY_SERVER_URL}/api/admin/quarantine-file`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            upload_id: alert.upload_id,
            sha256: alert.sha256,
            reason: `VirusTotal detection rate: ${vtFile.detection_rate || 0}%`,
          }),
        }
      );
      stepsExecuted.push("quarantine_file");
      console.log(
        `[PLAYBOOK file-quarantine] Quarantine response: ${quarantineRes.status}`
      );
    } catch (err) {
      stepsExecuted.push("quarantine_file");
      console.error(
        `[PLAYBOOK file-quarantine] quarantine error: ${err.message}`
      );
    }

    // ── Step 2: Block the uploading IP ───────────────────────
    console.log(
      `[PLAYBOOK file-quarantine] Blocking IP: ${alert.source_ip}`
    );
    try {
      await fetch(`${DUMMY_SERVER_URL}/api/admin/block-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: alert.source_ip }),
      });
      stepsExecuted.push("block_ip");
    } catch (err) {
      stepsExecuted.push("block_ip");
      console.error(
        `[PLAYBOOK file-quarantine] block-ip error: ${err.message}`
      );
    }

    const vtFile = alert.enrichment?.virustotal_file || {};

    return {
      playbook_id: "file-quarantine",
      steps_executed: stepsExecuted,
      success: true,
      file_quarantined: alert.sha256,
      file_name: alert.file_name,
      ip_blocked: alert.source_ip,
      virustotal_summary: {
        malicious: vtFile.malicious || 0,
        suspicious: vtFile.suspicious || 0,
        detection_rate: vtFile.detection_rate || 0,
        total_engines: vtFile.total_engines || 0,
      },
      quarantined_at: new Date().toISOString(),
      notes:
        `File quarantined based on VirusTotal verdict. ` +
        `${vtFile.malicious || 0} of ${vtFile.total_engines || 0} ` +
        `engines flagged as malicious. IP blocked permanently.`,
    };
  } catch (err) {
    console.error(
      `[PLAYBOOK file-quarantine] Error: ${err.message}`
    );
    return {
      playbook_id: "file-quarantine",
      steps_executed: stepsExecuted,
      success: false,
      error: err.message,
    };
  }
}

module.exports = { execute };
