/**
 * POST /api/admin/unblock-ip — Dummy Server
 *
 * Removes the given IP from the blocked IPs list.
 * Body: { ip: "1.2.3.4" }
 * Called by DART ddos-mitigation playbook after 30s timeout.
 */

import { state, addLog } from "@/lib/state";

export async function POST(request) {
    try {
        const { ip } = await request.json();

        if (!ip) {
            return Response.json({ error: "ip is required" }, { status: 400 });
        }

        state.blockedIPs = state.blockedIPs.filter((b) => b !== ip);

        addLog("INFO", `IP unblocked by DART playbook: ${ip}`);
        console.log(`[admin] Unblocked IP: ${ip}`);

        return Response.json({
            success: true,
            ip,
            unblocked_at: new Date().toISOString(),
        });
    } catch (err) {
        return Response.json(
            { error: "Invalid request", details: err.message },
            { status: 400 }
        );
    }
}
