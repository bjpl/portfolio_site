#!/bin/sh
# Portfolio Database Backup Script
# Runs daily backups with rotation

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-portfolio_db}"
DB_USER="${DB_USER:-portfolio_user}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
S3_BUCKET="${S3_BACKUP_BUCKET}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to send notifications
notify() {
    local message="$1"
    local status="${2:-info}"
    
    # Send to logs
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$status] $message"
    
    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[$status] Portfolio Backup: $message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Function to perform backup
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/backup_${timestamp}.sql"
    local backup_archive="$BACKUP_DIR/backup_${timestamp}.tar.gz"
    
    notify "Starting database backup" "info"
    
    # Perform database dump
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password --verbose --clean --if-exists \
        --exclude-table-data='analytics.page_views' \
        --exclude-table-data='auth.sessions' \
        > "$backup_file" 2>/dev/null; then
        
        # Compress the backup
        tar -czf "$backup_archive" -C "$BACKUP_DIR" "backup_${timestamp}.sql"
        rm "$backup_file"
        
        # Get backup size
        backup_size=$(du -h "$backup_archive" | cut -f1)
        notify "Database backup completed successfully (Size: $backup_size)" "success"
        
        # Upload to S3 if configured
        if [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$backup_archive" "$timestamp"
        fi
        
        return 0
    else
        notify "Database backup failed" "error"
        return 1
    fi
}

# Function to upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local timestamp="$2"
    
    if command -v aws >/dev/null 2>&1; then
        notify "Uploading backup to S3" "info"
        
        if aws s3 cp "$backup_file" "s3://$S3_BUCKET/database/backup_${timestamp}.tar.gz"; then
            notify "Backup uploaded to S3 successfully" "success"
        else
            notify "Failed to upload backup to S3" "warning"
        fi
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    notify "Cleaning up old backups (retention: $RETENTION_DAYS days)" "info"
    
    # Clean local backups
    find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Clean S3 backups if configured
    if [ -n "$S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
        aws s3 ls "s3://$S3_BUCKET/database/" | while read -r line; do
            file_date=$(echo "$line" | awk '{print $1}')
            file_name=$(echo "$line" | awk '{print $4}')
            
            if [ -n "$file_name" ]; then
                file_age=$(( ($(date +%s) - $(date -d "$file_date" +%s)) / 86400 ))
                if [ "$file_age" -gt "$RETENTION_DAYS" ]; then
                    aws s3 rm "s3://$S3_BUCKET/database/$file_name"
                fi
            fi
        done
    fi
    
    # Report remaining backups
    local backup_count=$(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | wc -l)
    notify "Cleanup completed. $backup_count backups remaining" "info"
}

# Function to verify backup integrity
verify_backup() {
    local latest_backup=$(ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | head -1)
    
    if [ -n "$latest_backup" ]; then
        notify "Verifying backup integrity" "info"
        
        # Extract and check if SQL file is valid
        temp_dir=$(mktemp -d)
        tar -xzf "$latest_backup" -C "$temp_dir"
        
        sql_file=$(find "$temp_dir" -name "*.sql" | head -1)
        if [ -f "$sql_file" ]; then
            # Check if file contains expected PostgreSQL dump header
            if head -n 5 "$sql_file" | grep -q "PostgreSQL database dump"; then
                notify "Backup verification successful" "success"
                rm -rf "$temp_dir"
                return 0
            fi
        fi
        
        rm -rf "$temp_dir"
        notify "Backup verification failed" "error"
        return 1
    else
        notify "No backup file found to verify" "warning"
        return 1
    fi
}

# Main backup routine
main() {
    notify "Portfolio backup script started" "info"
    
    # Wait for database to be ready
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
        echo "Waiting for database to be ready..."
        sleep 5
    done
    
    # Run backup loop
    while true; do
        # Perform backup
        if backup_database; then
            # Verify the backup
            verify_backup
            
            # Clean old backups
            cleanup_old_backups
        fi
        
        # Calculate next backup time (default: daily at 3 AM)
        current_hour=$(date +%H)
        if [ "$current_hour" -ge 3 ]; then
            # Next backup tomorrow at 3 AM
            sleep_seconds=$(( (27 - current_hour) * 3600 ))
        else
            # Next backup today at 3 AM
            sleep_seconds=$(( (3 - current_hour) * 3600 ))
        fi
        
        notify "Next backup scheduled in $(( sleep_seconds / 3600 )) hours" "info"
        sleep $sleep_seconds
    done
}

# Handle signals for graceful shutdown
trap 'notify "Backup script shutting down" "info"; exit 0' SIGTERM SIGINT

# Start main routine
main