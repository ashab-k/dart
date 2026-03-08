/**
 * GET /api/virustotal/reports — DART Backend
 *
 * Returns all VirusTotal file analysis data from alerts
 * with alert_type "malicious_upload".
 */

import { getAlerts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = await getAlerts();
  const reports = alerts
    .filter((a) => a.alert_type === "malicious_upload")
    .map((a) => ({
      alert_id: a.id,
      timestamp: a.timestamp,
      source_ip: a.source_ip,
      enriched_ip: a.enriched_ip,
      file_name: a.file_name,
      file_size: a.file_size,
      sha256: a.sha256,
      eicar_detected: a.eicar_detected,
      risk_score: a.risk_score,
      risk_reasoning: a.risk_reasoning,
      playbook_status: a.playbook_status,
      virustotal_file: a.enrichment?.virustotal_file || null,
      playbook_result: a.playbook_result,
      enrichment: {
        greynoise: a.enrichment?.greynoise || null,
        abuseipdb: a.enrichment?.abuseipdb || null,
        geoip: a.enrichment?.geoip || null,
      },
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return Response.json(reports);
}
