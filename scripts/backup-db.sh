#!/usr/bin/env sh
# Creates a compressed PostgreSQL backup, verifies it is readable and prunes old backups.
# Usage: scripts/backup-db.sh [container] [retention_days]
# Schedule it daily (cron, systemd timer or Task Scheduler) and copy backups/ off the machine.
set -eu

CONTAINER="${1:-moneypilot-postgres}"
RETENTION_DAYS="${2:-14}"
BACKUP_DIR="$(dirname "$0")/../backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/moneypilot-$STAMP.dump"

mkdir -p "$BACKUP_DIR"
# Credentials come from the container's own environment; nothing secret is passed here.
docker exec "$CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$FILE.partial"
mv "$FILE.partial" "$FILE"

# A dump that pg_restore cannot list is useless; fail loudly instead of keeping it.
docker exec -i "$CONTAINER" pg_restore --list < "$FILE" > /dev/null

find "$BACKUP_DIR" -name 'moneypilot-*.dump' -type f -mtime +"$RETENTION_DAYS" -delete
echo "Backup written to $FILE"
