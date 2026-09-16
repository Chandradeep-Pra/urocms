#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_SOURCE="${1:-$HOME/.env.prod}"
WORK_DIR="$(mktemp -d)"
export ENV_SOURCE
export RUNTIME_FILE="$WORK_DIR/runtime.json"
IMAGE_FILE="$WORK_DIR/image.txt"
cleanup() {
  rm -f -- "$RUNTIME_FILE" "$IMAGE_FILE"
  rmdir -- "$WORK_DIR"
}
trap cleanup EXIT

# Runtime credentials remain outside the source upload and are never printed.
node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const values = parseEnv(readFileSync(process.env.ENV_SOURCE, 'utf8'));
writeFileSync(process.env.RUNTIME_FILE, JSON.stringify(values), { mode: 0o600 });
NODE

node scripts/cloud-build.mjs --env-file "$ENV_SOURCE" --check
node scripts/cloud-build.mjs --env-file "$ENV_SOURCE" --image-file "$IMAGE_FILE"
IMAGE="$(cat "$IMAGE_FILE")"
DEPLOY_VERSION="r$(date +%Y%m%d%H%M%S)"

# Deploy the image that already contains the public Next.js build settings.
# --source would start another unconfigured Docker build.
gcloud run deploy urologics-web \
  --image "$IMAGE" \
  --project proud-woods-489814-s6 \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 1Gi \
  --min 0 \
  --max 3 \
  --env-vars-file "$RUNTIME_FILE" \
  --revision-suffix "$DEPLOY_VERSION"

gcloud run services describe urologics-web \
  --project proud-woods-489814-s6 \
  --region asia-south1 \
  --format="yaml(status.latestReadyRevisionName,status.traffic,status.url)"

echo "Deployment completed: $DEPLOY_VERSION"
