#!/bin/bash

# DART Phase 2 - Setup & Deployment Script
# This script prepares the environment and starts the DART platform.

set -e

echo "-------------------------------------------------------"
echo "   DART SOC Automation Platform - Setup & Support      "
echo "-------------------------------------------------------"

# 1. Dependency Checks
echo "[*] Checking dependencies..."

if ! [ -x "$(command -v docker)" ]; then
  echo "Error: Docker is not installed. Please install Docker and try again." >&2
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose is not installed." >&2
  exit 1
fi

echo "[+] Docker and Docker Compose found."

# 2. Environment Setup
echo "[*] Setting up environment files..."

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "[+] Created .env from .env.example"
  else
    echo "[*] Generating default .env file..."
    cat > .env <<EOF
NEXT_PUBLIC_DART_BACKEND_URL=http://localhost:3001
DART_BACKEND_URL=http://dart-backend:3001
DUMMY_SERVER_URL=http://dummy-server:3002
EOF
    echo "[+] Generated .env with defaults."
  fi
else
  echo "[+] .env file already exists."
fi

# 3. Create Data Directory
echo "[*] Ensuring data persistence directories exist..."
mkdir -p dart-backend/src/data
if [ ! -f dart-backend/src/data/alerts.json ]; then
  echo "[]" > dart-backend/src/data/alerts.json
fi
echo "[+] Data directories initialized."

# 4. Build and Start
echo "[*] Building and starting containers (this may take a few minutes)..."
docker compose up --build -d

echo "-------------------------------------------------------"
echo "   DART Platform is starting up!                       "
echo "-------------------------------------------------------"
echo "   - Frontend:    http://localhost:3000                "
echo "   - Backend:     http://localhost:3001                "
echo "   - Dummy Srv:   http://localhost:3002                "
echo "-------------------------------------------------------"
echo "Use 'docker compose logs -f' to monitor progress."
