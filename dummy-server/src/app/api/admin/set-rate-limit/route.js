/**
 * POST /api/admin/set-rate-limit — Dummy Server
 *
 * Updates the server's rate limit cap.
 * Body: { limit: 50 } or { cap: 50 }
 * No auth needed — this is a demo.
 */

import { state, addLog } from "@/lib/state";

export async function POST(request) {
  try {
    const body = await request.json();
    const newLimit = body.limit ?? body.cap;

    if (newLimit === undefined || typeof newLimit !== "number") {
      return Response.json(
        { error: "limit (number) is required" },
        { status: 400 }
      );
    }

    const oldLimit = state.rateLimit;
    state.rateLimit = newLimit;

    addLog("WARN", `Rate limit changed: ${oldLimit} → ${newLimit} req/min`);
    console.log(`[admin] Rate limit set: ${oldLimit} → ${newLimit}`);

    return Response.json({ success: true, rateLimit: state.rateLimit });
  } catch (err) {
    return Response.json(
      { error: "Invalid request", details: err.message },
      { status: 400 }
    );
  }
}
