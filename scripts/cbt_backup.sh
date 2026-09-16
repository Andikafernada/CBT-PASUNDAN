#!/bin/bash
# ==============================================================================
# CBT HEBAT SMK Pasundan 2 Bandung - Automated Database Backup Script
# Sysadmin Automation / Disaster Recovery
# ==============================================================================

set -e

BACKUP_DIR="/var/backups/cbt"
LOG_FILE="/var/log/cbt_backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/cbt_backup_${TIMESTAMP}.sql.gz"

DB_HOST="172.16.0.211"
DB_USER="cbtuser"
DB_PASS="cbtpassword2026"
DB_NAME="zyacbt_modern"

mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting automated CBT database backup..." >> "$LOG_FILE"

# Run mysqldump with compression
if MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -u "$DB_USER" --single-transaction --quick "$DB_NAME" | gzip -9 > "$BACKUP_FILE"; then
  # Test gzip integrity
  if gzip -t "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Backup SUCCESS: ${BACKUP_FILE} (Size: ${FILE_SIZE})" >> "$LOG_FILE"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Backup archive corrupted!" >> "$LOG_FILE"
    exit 1
  fi
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Backup FAILED during mysqldump execution!" >> "$LOG_FILE"
  exit 1
fi

# Rotate backups older than 7 days
find "$BACKUP_DIR" -name "cbt_backup_*.sql.gz" -type f -mtime +7 -exec rm -f {} \;
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Retention check: Old backups (>7 days) cleaned up." >> "$LOG_FILE"
