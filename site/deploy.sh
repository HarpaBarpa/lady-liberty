#!/usr/bin/env bash
# LibertyTorch deploy script — always deploys from site/ to the correct Vercel project
# Usage: ./deploy.sh <vercel_token>
#   Or set VERCEL_TOKEN env var
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN_NAME="Vercel Full Access"

# ── Guard: must run from site/ directory ────────────────────────────
EXPECTED_DIR="site"
if [[ "$(basename "$SCRIPT_DIR")" != "$EXPECTED_DIR" ]]; then
  echo "❌ Error: deploy.sh must be run from the $EXPECTED_DIR/ subdirectory."
  echo "   Current directory: $SCRIPT_DIR"
  echo "   Run: cd $(dirname "$SCRIPT_DIR")/$EXPECTED_DIR && ./deploy.sh <token>"
  exit 1
fi

# ── Guard: correct Vercel project ID ────────────────────────────────
EXPECTED_PROJECT_ID="prj_E7IASpe9aFe0cgQQmWemwIIwje03"  # libertytorch (libertytorch.online)
CORRECT_PROJECT_NAME="libertytorch"

if [[ ! -f "$SCRIPT_DIR/.vercel/project.json" ]]; then
  echo "❌ Error: site/.vercel/project.json not found."
  echo "   Run: npx vercel link"
  exit 1
fi

ACTUAL_PROJECT_ID=$(grep -o '"projectId":"[^"]*"' "$SCRIPT_DIR/.vercel/project.json" | head -1 | cut -d'"' -f4)
if [[ "$ACTUAL_PROJECT_ID" != "$EXPECTED_PROJECT_ID" ]]; then
  echo "❌ Error: wrong Vercel project."
  echo "   Expected: $EXPECTED_PROJECT_ID ($CORRECT_PROJECT_NAME — owns libertytorch.online)"
  echo "   Found:    $ACTUAL_PROJECT_ID"
  echo "   Re-link to the correct project:"
  echo "   1. Delete site/.vercel/"
  echo "   2. npx vercel link --token <token>"
  echo "   3. Choose team mj1804s-projects, project libertytorch"
  exit 1
fi

# ── Get token ────────────────────────────────────────────────────────
TOKEN="${1:-${VERCEL_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "❌ Error: Vercel token required."
  echo "   Usage: ./deploy.sh <vercel_token>"
  echo "   Or:    VERCEL_TOKEN=<token> ./deploy.sh"
  echo "   Token is stored in Vault as: $TOKEN_NAME"
  exit 1
fi

echo "✓ Vercel project: $CORRECT_PROJECT_NAME ($ACTUAL_PROJECT_ID)"
echo "✓ Target:         libertytorch.online"
echo "✓ Commit:         $(cd "$SCRIPT_DIR/.." && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

# ── Verify auth ──────────────────────────────────────────────────────
VERIFIED=$(npx vercel --token "$TOKEN" whoami 2>/dev/null || echo "FAILED")
if [[ "$VERIFIED" != "mj1804" ]]; then
  echo "❌ Vercel auth failed (got: $VERIFIED). Check the token."
  exit 1
fi
echo "✓ Authenticated as: $VERIFIED"

# ── Deploy ───────────────────────────────────────────────────────────
echo ""
echo "Deploying..."
cd "$SCRIPT_DIR"
npx vercel deploy --prod --yes --token "$TOKEN" 2>&1

echo ""
echo "Verifying live site..."
sleep 3
LIVE_CSS=$(curl -sf "https://libertytorch.online/css/styles.css") || true
if echo "$LIVE_CSS" | grep -q "left: 4%"; then
  echo "✓ Live at libertytorch.online — new code confirmed"
elif echo "$LIVE_CSS" | grep -q "left: 4%;"; then
  echo "✓ Live at libertytorch.online — new code confirmed"
else
  echo "⚠️  Deploy completed but live site may not have new code."
  echo "   Expected: left: 4% (torch-spot positioning)"
  echo "   Run to verify: curl -s libertytorch.online/css/styles.css | grep torch-spot"
fi
