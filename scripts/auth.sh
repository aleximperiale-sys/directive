#!/usr/bin/env bash
#
# Authenticate the Salesforce CLI to the Directive developer org.
#
# The target org for this project:
#   https://YOUR-DOMAIN.develop.lightning.force.com
#
# We authorize against the *My Domain* login host (not the Lightning host).
# The alias "directive" is used by scripts/deploy.sh and package.json.
#
# Usage:
#   bash scripts/auth.sh            # opens a browser (recommended in VS Code)
#   bash scripts/auth.sh --device   # device-code flow (headless / remote shells)
#
set -euo pipefail

ALIAS="directive"
INSTANCE_URL="https://YOUR-DOMAIN.develop.my.salesforce.com"

if ! command -v sf >/dev/null 2>&1; then
  echo "Salesforce CLI (sf) not found."
  echo "Install it first:  npm install --global @salesforce/cli"
  exit 1
fi

if [[ "${1:-}" == "--device" ]]; then
  echo "Starting device-code login. Follow the printed URL + code in your browser."
  sf org login device --alias "$ALIAS" --instance-url "$INSTANCE_URL" --set-default
else
  echo "Opening browser to authorize org (alias: $ALIAS)..."
  sf org login web --alias "$ALIAS" --instance-url "$INSTANCE_URL" --set-default
fi

echo
echo "Authorized. Current default org:"
sf org display --target-org "$ALIAS"
