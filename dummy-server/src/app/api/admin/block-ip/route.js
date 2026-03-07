/**
 * POST /api/admin/block-ip — Dummy Server
 *
 * Adds the given IP to the blocked IPs list.
 * Body: { ip: "1.2.3.4" }
 * No auth needed — this is a demo.
 */

import { state, addLog } from "@/lib/state";

export async function POST(request) {
  try {
    const { ip } = await request.json();

    if (!ip) {
      return Response.json({ error: "ip is required" }, { status: 400 });
    }

    if (!state.blockedIPs.includes(ip)) {
      state.blockedIPs.push(ip);
    }

    addLog("WARN", `IP blocked by admin/playbook: ${ip}`);
    console.log(`[admin] Blocked IP: ${ip}`);

    return Response.json({ success: true, blockedIPs: state.blockedIPs });
  } catch (err) {
    return Response.json(
      { error: "Invalid request", details: err.message },
      { status: 400 }
    );
  }
}
