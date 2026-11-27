#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ "$(git branch --show-current)" != main ]]; then
  printf 'Production deployments must run from main.\n' >&2
  exit 1
fi

if [[ ! -f .vercel/project.json && ! -f .vercel/repo.json ]]; then
  printf 'Link the project first: npx vercel link\n' >&2
  exit 1
fi

# Avoid overriding local settings or leaving downloaded production secrets behind.
backup_dir="$(mktemp -d)"
had_local_env=false
had_vercel_env=false
if [[ -f .env.local ]]; then
  mv .env.local "$backup_dir/local"
  had_local_env=true
fi
if [[ -f .vercel/.env.production.local ]]; then
  mv .vercel/.env.production.local "$backup_dir/production"
  had_vercel_env=true
fi
cleanup() {
  rm -f .vercel/.env.production.local
  if "$had_local_env"; then mv "$backup_dir/local" .env.local; fi
  if "$had_vercel_env"; then mv "$backup_dir/production" .vercel/.env.production.local; fi
  rmdir "$backup_dir"
}
trap cleanup EXIT

npx vercel pull --yes --environment=production
npx vercel build --prod
# As in PT dashboard, omit Git metadata so the deploy uses the CLI account.
GIT_DIR=/nonexistent npx vercel deploy --prebuilt --prod
