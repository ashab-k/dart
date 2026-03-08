/**
 * POST /api/alerts/ingest — DART Backend
 *
 * Accepts a raw alert payload and runs the full processing pipeline:
 *   1. Parse and validate the incoming alert payload
 *   2. Enrich the source IP (GreyNoise, AbuseIPDB, GeoIP, VirusTotal)
 *   3. Normalize into a StandardAlert with risk scoring
 *   4. Execute the selected playbook
 *   5. Store the completed alert to alerts.json
 *   6. Broadcast via SSE to connected clients
 *   7. Return the completed StandardAlert object
 */

import { enrichAll, fetchVirusTotalFile, resolveEnrichmentIP } from "@/lib/enrichment";
import { normalize } from "@/lib/normalizer";
import { selectPlaybook } from "@/lib/decisionTree";
import { appendAlert } from "@/lib/store";
import { broadcastAlert, getClientCount } from "@/lib/sseManager";

// Static import map for playbook executors
import * as ddosMitigation from "@/lib/playbooks/ddos-mitigation";
import * as ipBlock from "@/lib/playbooks/ip-block";
import * as rateLimitEscalation from "@/lib/playbooks/rate-limit-escalation";
import * as fileQuarantine from "@/lib/playbooks/file-quarantine";
import * as log4shellPatchIsolate from "@/lib/playbooks/log4shell-patch-isolate";

const playbooks = {
  "ddos-mitigation": ddosMitigation,
  "ip-block": ipBlock,
  "rate-limit-escalation": rateLimitEscalation,
  "file-quarantine": fileQuarantine,
  "log4shell-patch-isolate": log4shellPatchIsolate,
};

export async function POST(request) {
  let alert = null;

  try {
    // ── Step 1: Parse and validate ──────────────────────────
    const rawAlert = await request.json();

    if (!rawAlert.source_ip) {
      return Response.json(
        { error: "source_ip is required" },
        { status: 400 }
      );
    }

    console.log(
      `[DART] Step 1: Alert received from ${rawAlert.source_ip} (type: ${rawAlert.alert_type})`
    );

    // ── Step 2: Enrich ──────────────────────────────────────
    let enrichment;
    if (rawAlert.alert_type === "malicious_upload" && rawAlert.sha256) {
      // Run IP enrichment AND VirusTotal file hash lookup in parallel
      const [ipEnrichment, fileEnrichment] = await Promise.all([
        enrichAll(resolveEnrichmentIP(rawAlert.source_ip)),
        fetchVirusTotalFile(rawAlert.sha256),
      ]);
      enrichment = {
        ...ipEnrichment,
        virustotal_file: fileEnrichment,
      };
      console.log(
        `[DART] Step 2: Enrichment + VT file lookup complete. VT detection: ${fileEnrichment.malicious}/${fileEnrichment.total_engines}`
      );
    } else {
      enrichment = await enrichAll(rawAlert.source_ip);
      console.log(
        `[DART] Step 2: Enrichment complete for ${rawAlert.source_ip}`
      );
    }

    // ── Step 3: Normalize into StandardAlert ────────────────
    alert = normalize(rawAlert, enrichment);

    const playbookId = selectPlaybook(alert);
    alert.selected_playbook = playbookId;

    console.log(
      `[DART] Step 3: Normalized. Risk score: ${alert.risk_score}. Playbook: ${playbookId || "none"}`
    );

    // ── Step 4: Execute the selected playbook ───────────────
    if (playbookId && playbooks[playbookId]) {
      alert.playbook_status = "executing";
      console.log(`[DART] Step 4: Executing playbook ${playbookId}...`);

      try {
        const playbookResult = await playbooks[playbookId].execute(alert);
        alert.playbook_result = playbookResult;
        alert.playbook_status = playbookResult.success
          ? "completed"
          : "failed";
        console.log(
          `[DART] Step 4: Playbook result: ${playbookResult.success}`
        );
      } catch (err) {
        console.error(
          `[DART] Step 4: Playbook ${playbookId} error: ${err.message}`
        );
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
      console.log(
        `[DART] Step 4: No playbook triggered — log and monitor only.`
      );
    }

    // ── Step 5: Store the completed alert ───────────────────
    await appendAlert(alert);
    console.log(`[DART] Step 5: Alert stored.`);

    // ── Step 6: Broadcast via SSE ───────────────────────────
    const clientCount = getClientCount();
    broadcastAlert(alert);
    console.log(
      `[DART] Step 6: Broadcast sent to ${clientCount} SSE clients.`
    );

    // ── Step 7: Return the completed StandardAlert ──────────
    return Response.json(alert, { status: 200 });
  } catch (err) {
    console.error(`[DART] Pipeline error: ${err.message}`);

    // If we have a partially built alert, store and broadcast it
    if (alert) {
      alert.playbook_status = "failed";
      alert.playbook_result = {
        playbook_id: alert.selected_playbook,
        steps_executed: [],
        success: false,
        error: err.message,
      };
      try {
        await appendAlert(alert);
        broadcastAlert(alert);
      } catch {
        // Best effort
      }
    }

    return Response.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
