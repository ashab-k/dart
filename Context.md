DART: Dynamic Routing & Alert Triage
Product Requirements Document (PRD) — Global Context
Version: 1.0
Stack: Next.js (App Router), Node.js, Docker, Docker Compose
Monorepo structure: Three services — dart-backend, dart-frontend, dummy-server

1. Problem Statement
Security Operations Center (SOC) teams are overwhelmed by alert volume. Analysts manually triage each alert, pull context from multiple systems, assess severity, and select a response playbook — a process that is slow, error-prone, and does not scale for small teams. DART eliminates this bottleneck by automating enrichment, scoring, and playbook routing.

2. System Architecture
Traffic / Users
      │
      ▼
Dummy Server (Next.js API)
  ├── Exposes /api/health, /api/data, /api/logs
  ├── Has built-in rate limiting + anomaly detection
  └── On anomaly → POST alert to DART Backend
            │
            ▼
      DART Backend (Next.js API Routes)
        ├── Alert Ingestion (REST + webhook)
        ├── Log Ingestion (polls dummy server logs)
        ├── Enrichment Pipeline (parallel API calls)
        │     ├── GreyNoise API
        │     ├── AbuseIPDB API
        │     ├── GeoIP Lookup (ip-api.com)
        │     └── VirusTotal API
        ├── Normalization → Structured Alert Object
        ├── Decision Tree → Playbook Selection
        ├── Playbook Executor
        └── Historical Store (append-only alerts.json)
            │
            ▼
      DART Frontend (Next.js App)
        ├── Live Alert Dashboard
        ├── Historical Alerts Table
        ├── Dummy Server Status Panel
        └── Log Viewer

3. Monorepo Layout
/dart/
├── docker-compose.yml
├── dart-backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   └── src/
│       ├── app/api/
│       │   ├── alerts/ingest/route.js       # receive alerts
│       │   ├── alerts/history/route.js      # return alerts.json
│       │   ├── playbook/execute/route.js    # run playbook
│       │   └── status/route.js             # health
│       ├── lib/
│       │   ├── enrichment.js               # parallel enrichment calls
│       │   ├── normalizer.js               # → StandardAlert schema
│       │   ├── decisionTree.js             # playbook selector
│       │   ├── playbooks/
│       │   │   ├── ddos-mitigation.js
│       │   │   ├── ip-block.js
│       │   │   └── rate-limit-escalation.js
│       │   └── store.js                    # append to alerts.json
│       └── data/
│           └── alerts.json                 # persistent history
├── dart-frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   └── src/
│       └── app/
│           ├── page.jsx                    # dashboard root
│           └── components/
│               ├── AlertFeed.jsx
│               ├── ServerStatus.jsx
│               ├── LogViewer.jsx
│               └── HistoricalTable.jsx
├── dummy-server/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   └── src/
│       └── app/api/
│           ├── health/route.js
│           ├── data/route.js
│           └── logs/route.js
└── scripts/
    └── ddos.js                             # attack simulator

4. Data Schemas
StandardAlert Object (output of normalizer, input to decision tree)
json{
  "id": "uuid-v4",
  "timestamp": "ISO8601",
  "source_ip": "1.2.3.4",
  "alert_type": "ddos | brute_force | port_scan | anomaly",
  "severity": "critical | high | medium | low",
  "raw_alert": { ...original payload },
  "enrichment": {
    "greynoise": { "classification": "malicious|benign|unknown", "name": "...", "tags": [] },
    "abuseipdb": { "abuseConfidenceScore": 0-100, "totalReports": 0, "countryCode": "..." },
    "geoip": { "country": "...", "city": "...", "isp": "..." },
    "virustotal": { "malicious": 0, "suspicious": 0, "harmless": 0 }
  },
  "risk_score": 0-100,
  "risk_reasoning": "plain text explanation",
  "selected_playbook": "ddos-mitigation | ip-block | rate-limit-escalation",
  "playbook_status": "pending | executing | completed | failed",
  "playbook_result": { ...execution output },
  "analyst_feedback": null
}
Playbook Response Object
json{
  "playbook_id": "ddos-mitigation",
  "steps_executed": ["block_ip", "increase_rate_limit", "notify_frontend", "restore_server"],
  "success": true,
  "restored_at": "ISO8601",
  "notes": "..."
}
```

---

## 5. Enrichment APIs

| API | Purpose | Key field used in decision tree |
|---|---|---|
| GreyNoise | Is this IP known scanner/malicious? | `classification` |
| AbuseIPDB | Community abuse reports for IP | `abuseConfidenceScore` |
| GeoIP (ip-api.com) | Country, ISP, org of source IP | `countryCode`, `isp` |
| VirusTotal | IP/domain reputation | `malicious` vote count |

All four calls are made **in parallel** via `Promise.all`. Each is wrapped in a try/catch with a fallback default so a single API failure never breaks the pipeline.

---

## 6. Decision Tree Logic
```
IF request_rate > 500 req/min
  AND (abuseScore > 50 OR greynoise.classification == "malicious")
    → Playbook: ddos-mitigation        [risk_score: 85-100]

