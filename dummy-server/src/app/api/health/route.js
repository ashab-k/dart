/**
 * GET /api/health — Dummy Server
 *
 * Returns the full server state plus derived fields:
 * status, requestsPerMinute, blockedIPs, rateLimit,
 * uptimeSeconds, logCount.
 */

import { state } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: state.status,
    requestsPerMinute: state.requestsPerMinute,
    blockedIPs: state.blockedIPs,
    rateLimit: state.rateLimit,
    uptimeSeconds: Math.round((Date.now() - state.uptimeStart) / 1000),
    totalRequests: state.totalRequests ?? 0,
    logCount: state.logs.length,
    uploadedFiles: state.uploadedFiles.slice(-10),
    quarantinedFiles: state.quarantinedFiles,
    totalUploads: state.uploadedFiles.length,
    log4shellAttempts: state.log4shellAttempts,
    log4shellAttemptsByIP: state.log4shellAttemptsByIP,
  });
}
