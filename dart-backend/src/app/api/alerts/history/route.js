/**
 * GET /api/alerts/history — DART Backend
 *
 * Returns the full contents of src/data/alerts.json as a JSON array.
 * Used by the frontend's Historical Alerts Table.
 */

import { getAlerts } from "@/lib/store";

// Prevent Next.js from caching this route response
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const alerts = await getAlerts();
    return Response.json(alerts, { status: 200 });
  } catch (err) {
    console.error("[history] Error reading alerts:", err.message);
    return Response.json(
      { error: "Failed to read alert history", details: err.message },
      { status: 500 }
    );
  }
}
