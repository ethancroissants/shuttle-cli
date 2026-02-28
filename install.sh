#!/usr/bin/env bash
set -e

# ShuttleAI CLI Installation Script
# Based on Cline (https://github.com/cline/cline) — Apache 2.0
# Usage: curl -fsSL <url> | bash

echo "Installing ShuttleAI CLI..."

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js >= 20 is required. Install from https://nodejs.org" >&2
  exit 1
fi

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js >= 20 required (found $NODE_VERSION)." >&2
  exit 1
fi

npm install -g shuttle-ai

echo ""
echo "✓ ShuttleAI CLI installed! Run 'shuttle' to get started."
echo "  Get your free API key at: https://shuttleai.com/keys"
