/**
 * POST /api/alerts/feedback — DART Backend
 *
 * Accepts analyst feedback for a specific alert.
 * Body: { alert_id, action: "approve"|"reject"|"escalate", notes? }
 *
 * Updates the alert's analyst_feedback field in alerts.json.
 */

import { updateAlert } from "@/lib/store";

export async function POST(request) {
  try {
    const body = await request.json();
    const { alert_id, action, notes } = body;

    if (!alert_id || !action) {
      return Response.json(
        { error: "alert_id and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject", "escalate"].includes(action)) {
      return Response.json(
        { error: "action must be one of: approve, reject, escalate" },
        { status: 400 }
      );
    }

    const feedback = {
      action,
      notes: notes || null,
      timestamp: new Date().toISOString(),
      analyst: "SOC-Analyst-1", // In production, this would come from auth
    };

    const updated = await updateAlert(alert_id, {
      analyst_feedback: feedback,
    });

    if (!updated) {
      return Response.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    console.log(`[feedback] Alert ${alert_id} — ${action} by analyst`);
    return Response.json({ success: true, alert: updated }, { status: 200 });
  } catch (err) {
    console.error(`[feedback] Error: ${err.message}`);
    return Response.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
