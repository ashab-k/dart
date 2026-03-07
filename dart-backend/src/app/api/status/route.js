/**
 * GET /api/status — DART Backend
 *
 * Health check endpoint. Returns the current service status
 * and the number of stored alerts.
 */

import { getAlerts } from "@/lib/store";

export async function GET() {
  try {
    const alerts = await getAlerts();
    return Response.json(
      {
        status: "ok",
        alertCount: alerts.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[status] Error:", err.message);
    return Response.json(
      {
        status: "ok",
        alertCount: 0,
      },
      { status: 200 }
    );
  }
}
