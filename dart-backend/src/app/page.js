/**
 * DART Backend — Root Page
 * 
 * This service is an API-only backend. All endpoints are under /api.
 * This page is only shown if someone navigates to the root URL directly.
 */

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>DART Backend</h1>
      <p>Dynamic Routing &amp; Alert Triage — API Service</p>
      <h2>Available Endpoints</h2>
      <ul>
        <li><code>POST /api/alerts/ingest</code> — Ingest a raw alert</li>
        <li><code>GET /api/alerts/history</code> — Alert history</li>
        <li><code>GET /api/alerts/stream</code> — SSE live stream</li>
        <li><code>GET /api/status</code> — Health check</li>
      </ul>
    </main>
  );
}
