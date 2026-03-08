const DUMMY_SERVER_URL = process.env.DUMMY_SERVER_URL || "http://localhost:3002";

export async function execute(alert) {
  const stepsExecuted = [];
  const startTime = Date.now();

  try {
    console.log(
      "[PLAYBOOK log4shell-patch-isolate] " +
      "CRITICAL CVE-2021-44228 detected. Starting isolation."
    );

    // STEP A — Block attacking IP immediately
    console.log(
      "[PLAYBOOK log4shell-patch-isolate] " +
      "Blocking attacker IP:", alert.source_ip
    );
    await fetch(`${DUMMY_SERVER_URL}/api/admin/block-ip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: alert.source_ip })
    });
    stepsExecuted.push("block_attacker_ip");

    // STEP B — Tighten rate limit to reduce attack surface
    console.log(
      "[PLAYBOOK log4shell-patch-isolate] " +
      "Tightening rate limit for isolation"
    );
    await fetch(
      `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 })
      }
    );
    stepsExecuted.push("tighten_rate_limit");

    // STEP C — Flag the JNDI endpoint for patching
    console.log(
      "[PLAYBOOK log4shell-patch-isolate] " +
      "Flagging JNDI endpoint"
    );
    await fetch(
      `${DUMMY_SERVER_URL}/api/admin/flag-endpoint`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          param: alert.matched_headers?.[0]?.header || "unknown-header",
          location: "http-header",
          payload: alert.jndi_url || "unknown",
          flagged_at: new Date().toISOString(),
          cve: "CVE-2021-44228"
        })
      }
    );
    stepsExecuted.push("flag_jndi_endpoint");

    // STEP D — Wait 3 seconds (simulate patch application)
    await new Promise(r => setTimeout(r, 3000));
    stepsExecuted.push("simulate_patch_application");

    // STEP E — Restore rate limit
    await fetch(
      `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 })
      }
    );
    stepsExecuted.push("restore_rate_limit");

    // STEP F — Schedule IP unblock after 5 minutes
    setTimeout(async () => {
      await fetch(
        `${DUMMY_SERVER_URL}/api/admin/unblock-ip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip: alert.source_ip })
        }
      );
      console.log(
        "[PLAYBOOK log4shell-patch-isolate] " +
        "IP unblocked after 5min:", alert.source_ip
      );
    }, 300000);
    stepsExecuted.push("schedule_ip_unblock_5min");

    const elapsed = Date.now() - startTime;
    const gnTags = alert.enrichment?.greynoise?.tags || [];

    // Generate the incident report object
    const incidentReport = {
      title: "Log4Shell Exploitation Attempt Detected & Blocked",
      cve_id: "CVE-2021-44228",
      cvss_score: 10.0,
      cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
      severity: "CRITICAL",
      attacker_ip: alert.source_ip,
      enriched_ip: alert.enriched_ip,
      attacker_location:
        `${alert.enrichment?.geoip?.city || 'unknown'}, ` +
        `${alert.enrichment?.geoip?.country || 'unknown'}`,
      attacker_isp: alert.enrichment?.geoip?.isp || "unknown",
      greynoise_classification:
        alert.enrichment?.greynoise?.classification || "unknown",
      greynoise_tags: gnTags,
      abuseipdb_score: alert.enrichment?.abuseipdb?.abuseConfidenceScore || 0,
      abuseipdb_reports: alert.enrichment?.abuseipdb?.totalReports || 0,
      jndi_payload: alert.jndi_url || "unknown",
      matched_headers: alert.matched_headers || [],
      affected_component: "HTTP Header Parser (WAF Layer)",
      attack_description:
        "Attacker injected JNDI lookup string into HTTP " +
        "headers attempting to trigger remote class loading " +
        "via Log4j CVE-2021-44228. Request was intercepted " +
        "by DART WAF layer before reaching application.",
      remediation_applied: [
        "Attacker IP blocked at WAF layer",
        "Rate limit tightened during isolation window",
        "Affected endpoint flagged for security review",
        "Patch simulation applied (Log4j 2.15.0+ equivalent)",
        "IP unblock scheduled for 5 minutes"
      ],
      patch_recommendation:
        "Upgrade Apache Log4j to version 2.17.1 or later. " +
        "Set log4j2.formatMsgNoLookups=true as interim " +
        "mitigation. Review all Java dependencies for " +
        "transitive Log4j usage.",
      response_time_ms: elapsed,
      detected_at: alert.timestamp,
      contained_at: new Date().toISOString()
    };

    return {
      playbook_id: "log4shell-patch-isolate",
      steps_executed: stepsExecuted,
      success: true,
      incident_report: incidentReport,
      ip_blocked: alert.source_ip,
      unblock_scheduled_in: "5 minutes",
      response_time_ms: elapsed,
      notes:
        "CVE-2021-44228 attempt blocked and contained. " +
        "Full incident report generated."
    };

  } catch (err) {
    console.error(
      "[PLAYBOOK log4shell-patch-isolate] Error:",
      err.message
    );
    return {
      playbook_id: "log4shell-patch-isolate",
      steps_executed: stepsExecuted,
      success: false,
      error: err.message
    };
  }
}
