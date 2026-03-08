/**
 * POST /api/admin/quarantine-file — Dummy Server
 *
 * Quarantines a file by upload_id. Called by DART's
 * file-quarantine playbook.
 */

import { state, addLog } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { upload_id, sha256, reason } = await req.json();

    if (!upload_id || !sha256) {
      return Response.json(
        { error: "upload_id and sha256 are required" },
        { status: 400 }
      );
    }

    // Find and update the upload record
    const record = state.uploadedFiles.find(
      (f) => f.id === upload_id
    );
    if (record) {
      record.status = "quarantined";
    }

    // Add to quarantine list
    const quarantineRecord = {
      upload_id,
      sha256,
      reason: reason || "Flagged by DART",
      quarantined_at: new Date().toISOString(),
    };
    state.quarantinedFiles.push(quarantineRecord);

    addLog("WARN",
      `File quarantined by DART: ${sha256} reason: ${reason || "N/A"}`
    );

    return Response.json({
      success: true,
      upload_id,
      quarantined_at: quarantineRecord.quarantined_at,
    });
  } catch (err) {
    addLog("ERROR", `Quarantine error: ${err.message}`);
    return Response.json(
      { error: "quarantine failed" },
      { status: 500 }
    );
  }
}
