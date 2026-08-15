#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/services/asr-mt"
PEER_DIR="$ROOT_DIR/webrtc/peer-server"

export APP_ENV="${APP_ENV:-local}"
export SESSION_SIGNING_KEY="${SESSION_SIGNING_KEY:-local-dev-only-session-signing-key}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173}"
export ASR_BACKEND="${ASR_BACKEND:-mock}"
export MT_BACKEND="${MT_BACKEND:-mock}"
export STORAGE_BACKEND="${STORAGE_BACKEND:-sqlite}"
export SQLITE_DB_PATH="${SQLITE_DB_PATH:-$BACKEND_DIR/runtime/asr-mt.sqlite3}"
export ASR_MT_HOST="${ASR_MT_HOST:-127.0.0.1}"
export ASR_MT_PORT="${ASR_MT_PORT:-3021}"
export PEER_HOST="${PEER_HOST:-127.0.0.1}"
export PEER_PORT="${PEER_PORT:-3022}"
export PEER_PATH="${PEER_PATH:-/peerjs}"
export PEER_ALLOWED_ORIGINS="${PEER_ALLOWED_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173}"

mkdir -p "$BACKEND_DIR/runtime"

if [ -f "$ROOT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env.local"
  set +a
fi

cleanup() {
  jobs -pr | xargs -r kill
}
trap cleanup EXIT INT TERM

(
  cd "$BACKEND_DIR"
  if [ -d ".venv" ]; then
    # shellcheck disable=SC1091
    . ".venv/bin/activate"
  fi
  uvicorn app.main:app --host "$ASR_MT_HOST" --port "$ASR_MT_PORT"
) &

(
  cd "$PEER_DIR"
  npm start
) &

wait
