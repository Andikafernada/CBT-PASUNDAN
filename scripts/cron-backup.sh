#!/bin/bash
set -e

BACKUP_DIR="/var/backups/cbt"
mkdir -p "$BACKUP_DIR"

DB_HOST="172.16.0.211"
DB_USER="cbtuser"
DB_PASS="cbtpassword2026"
DB_NAME="zyacbt_modern"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting MariaDB CBT Backup to $BACKUP_FILE..."
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --single-transaction --quick --routines --triggers "$DB_NAME" | gzip -6 > "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup completed successfully: $BACKUP_FILE ($FILE_SIZE)"

# Retain backups for 7 days
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +7 -delete
echo "[$(date)] Cleaned up backups older than 7 days."
