#!/usr/bin/env bash
# Simulates DigitalOcean App Platform: prod-only node_modules, then next build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "→ Copying project to temp dir (excluding node_modules and .next)..."
mkdir -p "$WORK"
cp -R "$ROOT"/. "$WORK/"
rm -rf "$WORK/node_modules" "$WORK/.next"

cd "$WORK"

echo "→ npm ci --omit=dev (matches DigitalOcean after devDependency prune)..."
npm ci --omit=dev

echo "→ npm run build..."
NEXT_TELEMETRY_DISABLED=1 npm run build

echo "✓ Production build succeeded — safe to deploy to DigitalOcean"
