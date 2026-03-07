/**
 * Dummy Server — Homepage
 *
 * A realistic-looking generic company website that the
 * dummy server simulates protecting. This gives the demo
 * a tangible "production server" feel.
 */
export default function Home() {
  return (
    <main style={{
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      color: "#f1f5f9",
      minHeight: "100vh",
    }}>
      {/* Nav */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 2rem",
        borderBottom: "1px solid #334155",
        background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🌐</span>
          <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>Acme Corp</span>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem", color: "#94a3b8" }}>
          <span>Products</span>
          <span>Solutions</span>
          <span>Pricing</span>
          <span>Docs</span>
          <span>Contact</span>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        textAlign: "center",
        padding: "6rem 2rem 4rem",
        maxWidth: "800px",
        margin: "0 auto",
      }}>
        <div style={{
          display: "inline-block",
          padding: "0.35rem 1rem",
          background: "rgba(56,189,248,0.15)",
          border: "1px solid rgba(56,189,248,0.3)",
          borderRadius: "999px",
          fontSize: "0.8rem",
          color: "#38bdf8",
          marginBottom: "1.5rem",
        }}>
          🚀 Now with AI-powered analytics
        </div>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: "1rem",
          background: "linear-gradient(135deg, #f1f5f9, #38bdf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Build faster.<br />Scale smarter.
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
          The all-in-one platform for modern engineering teams.
          Deploy, monitor, and scale your applications with confidence.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button style={{
            padding: "0.75rem 2rem",
            background: "#38bdf8",
            color: "#0f172a",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
          }}>
            Get Started Free
          </button>
          <button style={{
            padding: "0.75rem 2rem",
            background: "transparent",
            color: "#f1f5f9",
            border: "1px solid #475569",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
          }}>
            View Demo
          </button>
        </div>
      </section>

      {/* Stats */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1.5rem",
        maxWidth: "800px",
        margin: "0 auto 4rem",
        padding: "0 2rem",
      }}>
        {[
          { value: "99.99%", label: "Uptime SLA" },
          { value: "10M+", label: "Requests / day" },
          { value: "<50ms", label: "Avg latency" },
        ].map((stat, i) => (
          <div key={i} style={{
            textAlign: "center",
            padding: "1.5rem",
            background: "rgba(30,41,59,0.6)",
            borderRadius: "12px",
            border: "1px solid #334155",
          }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#38bdf8" }}>{stat.value}</div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1.5rem",
        maxWidth: "800px",
        margin: "0 auto 4rem",
        padding: "0 2rem",
      }}>
        {[
          { icon: "⚡", title: "Lightning Fast", desc: "Edge-optimized CDN delivers content in under 50ms globally." },
          { icon: "🔒", title: "Enterprise Security", desc: "SOC 2 compliant with end-to-end encryption and DDoS protection." },
          { icon: "📊", title: "Real-time Analytics", desc: "Monitor performance, errors, and user behavior in real time." },
          { icon: "🔄", title: "Auto Scaling", desc: "Automatically scales from zero to millions of requests." },
        ].map((feat, i) => (
          <div key={i} style={{
            padding: "1.5rem",
            background: "rgba(30,41,59,0.6)",
            borderRadius: "12px",
            border: "1px solid #334155",
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{feat.icon}</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{feat.title}</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 }}>{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "2rem",
        borderTop: "1px solid #334155",
        color: "#64748b",
        fontSize: "0.85rem",
      }}>
        © 2026 Acme Corp — Simulated Server for DART Demo
      </footer>
    </main>
  );
}
