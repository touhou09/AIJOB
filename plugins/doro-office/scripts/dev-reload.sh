#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd -- "$PLUGIN_DIR/../.." && pwd)"
PLUGIN_KEY="${PLUGIN_KEY:-dororong.doro-office}"
PLUGIN_PATH="${PLUGIN_PATH:-$PLUGIN_DIR}"
PLUGIN_PATH="$(cd -- "$PLUGIN_PATH" && pwd)"

start_ts="$(python3 - <<'PY'
import time
print(time.time())
PY
)"

installed_json="$(cd "$REPO_ROOT" && paperclipai plugin inspect "$PLUGIN_KEY" --json 2>/dev/null || true)"
installed_path=""
if [ -n "$installed_json" ]; then
  installed_path="$(printf '%s' "$installed_json" | python3 -c 'import json,sys
try:
    data=json.load(sys.stdin)
except Exception:
    print("")
else:
    print(data.get("packagePath", ""))')"
fi

cd "$PLUGIN_DIR"
echo "[dev-reload] build start: $PLUGIN_DIR"
npm run build

if [ "$installed_path" = "$PLUGIN_PATH" ]; then
  echo "[dev-reload] source-linked install detected; skip reinstall"
else
  cd "$REPO_ROOT"
  if [ -n "$installed_json" ]; then
    echo "[dev-reload] relink plugin install: $PLUGIN_KEY"
    paperclipai plugin uninstall "$PLUGIN_KEY" --json >/dev/null
  else
    echo "[dev-reload] plugin not installed yet: $PLUGIN_KEY"
  fi

  echo "[dev-reload] install local plugin: $PLUGIN_PATH"
  paperclipai plugin install --local "$PLUGIN_PATH" --json >/dev/null
fi

duration="$(python3 - "$start_ts" <<'PY'
import sys, time
start = float(sys.argv[1])
print(f"{time.time() - start:.2f}")
PY
)"

echo "[dev-reload] done in ${duration}s"
echo "[dev-reload] next: refresh the Paperclip browser tab to load the updated UI bundle"
