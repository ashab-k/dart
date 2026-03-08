/**
 * GET /api/virustotal/[sha256] — DART Backend
 *
 * Returns the full VirusTotal file report for a given SHA256 hash.
 * Used by the frontend to fetch detailed scan results.
 */

import { fetchVirusTotalFile } from "@/lib/enrichment";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { sha256 } = params;
  if (!sha256 || sha256.length !== 64) {
    return Response.json(
      { error: "invalid sha256" },
      { status: 400 }
    );
  }
  const result = await fetchVirusTotalFile(sha256);
  return Response.json(result);
}
