#!/usr/bin/env bash
set -e

# ShuttleAI CLI — install from source
# Based on Cline (https://github.com/cline/cline) — Apache 2.0

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}${BOLD}→${RESET} $*"; }
success() { echo -e "${GREEN}${BOLD}✓${RESET} $*"; }
error()   { echo -e "${RED}${BOLD}✗${RESET} $*" >&2; exit 1; }

# Check Node.js >= 20
if ! command -v node >/dev/null 2>&1; then
  error "Node.js v20+ is required. Install from https://nodejs.org"
fi
NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 20 ]; then
  error "Node.js v20+ required (found v$NODE_VER). Install from https://nodejs.org"
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

info "Installing root dependencies..."
npm install --legacy-peer-deps --silent

info "Building CLI..."
cd cli
npm install --legacy-peer-deps --silent
npm run build

info "Linking 'shuttle' globally..."
npm link

success "Done! Run: shuttle"
echo ""
echo "  On first run, Shuttle will ask for your ShuttleAI API key."
echo "  Get a free key at: https://shuttleai.com/keys"
echo ""