ELSE IF abuseScore > 30
  AND greynoise.classification == "malicious"
    → Playbook: ip-block               [risk_score: 60-84]

ELSE IF request_rate > 200 req/min
  AND anomaly_detected == true
    → Playbook: rate-limit-escalation  [risk_score: 40-59]

ELSE
    → Log and monitor only             [risk_score: 0-39]
```

---

## 7. Playbooks

### Playbook 1: `ddos-mitigation`
**Trigger:** High-volume flood attack confirmed by enrichment
**Steps:**
1. Call `dummy-server/api/admin/block-ip` with offending IP
2. Call `dummy-server/api/admin/set-rate-limit` with aggressive cap
3. Call `dummy-server/api/admin/restart` to restore service state
4. Write result to `alerts.json`
5. Emit SSE event to frontend

### Playbook 2: `ip-block`
**Trigger:** Known malicious IP, moderate traffic
**Steps:**
1. Call `dummy-server/api/admin/block-ip`
2. Write result to `alerts.json`
3. Emit SSE event to frontend

### Playbook 3: `rate-limit-escalation`
**Trigger:** Anomalous traffic, not confirmed malicious
**Steps:**
1. Call `dummy-server/api/admin/set-rate-limit` with moderate cap
2. Flag alert as "requires analyst review"
3. Write result to `alerts.json`
4. Emit SSE event to frontend

---

## 8. Dummy Server Behaviour

- Normal state: responds to all requests with 200, tracks request counts per minute, maintains an in-memory log array
- Under attack: request rate climbs, server starts returning 429/503, logs the anomaly
- Self-reporting: a background interval checks requests/min every 10 seconds; if threshold exceeded, POSTs alert to `dart-backend/api/alerts/ingest`
- Admin endpoints (internal only, no auth needed for demo): `/api/admin/block-ip`, `/api/admin/set-rate-limit`, `/api/admin/restart`
- `/api/logs` returns the last 100 log lines as JSON

---

## 9. DDoS Attack Script (`scripts/ddos.js`)

Plain Node.js script (no framework). Fires N concurrent HTTP requests to `dummy-server` in a loop using `Promise.all` batches. Configurable: `TARGET_URL`, `REQUESTS_PER_BATCH`, `BATCH_INTERVAL_MS`, `DURATION_SECONDS`. No external dependencies — uses native `fetch`.

---

## 10. Frontend Dashboard

Single-page Next.js app. Four panels:

| Panel | Data Source | Update Mechanism |
|---|---|---|
| Live Alert Feed | DART Backend SSE | EventSource stream |
| Server Status | Dummy Server `/api/health` | Polling every 3s |
| Log Viewer | Dummy Server `/api/logs` | Polling every 5s |
| Historical Alerts | DART Backend `/api/alerts/history` | On load + after each new alert |

---

## 11. Docker Compose

Three services: `dart-backend` (port 3001), `dart-frontend` (port 3000), `dummy-server` (port 3002). All on a shared Docker network `dart-net`. Environment variables for all API keys passed via `.env` file at root. Single command: `docker compose up --build`.

---

## 12. Environment Variables

# dart-backend .env
GREYNOISE_API_KEY=
ABUSEIPDB_API_KEY=
VIRUSTOTAL_API_KEY=
DUMMY_SERVER_URL=http://dummy-server:3002
DART_BACKEND_URL=http://dart-backend:3001

# dart-frontend .env
NEXT_PUBLIC_DART_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_DUMMY_SERVER_URL=http://localhost:3002

---

---