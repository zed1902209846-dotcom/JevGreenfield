#!/usr/bin/env bash
# Set up Jev Risk Oracle on a new machine. Run from the project root: ./setup.sh
#
# Secrets never travel with the code. This script either adopts a `.studio/`
# folder you copied over yourself (same wallet + keys), or creates a fresh wallet
# and asks for your own OpenRouter key through a hidden prompt.
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

say "Checking tools"
command -v node >/dev/null || die "Node.js 22+ is required: https://nodejs.org (or nvm install 22)"
major=$(node -p 'process.versions.node.split(".")[0]')
[ "$major" -ge 22 ] || die "Node.js 22+ is required (found $(node -v))"
if ! command -v bag >/dev/null; then
  die "bnbagent-studio CLI missing. Install it with: npm install -g @bnbagent/studio-cli@0.0.15"
fi
echo "node $(node -v) · bag $(bag --version)"

say "Installing dependencies"
npx -y pnpm@10.24.0 install --frozen-lockfile

cd app/agent
if ls ../../.studio/wallets/*.json >/dev/null 2>&1; then
  say "Using the wallet in .studio/ ($(bag wallet show 2>/dev/null | awk '/^address/{print $2}'))"
else
  say "No wallet found — creating a fresh testnet wallet for this machine"
  # The repo records the original machine's wallet address; a new wallet replaces it.
  sed -i.bak '/^address = "0x[0-9a-fA-F]\{40\}"$/d' studio.toml && rm -f studio.toml.bak
  bag wallet new --generate-password
fi

if ! grep -q '^OPENROUTER_API_KEY=.\+' ../../.studio/.env.local 2>/dev/null; then
  say "OpenRouter key (input hidden; get one at https://openrouter.ai/settings/keys — Jev needs prepaid credits)"
  read -rs -p "OPENROUTER_API_KEY: " key; echo
  [ -n "$key" ] || die "An OpenRouter key is required"
  bag env set OPENROUTER_API_KEY "$key" >/dev/null; unset key
  read -rs -p "COINGECKO_API_KEY (optional Demo key, Enter to skip): " cg; echo
  [ -n "$cg" ] && bag env set COINGECKO_API_KEY "$cg" >/dev/null; unset cg
fi
cd ../..

say "Checking the setup"
bag doctor | grep -E "FAIL|\[llm\]|entrypoint" || true

cat <<'EOF'

Done. Start the agent with the dashboard demo box:

  DASHBOARD_DEMO=1 bag dev        # then open http://localhost:9000/dashboard/

(Use `bag dev --port 9100` if port 9000 is taken.)
EOF
