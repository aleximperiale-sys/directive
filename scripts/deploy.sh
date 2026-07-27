#!/usr/bin/env bash
#
# Build the React UI Bundle and deploy all Directive metadata to the org.
#
# Prereqs:
#   1. bash scripts/auth.sh   (org authorized with alias "directive")
#   2. Node.js >= 22
#
# Usage:
#   bash scripts/deploy.sh            # build UI + deploy everything
#   bash scripts/deploy.sh --no-ui    # deploy metadata only (skip UI build)
#   bash scripts/deploy.sh --check    # validate-only deploy (no changes committed)
#
set -euo pipefail

ALIAS="directive"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UI_DIR="$ROOT/force-app/main/default/uiBundles/directiveUi"

BUILD_UI=1
CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --no-ui) BUILD_UI=0 ;;
    --check) CHECK_ONLY=1 ;;
  esac
done

if [[ "$BUILD_UI" == "1" ]]; then
  echo "==> Installing + building UI Bundle"
  ( cd "$UI_DIR" && npm install && npm run build )
else
  echo "==> Skipping UI build (--no-ui)"
fi

echo "==> Deploying metadata to org: $ALIAS"
DEPLOY_ARGS=(project deploy start --source-dir "$ROOT/force-app" --target-org "$ALIAS" --wait 33)
if [[ "$CHECK_ONLY" == "1" ]]; then
  DEPLOY_ARGS+=(--dry-run)
  echo "    (validate-only / dry run)"
fi
sf "${DEPLOY_ARGS[@]}"

echo
echo "==> Assigning permission set: Directive_User"
sf org assign permset --name Directive_User --target-org "$ALIAS" || true

echo
echo "Done. Open the app:"
echo "  sf org open --target-org $ALIAS --path lightning/app/Directive_UI"
