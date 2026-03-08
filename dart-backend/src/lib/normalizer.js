/**
 * normalizer.js — DART Backend
 *
 * Takes a raw alert payload and enrichment results, then produces a
 * complete StandardAlert object as defined in CONTEXT.md.
 *
 * Risk score (0-100) is calculated using a weighted formula:
 *   - request_rate contribution: min(rate/10, 40)
 *   - abuseipdb score contribution: abuseConfidenceScore * 0.3
 *   - greynoise malicious flag: +20 if classification == "malicious"
 *   - virustotal malicious votes: min(malicious * 5, 10)
 */

const crypto = require("crypto");

/**
 * Calculate a risk score from 0-100 based on multiple enrichment factors.
 * Returns { risk_score, risk_reasoning }.
 */
function calculateRisk(rawAlert, enrichment) {
  // ── Malicious upload scoring ──
  if (rawAlert.alert_type === "malicious_upload") {
    const vtFile = enrichment.virustotal_file || {};
    const detectionRate = vtFile.detection_rate || 0;
    const maliciousVotes = vtFile.malicious || 0;

    // Clean files start low, flagged files start at 30
    let score = maliciousVotes > 0 ? 30 : 5;
    score += Math.round(detectionRate * 0.6);
    score += Math.round(
      (enrichment.abuseipdb?.abuseConfidenceScore || 0) * 0.2
    );
    if (enrichment.greynoise?.classification === "malicious") {
      score += 10;
    }

    const risk_score = Math.min(score, 100);
    const verdict = maliciousVotes > 0 ? "MALICIOUS" : "CLEAN";
    const risk_reasoning =
      `File upload analysis: ${rawAlert.file_name || "unknown"} — ${verdict}. ` +
      `VirusTotal: ${maliciousVotes} engines flagged as malicious ` +
      `(${detectionRate}% detection rate). ` +
      `File hash: ${rawAlert.sha256?.substring(0, 16) || "N/A"}... ` +
      `Source IP AbuseIPDB score: ` +
      `${enrichment.abuseipdb?.abuseConfidenceScore || 0}/100.`;

    return { risk_score, risk_reasoning };
  }

  // ── Log4Shell scoring ──
  if (rawAlert.alert_type === "log4shell_attempt") {
    // Base score is 70 — Log4Shell is always critical
    let score = 70;

    // CVSS 10.0 — add 15 points for confirmed CVE
    score += 15;

    // GreyNoise Log4Shell scanner tag adds 10
    const gnTags = enrichment.greynoise?.tags || [];
    const hasLog4ShellTag = gnTags.some((t) =>
      t.toLowerCase().includes("log4") ||
      t.toLowerCase().includes("jndi") ||
      t.toLowerCase().includes("exploit")
    );

    if (hasLog4ShellTag) {
      score += 10;
    } else if (enrichment.greynoise?.classification === "malicious") {
      score += 5;
    }

    // AbuseIPDB contribution capped at 5 points
    score += Math.min(
      (enrichment.abuseipdb?.abuseConfidenceScore || 0) * 0.05,
      5
    );

    const risk_score = Math.min(Math.round(score), 100);

    const gnTagList = gnTags.length > 0 ? gnTags.join(", ") : "no tags";

    const risk_reasoning =
      `Log4Shell exploitation attempt detected ` +
      `(CVE-2021-44228, CVSS 10.0). ` +
      `Malicious JNDI payload found in HTTP headers: ` +
      `${rawAlert.matched_headers?.[0]?.header || "unknown"}. ` +
      `JNDI callback URL: ${rawAlert.jndi_url || "unknown"}. ` +
      `GreyNoise: ${enrichment.greynoise?.classification || "unknown"} ` +
      `[${gnTagList}]. ` +
      `AbuseIPDB: ${enrichment.abuseipdb?.abuseConfidenceScore || 0}/100.`;

    return { risk_score, risk_reasoning };
  }

  // ── Standard DDoS / anomaly scoring ──
  const rate = rawAlert.request_rate || 0;
  const abuseScore = enrichment.abuseipdb?.abuseConfidenceScore || 0;
  const gnClassification = enrichment.greynoise?.classification || "unknown";
  const vtMalicious = enrichment.virustotal?.malicious || 0;

  // Weighted scoring
  const rateContribution = Math.min(rate / 10, 40);
  const abuseContribution = abuseScore * 0.3;
  const greynoiseContribution = gnClassification === "malicious" ? 20 : 0;
  const vtContribution = Math.min(vtMalicious * 5, 10);

  const risk_score = Math.min(
    100,
    Math.round(rateContribution + abuseContribution + greynoiseContribution + vtContribution)
  );

  // Build a human-readable explanation
  const parts = [];
  parts.push(`Request rate of ${rate} req/min contributed ${rateContribution.toFixed(1)} points`);
  if (abuseScore > 0) {
    parts.push(`AbuseIPDB confidence score of ${abuseScore} added ${abuseContribution.toFixed(1)} points`);
  }
  if (greynoiseContribution > 0) {
    parts.push(`GreyNoise classified this IP as malicious, adding ${greynoiseContribution} points`);
  }
  if (vtMalicious > 0) {
    parts.push(`VirusTotal reported ${vtMalicious} malicious votes, contributing ${vtContribution.toFixed(1)} points`);
  }

  const risk_reasoning = `Risk score is ${risk_score}/100. ${parts.join(". ")}.`;

  return { risk_score, risk_reasoning };
}

/**
 * Determine severity level from risk score.
 */
function severityFromScore(score) {
  if (score >= 85) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Normalize a raw alert + enrichment data into a StandardAlert object.
 */
function normalize(rawAlert, enrichment) {
  const { risk_score, risk_reasoning } = calculateRisk(rawAlert, enrichment);

  const standardAlert = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    source_ip: rawAlert.source_ip,
    enriched_ip: enrichment.enrichedIP || rawAlert.source_ip,
    alert_type: rawAlert.alert_type || "anomaly",
    severity: severityFromScore(risk_score),
    raw_alert: rawAlert,
    enrichment,
    risk_score,
    risk_reasoning,
    selected_playbook: null,       // filled by decision tree
    playbook_status: "pending",    // updated by executor
    playbook_result: null,         // updated by executor
    analyst_feedback: null,
  };

  // Add file-specific fields for malicious_upload alerts
  if (rawAlert.alert_type === "malicious_upload") {
    standardAlert.file_name = rawAlert.file_name || null;
    standardAlert.file_size = rawAlert.file_size || 0;
    standardAlert.sha256 = rawAlert.sha256 || null;
    standardAlert.eicar_detected = rawAlert.eicar_detected || false;
    standardAlert.upload_id = rawAlert.upload_id || null;
  }

  // Add Log4Shell-specific fields
  if (rawAlert.alert_type === "log4shell_attempt") {
    standardAlert.cve_id = rawAlert.cve_id;
    standardAlert.cvss_score = rawAlert.cvss_score;
    standardAlert.jndi_url = rawAlert.jndi_url;
    standardAlert.matched_headers = rawAlert.matched_headers;
    standardAlert.match_count = rawAlert.match_count;
  }

  return standardAlert;
}

module.exports = { normalize };
