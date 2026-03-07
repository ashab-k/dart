/**
 * Dummy Server — Root Page
 * This is a simulated production server. All endpoints are under /api.
 */
export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", background: "#0f172a", color: "#f1f5f9", minHeight: "100vh" }}>
      <h1>🎯 Dummy Server</h1>
      <p style={{ color: "#94a3b8" }}>Simulated production server for DART demo</p>
      <h2 style={{ marginTop: "1.5rem" }}>Endpoints</h2>
      <ul style={{ lineHeight: 2 }}>
        <li><code>GET /api/health</code> — Server health &amp; state</li>
        <li><code>GET /api/data</code> — Simulated data endpoint (rate limited)</li>
        <li><code>GET /api/logs</code> — Last 100 log entries</li>
        <li><code>POST /api/admin/block-ip</code> — Block an IP</li>
        <li><code>POST /api/admin/set-rate-limit</code> — Set rate limit</li>
        <li><code>POST /api/admin/restart</code> — Reset server state</li>
      </ul>
    </main>
  );
}
