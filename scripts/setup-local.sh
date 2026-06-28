#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"

echo "==> AI Governance local setup"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed."
  exit 1
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo

echo "==> Installing dependencies..."
npm install
echo

DB_READY=0

if command -v docker >/dev/null 2>&1; then
  echo "==> Starting PostgreSQL with Docker Compose..."
  docker compose up -d
  echo "Waiting for database..."
  for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U aigovernance -d aigovernance >/dev/null 2>&1; then
      DB_READY=1
      break
    fi
    sleep 1
  done
elif command -v pg_isready >/dev/null 2>&1; then
  echo "==> Using local PostgreSQL (no Docker)"
  if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "ERROR: PostgreSQL is installed but not running."
    echo "Start it with: brew services start postgresql@16"
    exit 1
  fi
  if ! psql -h localhost -p 5432 -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw aigovernance; then
    echo "Creating database 'aigovernance'..."
    createdb aigovernance 2>/dev/null || true
  fi
  DB_READY=1
else
  echo "ERROR: No database runtime found."
  echo
  echo "Install ONE of the following, then re-run this script:"
  echo
  echo "  Option A — Docker Desktop (recommended)"
  echo "    1. Install from https://www.docker.com/products/docker-desktop/"
  echo "    2. Open Docker Desktop and wait until it is running"
  echo "    3. Run: npm run setup"
  echo
  echo "  Option B — Homebrew PostgreSQL"
  echo "    brew install postgresql@16"
  echo "    brew services start postgresql@16"
  echo "    createdb aigovernance"
  echo "    Update .env DATABASE_URL to:"
  echo "    postgresql://$(whoami)@localhost:5432/aigovernance?schema=public"
  echo "    Run: npm run setup"
  exit 1
fi

if [ "$DB_READY" -ne 1 ]; then
  echo "ERROR: Database did not become ready in time."
  docker compose logs postgres 2>/dev/null || true
  exit 1
fi

echo
echo "==> Applying database schema..."
npm run db:push

echo
echo "==> Seeding frameworks, crosswalk, risks, and controls..."
npm run db:seed

echo
echo "==> Validating seed manifests..."
npm run db:validate

echo
echo "Setup complete."
echo
echo "Start the app with:"
echo "  npm run dev"
echo
echo "Then open http://localhost:3000"
