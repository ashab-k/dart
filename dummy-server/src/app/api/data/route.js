/**
 * GET /api/data — Dummy Server
 *
 * Simulates a real production endpoint.
 * Subject to rate limiting and IP blocking via middleware.
 * Returns { message, timestamp, requestsServed }.
 */

import { state } from "@/lib/state";
import { checkRequest } from "@/lib/middleware";

export const dynamic = "force-dynamic";

export async function GET(request) {
  // Run through rate limit / IP block checks
  const blocked = checkRequest(request);
  if (blocked) return blocked;

  return Response.json({
    message: "ok",
    timestamp: new Date().toISOString(),
    requestsServed: state.totalRequests,
  });
}
