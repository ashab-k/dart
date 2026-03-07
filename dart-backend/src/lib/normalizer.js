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

  return {
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
}

module.exports = { normalize };
