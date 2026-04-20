# DART — Dynamic Routing & Alert Triage
 
SOC automation demo that enriches, scores, and routes security alerts through automated playbooks.
 
![Architecture](https://img.shields.io/badge/Stack-Next.js%20%7C%20Docker-blue) ![Status](https://img.shields.io/badge/Status-Demo-green)
 
## Architecture
 
```
Traffic → Dummy Server (3002)
              │
              └─ anomaly detected → POST alert
                                       │
                                       ▼
                                 DART Backend (3001)
                                   ├─ Enrich (GreyNoise, AbuseIPDB, GeoIP, VirusTotal)
                                   ├─ Normalize → Risk Score
                                   ├─ Decision Tree → Playbook
                                   ├─ Execute Playbook → Dummy Server Admin APIs
                                   └─ Store + SSE Broadcast
                                       │
                                       ▼
                                 DART Frontend (3000)
                                   ├─ Live Alert Feed (SSE)
                                   ├─ Server Status (polling)
                                   ├─ Log Viewer (polling)
                                   └─ Historical Alerts Table
```
 
## Prerequisites
 
- **Docker** and **Docker Compose**
- API keys (optional — demo works without them using fallback defaults):
  - [GreyNoise](https://www.greynoise.io) — free Community tier
  - [AbuseIPDB](https://www.abuseipdb.com/api) — free tier (1000 checks/day)
  - [VirusTotal](https://www.virustotal.com/gui/my-apikey) — free tier (4 req/min)
## Setup
 
```bash
# 1. Clone the repo
git clone https://github.com/ashab-k/dart.git
cd dart
 
# 2. Create environment file
cp .env.example .env
 
# 3. (Optional) Add API keys in .env
#    The system works without them — enrichment will use safe defaults
```
 
## Run
 
```bash
docker compose up --build
```
 
This builds and starts all three services:
 
| Service | URL | Description |
|---------|-----|-------------|
| **Dashboard** | http://localhost:3000 | SOC dashboard with live alerts |
| **Backend API** | http://localhost:3001 | Alert processing pipeline |
| **Dummy Server** | http://localhost:3002 | Simulated production server |
 
## Run the DDoS Simulation
 
In a **separate terminal** (while Docker Compose is running):
 
```bash
node scripts/ddos.js
```
 
This sends 50 concurrent requests every 500ms for 60 seconds to the dummy server.
 
### What to Expect
 
1. **Server status changes to DEGRADED** (orange) on the dashboard
2. **An anomaly is detected** — dummy server sends an alert to the DART backend
3. **Alert appears in live feed** with risk score (typically 40–95 for DDoS)
4. **Playbook executes** — `ddos-mitigation` blocks IP, applies rate limiting, and restarts the server
5. **Server status returns to ONLINE** (green)
6. **Full alert record** appears in the historical table with enrichment details
## Project Structure
 
```
dart/
├── docker-compose.yml          # Orchestrates all 3 services
├── .env.example                # Environment variable template
├── dart-backend/               # Alert processing API (port 3001)
├── dart-frontend/              # SOC dashboard (port 3000)
├── dummy-server/               # Simulated server (port 3002)
└── scripts/
    └── ddos.js                 # Attack simulator
```
 
## API Endpoints
 
### DART Backend (3001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/alerts/ingest` | Ingest raw alert and process full pipeline |
| GET | `/api/alerts/history` | Retrieve all stored alerts |
| GET | `/api/alerts/stream` | SSE live stream |
| GET | `/api/status` | Health check |
 
### Dummy Server (3002)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server state |
| GET | `/api/data` | Simulated endpoint (rate limited) |
| GET | `/api/logs` | Last 100 log entries |
| POST | `/api/admin/block-ip` | Block an IP |
| POST | `/api/admin/set-rate-limit` | Set rate limit |
| POST | `/api/admin/restart` | Reset server state |
 
## Environment Variables
 
| Variable | Used By | Description |
|----------|---------|-------------|
| `GREYNOISE_API_KEY` | Backend | GreyNoise threat intel |
| `ABUSEIPDB_API_KEY` | Backend | AbuseIPDB reputation |
| `VIRUSTOTAL_API_KEY` | Backend | VirusTotal reputation |
| `DUMMY_SERVER_URL` | Backend | Internal Docker URL for dummy server |
| `DART_BACKEND_URL` | Dummy Server | Internal Docker URL for backend |
| `NEXT_PUBLIC_DART_BACKEND_URL` | Frontend | Browser-facing backend URL |
| `NEXT_PUBLIC_DUMMY_SERVER_URL` | Frontend | Browser-facing dummy server URL |
 
## Local Development (without Docker)
 
```bash
# Terminal 1 — Backend
cd dart-backend && npm install && PORT=3001 npm run dev
 
# Terminal 2 — Dummy Server
cd dummy-server && npm install && PORT=3002 npm run dev
 
# Terminal 3 — Frontend
cd dart-frontend && npm install && PORT=3000 npm run dev
 
# Terminal 4 — Attack simulation
node scripts/ddos.js
```
