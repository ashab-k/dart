/**
 * POST /api/alerts/ingest — DART Backend
 *
 * Accepts a raw alert payload and runs the full processing pipeline:
 *   1. Enrich the source IP (GreyNoise, AbuseIPDB, GeoIP, VirusTotal)
 *   2. Normalize into a StandardAlert with risk scoring
 *   3. Run decision tree to select appropriate playbook
 *   4. Execute the selected playbook
 *   5. Store the completed alert to alerts.json
 *   6. Broadcast via SSE to connected clients
 *   7. Return the completed StandardAlert object
 */

import { enrichAll } from "@/lib/enrichment";
import { normalize } from "@/lib/normalizer";
import { selectPlaybook } from "@/lib/decisionTree";
import { appendAlert } from "@/lib/store";
import { broadcastAlert } from "@/lib/sseManager";

// Dynamic import map for playbook executors
const playbookModules = {
  "ddos-mitigation": () => import("@/lib/playbooks/ddos-mitigation"),
  "ip-block": () => import("@/lib/playbooks/ip-block"),
  "rate-limit-escalation": () =>
    import("@/lib/playbooks/rate-limit-escalation"),
};

export async function POST(request) {
  try {
    const rawAlert = await request.json();

    // Validate required fields
    if (!rawAlert.source_ip) {
      return Response.json(
        { error: "source_ip is required" },
        { status: 400 }
      );
    }

    console.log(
      `[ingest] Processing alert from ${rawAlert.source_ip} (type: ${rawAlert.alert_type})`
    );

    // Step 1: Enrich the source IP in parallel
    const enrichment = await enrichAll(rawAlert.source_ip);

    // Step 2: Normalize into StandardAlert
    const alert = normalize(rawAlert, enrichment);

    // Step 3: Run decision tree to select playbook
    const playbookId = selectPlaybook(alert);
    alert.selected_playbook = playbookId;

    // Step 4: Execute the selected playbook (if any)
    if (playbookId && playbookModules[playbookId]) {
      alert.playbook_status = "executing";
      try {
        const playbookModule = await playbookModules[playbookId]();
        const result = await playbookModule.execute(alert);
        alert.playbook_result = result;
        alert.playbook_status = result.success ? "completed" : "failed";
      } catch (err) {
        console.error(`[ingest] Playbook ${playbookId} error:`, err.message);
        alert.playbook_status = "failed";
        alert.playbook_result = {
          playbook_id: playbookId,
          steps_executed: [],
          success: false,
          restored_at: new Date().toISOString(),
          notes: `Execution error: ${err.message}`,
        };
      }
    } else {
      // No playbook selected — log and monitor only
      alert.playbook_status = "completed";
      alert.playbook_result = {
        playbook_id: null,
        steps_executed: ["log_and_monitor"],
        success: true,
        restored_at: new Date().toISOString(),
        notes: "No playbook triggered. Alert logged for monitoring.",
      };
    }

    // Step 5: Store the completed alert
    await appendAlert(alert);

    // Step 6: Broadcast via SSE
    broadcastAlert(alert);

    console.log(
      `[ingest] Alert ${alert.id} processed. Playbook: ${playbookId || "none"}, Risk: ${alert.risk_score}`
    );

    // Step 7: Return the completed StandardAlert
    return Response.json(alert, { status: 200 });
  } catch (err) {
    console.error("[ingest] Unexpected error:", err);
    return Response.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
