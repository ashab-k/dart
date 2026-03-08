/**
 * decisionTree.js — DART Backend
 *
 * Pure function that takes a normalized StandardAlert and returns
 * the appropriate playbook ID string.
 *
 * Decision tree (from CONTEXT.md §6):
 *
 *   IF request_rate > 500
 *     AND (abuseScore > 50 OR greynoise == "malicious")
 *       → "ddos-mitigation"
 *
 *   ELSE IF abuseScore > 30
 *     AND greynoise == "malicious"
 *       → "ip-block"
 *
 *   ELSE IF request_rate > 200
 *     AND anomaly_detected == true
 *       → "rate-limit-escalation"
 *
 *   ELSE → null (log and monitor only)
 */

/**
 * Select the appropriate playbook for a given alert.
 * @param {object} alert - A normalized StandardAlert object.
 * @returns {string|null} Playbook ID or null for "log and monitor".
 */
function selectPlaybook(alert) {
  const requestRate = alert.raw_alert?.request_rate || 0;
  const anomalyDetected = alert.raw_alert?.anomaly_detected || false;
  const abuseScore = alert.enrichment?.abuseipdb?.abuseConfidenceScore || 0;
  const gnClassification = alert.enrichment?.greynoise?.classification || "unknown";

  // Branch 0: Malicious file upload
  if (alert.alert_type === "malicious_upload") {
    const vtFile = alert.enrichment?.virustotal_file || {};
    if (
      vtFile.detection_rate > 50 ||
      vtFile.malicious > 10 ||
      alert.eicar_detected
    ) {
      return "file-quarantine";
    }
    if (vtFile.malicious > 0 || vtFile.suspicious > 5) {
      return "file-quarantine";
    }
    // Clean file — log and monitor only
    return null;
  }

  // Branch 1: High-volume flood confirmed by enrichment
  if (requestRate > 500 && (abuseScore > 50 || gnClassification === "malicious")) {
    return "ddos-mitigation";
  }

  // Branch 2: Known malicious IP, moderate traffic
  if (abuseScore > 30 && gnClassification === "malicious") {
    return "ip-block";
  }

  // Branch 3: Anomalous traffic, not confirmed malicious
  if (requestRate > 200 && anomalyDetected === true) {
    return "rate-limit-escalation";
  }

  // Branch 4: No immediate action — log and monitor
  return null;
}

module.exports = { selectPlaybook };
