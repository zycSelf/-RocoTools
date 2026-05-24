#!/bin/bash
# ============================================================
# sync_from_server.sh
# Sync database and images from remote server to local dev env
# Usage: bash scripts/sync_from_server.sh [--db] [--images] [--all]
# ============================================================

set -e

# ---- Configuration ----
LOCAL_PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

# Load .env if exists (for REMOTE_USER, REMOTE_HOST, REMOTE_PROJECT)
ENV_FILE="${LOCAL_PROJECT}/scripts/.env"
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
fi

# Defaults (override via scripts/.env or environment variables)
REMOTE_USER="${REMOTE_USER:-}"
REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_PROJECT="${REMOTE_PROJECT:-}"

if [ -z "$REMOTE_HOST" ] || [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_PROJECT" ]; then
  error "Server config not set. Please create scripts/.env with:\n  REMOTE_USER=youruser\n  REMOTE_HOST=your.server.ip\n  REMOTE_PROJECT=/path/to/project\n\nSee scripts/.env.example for reference."
fi

REMOTE_DB="${REMOTE_PROJECT}/app/server/data/roco.db"
LOCAL_DB="${LOCAL_PROJECT}/app/server/data/roco.db"

REMOTE_PUBLIC="${REMOTE_PROJECT}/app/server/public/"
LOCAL_PUBLIC="${LOCAL_PROJECT}/app/server/public/"

REMOTE_UPLOADS="${REMOTE_PROJECT}/app/server/uploads/"
LOCAL_UPLOADS="${LOCAL_PROJECT}/app/server/uploads/"

REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

# ---- Colors ----
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# ---- Functions ----
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

sync_db() {
  info "Syncing database..."
  
  # Backup local DB before overwriting
  if [ -f "$LOCAL_DB" ]; then
    BACKUP_NAME="roco_local_backup_$(date +%Y%m%d_%H%M%S).db"
    cp "$LOCAL_DB" "${LOCAL_PROJECT}/app/server/data/${BACKUP_NAME}"
    ok "Local DB backed up as: ${BACKUP_NAME}"
  fi

  # Download remote DB
  mkdir -p "$(dirname "$LOCAL_DB")"
  scp "${REMOTE}:${REMOTE_DB}" "$LOCAL_DB"
  ok "Database synced successfully! ($(du -h "$LOCAL_DB" | cut -f1))"
}

sync_images() {
  info "Syncing images (rsync incremental)..."
  
  # Sync /public/ (pet images, skill icons, etc.)
  info "  -> public/ (pets, skills, elements...)"
  mkdir -p "$LOCAL_PUBLIC"
  rsync -avz --progress --exclude='.thumbs/' \
    "${REMOTE}:${REMOTE_PUBLIC}" "$LOCAL_PUBLIC"
  ok "  public/ synced"

  # Sync /uploads/ (user uploads, library, announcements)
  info "  -> uploads/ (library, announcements...)"
  mkdir -p "$LOCAL_UPLOADS"
  rsync -avz --progress \
    "${REMOTE}:${REMOTE_UPLOADS}" "$LOCAL_UPLOADS"
  ok "  uploads/ synced"

  ok "All images synced successfully!"
}

sync_seasons() {
  info "Syncing season backup files..."
  REMOTE_SEASONS="${REMOTE_PROJECT}/app/server/data/backups/seasons/"
  LOCAL_SEASONS="${LOCAL_PROJECT}/temp/seasons/"
  mkdir -p "$LOCAL_SEASONS"
  rsync -avz --progress \
    "${REMOTE}:${REMOTE_SEASONS}" "$LOCAL_SEASONS"
  ok "Season backups synced to temp/seasons/"
}

show_help() {
  echo ""
  echo "Usage: bash scripts/sync_from_server.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --db        Sync database only (roco.db)"
  echo "  --images    Sync images only (public/ + uploads/)"
  echo "  --seasons   Sync season backup files to temp/seasons/"
  echo "  --all       Sync everything (db + images + seasons)"
  echo "  --help      Show this help message"
  echo ""
  echo "Examples:"
  echo "  bash scripts/sync_from_server.sh --db"
  echo "  bash scripts/sync_from_server.sh --images"
  echo "  bash scripts/sync_from_server.sh --all"
  echo ""
  echo "Server: ${REMOTE}"
  echo "Remote: ${REMOTE_PROJECT}"
  echo "Local:  ${LOCAL_PROJECT}"
  echo ""
}

# ---- Main ----
if [ $# -eq 0 ]; then
  show_help
  exit 0
fi

DO_DB=false
DO_IMAGES=false
DO_SEASONS=false

for arg in "$@"; do
  case $arg in
    --db)      DO_DB=true ;;
    --images)  DO_IMAGES=true ;;
    --seasons) DO_SEASONS=true ;;
    --all)     DO_DB=true; DO_IMAGES=true; DO_SEASONS=true ;;
    --help)    show_help; exit 0 ;;
    *)         error "Unknown option: $arg. Use --help for usage." ;;
  esac
done

echo ""
echo "============================================"
echo "  RocoTools - Sync from Server"
echo "============================================"
echo ""

if $DO_DB; then
  sync_db
  echo ""
fi

if $DO_IMAGES; then
  sync_images
  echo ""
fi

if $DO_SEASONS; then
  sync_seasons
  echo ""
fi

echo "============================================"
ok "Sync complete!"
echo "============================================"
