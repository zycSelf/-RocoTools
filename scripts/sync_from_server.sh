#!/bin/bash
# ============================================================
# sync_from_server.sh
# Sync database and images from remote server to local dev env
# Usage: bash scripts/sync_from_server.sh [--db] [--images] [--all] [--since N]
# ============================================================

set -e

# ---- Configuration ----
LOCAL_PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

# Load .env if exists (for REMOTE_USER, REMOTE_HOST, REMOTE_PROJECT)
ENV_FILE="${LOCAL_PROJECT}/scripts/.env"
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
fi

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

# Defaults (override via scripts/.env or environment variables)
REMOTE_USER="${REMOTE_USER:-}"
REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_PROJECT="${REMOTE_PROJECT:-}"

if [ -z "$REMOTE_HOST" ] || [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_PROJECT" ]; then
  error "Server config not set. Please create scripts/.env with:\n  REMOTE_USER=youruser\n  REMOTE_HOST=your.server.ip\n  REMOTE_PROJECT=/path/to/project\n\nSee scripts/.env.example for reference."
fi

REMOTE_DB="${REMOTE_PROJECT}/app/server/data/roco.db"
LOCAL_DB="${LOCAL_PROJECT}/app/server/data/roco.db"

REMOTE_DATA="${REMOTE_PROJECT}/data"
REMOTE_PUBLIC="${REMOTE_DATA}/public/"
LOCAL_PUBLIC="${LOCAL_PROJECT}/data/public/"

REMOTE_UPLOADS="${REMOTE_DATA}/uploads/"
LOCAL_UPLOADS="${LOCAL_PROJECT}/data/uploads/"

REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

# Incremental sync: days to look back (0 = full sync)
SINCE_DAYS=0
FORCE_FULL=false

# Timestamp file for tracking last sync
SYNC_TIMESTAMP_FILE="${LOCAL_PROJECT}/scripts/.last_image_sync"

# Check if rsync is available AND functional (on Windows, rsync.exe may exist but lack DLLs)
HAS_RSYNC=false
if command -v rsync &>/dev/null && rsync --version &>/dev/null; then
  HAS_RSYNC=true
else
  warn "rsync not available or broken, will use scp fallback."
fi

sync_db() {
  info "Syncing database..."
  
  # Backup local DB before overwriting
  BACKUP_NAME=""
  if [ -f "$LOCAL_DB" ]; then
    BACKUP_NAME="roco_local_backup_$(date +%Y%m%d_%H%M%S).db"
    cp "$LOCAL_DB" "${LOCAL_PROJECT}/app/server/data/${BACKUP_NAME}"
    ok "Local DB backed up as: ${BACKUP_NAME}"
  fi

  # Create a safe snapshot on server using better-sqlite3 backup API
  # First checkpoint WAL to merge pending writes, then backup
  REMOTE_SNAPSHOT="/tmp/roco_snapshot_$$.db"
  mkdir -p "$(dirname "$LOCAL_DB")"
  info "Creating safe DB snapshot on server..."
  ssh "${REMOTE}" "cd ${REMOTE_PROJECT}/app/server && node -e \"
    const Database = require('better-sqlite3');
    const db = new Database('data/roco.db');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.backup('${REMOTE_SNAPSHOT}').then(() => { db.close(); console.log('BACKUP_OK'); }).catch(e => { db.close(); console.error('BACKUP_FAIL:' + e.message); process.exit(1); });
  \"" || {
    warn "Node.js backup failed, falling back to direct scp..."
    REMOTE_SNAPSHOT="${REMOTE_DB}"
  }

  # Download the snapshot
  info "Downloading database from server..."
  # Remove stale WAL/SHM files before overwriting (they belong to the old DB)
  rm -f "${LOCAL_DB}-wal" "${LOCAL_DB}-shm"
  scp "${REMOTE}:${REMOTE_SNAPSHOT}" "$LOCAL_DB"
  ok "Downloaded: $(du -h "$LOCAL_DB" | cut -f1)"

  # Cleanup remote snapshot (if it's not the original DB)
  if [ "$REMOTE_SNAPSHOT" != "${REMOTE_DB}" ]; then
    ssh "${REMOTE}" "rm -f ${REMOTE_SNAPSHOT}" 2>/dev/null || true
  fi

  # Verify integrity after download
  info "Verifying database integrity..."
  VERIFY_RESULT=$(cd "${LOCAL_PROJECT}/app/server" && node -e "
    try {
      const db = require('better-sqlite3')('data/roco.db', {readonly:true});
      const r = db.pragma('integrity_check');
      if (r[0].integrity_check === 'ok') {
        const pets = db.prepare('SELECT COUNT(*) as c FROM pets').get();
        console.log('OK:' + pets.c + ' pets');
      } else {
        console.log('CORRUPT:' + r[0].integrity_check);
      }
      db.close();
    } catch(e) {
      console.log('ERROR:' + e.message);
    }
  " 2>&1)

  if [[ "$VERIFY_RESULT" == OK:* ]]; then
    ok "Database verified! (${VERIFY_RESULT})"
  else
    warn "Downloaded DB is corrupt: ${VERIFY_RESULT}"
    # Restore from backup
    if [ -n "$BACKUP_NAME" ] && [ -f "${LOCAL_PROJECT}/app/server/data/${BACKUP_NAME}" ]; then
      cp "${LOCAL_PROJECT}/app/server/data/${BACKUP_NAME}" "$LOCAL_DB"
      warn "Restored local backup: ${BACKUP_NAME}"
    fi
    error "Database sync failed. The server DB may be locked or corrupt. Try again later."
  fi

  ok "Database synced successfully!"
}

# Determine how many days to sync (auto-detect from last sync timestamp)
get_sync_days() {
  if $FORCE_FULL; then
    echo "0"
    return
  fi
  if [ "$SINCE_DAYS" -gt 0 ]; then
    echo "$SINCE_DAYS"
    return
  fi
  # Auto-detect from last sync timestamp
  if [ -f "$SYNC_TIMESTAMP_FILE" ]; then
    LAST_SYNC=$(cat "$SYNC_TIMESTAMP_FILE")
    NOW=$(date +%s)
    DIFF=$(( (NOW - LAST_SYNC) / 86400 + 1 ))
    echo "$DIFF"
  else
    echo "0"  # No previous sync, do full
  fi
}

# Save current timestamp after successful sync
save_sync_timestamp() {
  date +%s > "$SYNC_TIMESTAMP_FILE"
}

sync_images() {
  if $HAS_RSYNC; then
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
  else
    # No rsync: diff-based incremental sync
    # 1. Generate local file list
    # 2. Upload to server, compare with remote files
    # 3. Server packs only missing/changed files
    # 4. Download and extract

    LOCAL_DATA="${LOCAL_PROJECT}/data"
    REMOTE_TAR="/tmp/roco_sync_images_$$.tar.gz"
    LOCAL_TAR="${LOCAL_PROJECT}/temp/roco_sync_images.tar.gz"
    LOCAL_LIST="${LOCAL_PROJECT}/temp/.local_files.txt"
    REMOTE_LIST_PATH="/tmp/roco_local_files_$$.txt"
    mkdir -p "${LOCAL_PROJECT}/temp"
    mkdir -p "$LOCAL_PUBLIC"
    mkdir -p "$LOCAL_UPLOADS"

    if $FORCE_FULL; then
      # Full sync: skip diff, download everything
      info "Syncing images (full tar+scp)..."
      info "  Creating full archive on server..."
      SSH_OUTPUT=$(ssh "${REMOTE}" << REMOTE_SCRIPT
        cd ${REMOTE_DATA}
        tar czf ${REMOTE_TAR} --exclude=.thumbs public/ uploads/ 2>/dev/null
        echo "DONE:\$(du -h ${REMOTE_TAR} | cut -f1)"
REMOTE_SCRIPT
      )
      info "  Server: ${SSH_OUTPUT}"
    else
      # Incremental: compare file lists
      info "Syncing images (diff-based incremental)..."

      # Step 1: Generate local file list (relative paths from data/)
      info "  Generating local file list..."
      (cd "$LOCAL_DATA" && find public/ uploads/ -type f ! -path '*/.thumbs/*' 2>/dev/null | LC_ALL=C sort) > "$LOCAL_LIST"
      LOCAL_COUNT=$(wc -l < "$LOCAL_LIST" | tr -d ' ')
      info "  Local files: ${LOCAL_COUNT}"

      # Step 2: Upload local list to server and diff
      info "  Comparing with server..."
      scp "$LOCAL_LIST" "${REMOTE}:${REMOTE_LIST_PATH}"

      DIFF_FILE="/tmp/roco_diff_${RANDOM}.txt"
      SSH_OUTPUT=$(ssh "${REMOTE}" bash -s "${REMOTE_DATA}" "${REMOTE_LIST_PATH}" "${REMOTE_TAR}" "${DIFF_FILE}" << 'REMOTE_SCRIPT'
        RDATA="$1"
        LOCAL_LIST_PATH="$2"
        RTAR="$3"
        RDIFF="$4"
        set -e
        cd "$RDATA"

        # Use Python to compute diff (avoids all shell sort/comm issues)
        python3 - "$LOCAL_LIST_PATH" "$RDIFF" << 'PYEOF'
import sys, os
local_list_path = sys.argv[1]
diff_path = sys.argv[2]
data_dir = os.getcwd()

with open(local_list_path) as f:
    local_files = set(line.strip() for line in f if line.strip())

remote_files = []
for root, dirs, files in os.walk('.'):
    # skip .thumbs directories
    dirs[:] = [d for d in dirs if d != '.thumbs']
    for fname in files:
        rel = os.path.join(root, fname).lstrip('./')
        rel = rel.replace('\\', '/')
        remote_files.append(rel)

diff = [f for f in remote_files if f not in local_files]
with open(diff_path, 'w') as f:
    f.write('\n'.join(diff))
print('REMOTE_COUNT:' + str(len(remote_files)))
print('DIFF_COUNT:' + str(len(diff)))
PYEOF

        # Check if diff is empty
        if [ ! -s "$RDIFF" ]; then
          echo "NO_CHANGES"
          rm -f "$LOCAL_LIST_PATH" "$RDIFF"
          exit 0
        fi

        # Pack only the diff files
        tar czf "$RTAR" -T "$RDIFF" 2>/dev/null
        echo "DONE:$(du -h "$RTAR" | cut -f1)"
        rm -f "$LOCAL_LIST_PATH" "$RDIFF"
REMOTE_SCRIPT
      )

      # Check if there were changes
      if [[ "$SSH_OUTPUT" == *"NO_CHANGES"* ]]; then
        ok "No new files on server. Already up to date!"
        save_sync_timestamp
        rm -f "$LOCAL_LIST"
        return
      fi

      info "  Server: ${SSH_OUTPUT}"
      rm -f "$LOCAL_LIST"
    fi

    # Download the archive
    info "  Downloading archive..."
    scp "${REMOTE}:${REMOTE_TAR}" "$LOCAL_TAR"
    ok "  Downloaded: $(du -h "$LOCAL_TAR" | cut -f1)"

    # Extract locally
    info "  Extracting to local..."
    tar xzf "$LOCAL_TAR" -C "${LOCAL_PROJECT}/data/"
    ok "  Extracted successfully"

    # Cleanup
    rm -f "$LOCAL_TAR"
    ssh "${REMOTE}" "rm -f ${REMOTE_TAR}" 2>/dev/null || true
    info "  Cleaned up temp files"
  fi

  save_sync_timestamp
  ok "All images synced successfully!"
}

sync_seasons() {
  info "Syncing season backup files..."
  REMOTE_SEASONS="${REMOTE_PROJECT}/app/server/data/backups/seasons/"
  LOCAL_SEASONS="${LOCAL_PROJECT}/temp/seasons/"
  mkdir -p "$LOCAL_SEASONS"
  if $HAS_RSYNC; then
    rsync -avz --progress \
      "${REMOTE}:${REMOTE_SEASONS}" "$LOCAL_SEASONS"
  else
    scp -r "${REMOTE}:${REMOTE_SEASONS}." "$LOCAL_SEASONS"
  fi
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
  echo "  --full      Force full sync (ignore last sync timestamp)"
  echo "  --since N   Only sync files modified in last N days (use with --images)"
  echo "  --help      Show this help message"
  echo ""
  echo "Examples:"
  echo "  bash scripts/sync_from_server.sh --db"
  echo "  bash scripts/sync_from_server.sh --images"
  echo "  bash scripts/sync_from_server.sh --images --since 7"
  echo "  bash scripts/sync_from_server.sh --images --full"
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

while [ $# -gt 0 ]; do
  case $1 in
    --db)      DO_DB=true ;;
    --images)  DO_IMAGES=true ;;
    --seasons) DO_SEASONS=true ;;
    --all)     DO_DB=true; DO_IMAGES=true; DO_SEASONS=true ;;
    --since)   shift; SINCE_DAYS="${1:-7}" ;;
    --full)    FORCE_FULL=true ;;
    --help)    show_help; exit 0 ;;
    *)         error "Unknown option: $1. Use --help for usage." ;;
  esac
  shift
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
