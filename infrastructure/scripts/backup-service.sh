#!/bin/bash
# Comprehensive backup service with monitoring and disaster recovery

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
LOG_FILE="/var/log/backup/backup.log"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
POSTGRES_HOST=${DB_HOST:-postgres}
POSTGRES_DB=${DB_NAME:-portfolio_db}
POSTGRES_USER=${DB_USER:-portfolio_user}
S3_BUCKET=${BACKUP_S3_BUCKET:-""}
ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-""}

# Metrics for monitoring
METRICS_FILE="/var/log/backup/metrics.prom"

# Initialize metrics file
init_metrics() {
    cat > "$METRICS_FILE" << EOF
# HELP backup_last_success_timestamp_seconds Last successful backup timestamp
# TYPE backup_last_success_timestamp_seconds gauge
backup_last_success_timestamp_seconds 0

# HELP backup_duration_seconds Backup duration in seconds
# TYPE backup_duration_seconds gauge
backup_duration_seconds 0

# HELP backup_size_bytes Backup size in bytes
# TYPE backup_size_bytes gauge
backup_size_bytes 0

# HELP backup_failures_total Total number of backup failures
# TYPE backup_failures_total counter
backup_failures_total 0
EOF
}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Update metrics
update_metric() {
    local metric="$1"
    local value="$2"
    sed -i "s/^$metric.*/$metric $value/" "$METRICS_FILE"
}

# Increment counter metric
increment_metric() {
    local metric="$1"
    local current=$(grep "^$metric" "$METRICS_FILE" | awk '{print $2}')
    local new_value=$((current + 1))
    update_metric "$metric" "$new_value"
}

# Database backup function
backup_database() {
    local start_time=$(date +%s)
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/postgres_backup_$timestamp.sql"
    
    log "Starting database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Perform database backup
    if pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --no-password --verbose > "$backup_file" 2>>"$LOG_FILE"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local size=$(stat -c%s "$backup_file")
        
        log "Database backup completed successfully: $backup_file"
        log "Backup size: $(numfmt --to=iec-i --suffix=B $size)"
        log "Duration: ${duration}s"
        
        # Update metrics
        update_metric "backup_last_success_timestamp_seconds" "$end_time"
        update_metric "backup_duration_seconds" "$duration"
        update_metric "backup_size_bytes" "$size"
        
        # Compress backup
        if command -v gzip &> /dev/null; then
            gzip "$backup_file"
            backup_file="${backup_file}.gz"
            log "Backup compressed: $backup_file"
        fi
        
        # Encrypt backup if key is provided
        if [ -n "$ENCRYPTION_KEY" ]; then
            if command -v gpg &> /dev/null; then
                echo "$ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 \
                    --symmetric --cipher-algo AES256 --output "${backup_file}.gpg" "$backup_file"
                rm "$backup_file"
                backup_file="${backup_file}.gpg"
                log "Backup encrypted: $backup_file"
            fi
        fi
        
        # Upload to S3 if configured
        if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
            log "Uploading backup to S3..."
            if aws s3 cp "$backup_file" "s3://$S3_BUCKET/database/$(basename "$backup_file")"; then
                log "Backup uploaded to S3 successfully"
                
                # Create a 'latest' symlink in S3
                aws s3 cp "$backup_file" "s3://$S3_BUCKET/database/latest.sql.gz"
            else
                log "Failed to upload backup to S3"
                increment_metric "backup_failures_total"
            fi
        fi
        
        return 0
    else
        log "Database backup failed"
        increment_metric "backup_failures_total"
        return 1
    fi
}

# File system backup function
backup_files() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/files_backup_$timestamp.tar.gz"
    local files_to_backup="/app/static/uploads /app/content /app/config"
    
    log "Starting file system backup..."
    
    if tar -czf "$backup_file" $files_to_backup 2>>"$LOG_FILE"; then
        local size=$(stat -c%s "$backup_file")
        log "File system backup completed: $backup_file"
        log "Backup size: $(numfmt --to=iec-i --suffix=B $size)"
        
        # Upload to S3 if configured
        if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
            aws s3 cp "$backup_file" "s3://$S3_BUCKET/files/$(basename "$backup_file")"
            log "File backup uploaded to S3"
        fi
        
        return 0
    else
        log "File system backup failed"
        increment_metric "backup_failures_total"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "*.sql*" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # S3 cleanup if configured
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        aws s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "database/" \
            --query "Contents[?LastModified<='$cutoff_date'].Key" --output text | \
            xargs -I {} aws s3 rm "s3://$S3_BUCKET/{}"
    fi
    
    log "Cleanup completed"
}

# Health check function
health_check() {
    local status_file="/tmp/backup_health"
    local last_backup=$(stat -c %Y "$BACKUP_DIR"/postgres_backup_*.sql* 2>/dev/null | sort -n | tail -1)
    local current_time=$(date +%s)
    local hours_since_backup=$(( (current_time - last_backup) / 3600 ))
    
    if [ $hours_since_backup -lt 25 ]; then
        echo "healthy" > "$status_file"
        return 0
    else
        echo "unhealthy: last backup was $hours_since_backup hours ago" > "$status_file"
        return 1
    fi
}

# Main backup function
run_backup() {
    log "=== Starting backup process ==="
    
    local success=true
    
    # Database backup
    if ! backup_database; then
        success=false
    fi
    
    # File system backup
    if ! backup_files; then
        success=false
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    if $success; then
        log "=== Backup process completed successfully ==="
        return 0
    else
        log "=== Backup process completed with errors ==="
        return 1
    fi
}

# Restore function for disaster recovery
restore_database() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "Error: Backup file $backup_file not found"
        return 1
    fi
    
    log "Starting database restoration from $backup_file..."
    
    # Decrypt if necessary
    if [[ "$backup_file" == *.gpg ]]; then
        if [ -n "$ENCRYPTION_KEY" ]; then
            echo "$ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 \
                --decrypt "$backup_file" > "${backup_file%.gpg}"
            backup_file="${backup_file%.gpg}"
        else
            log "Error: Encrypted backup but no decryption key provided"
            return 1
        fi
    fi
    
    # Decompress if necessary
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" > "${backup_file%.gz}"
        backup_file="${backup_file%.gz}"
    fi
    
    # Restore database
    if psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --no-password < "$backup_file"; then
        log "Database restoration completed successfully"
        return 0
    else
        log "Database restoration failed"
        return 1
    fi
}

# Disaster recovery test
test_disaster_recovery() {
    log "Starting disaster recovery test..."
    
    # Create test database
    local test_db="portfolio_dr_test_$(date +%s)"
    createdb -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$test_db"
    
    # Find latest backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/postgres_backup_*.sql* | head -1)
    
    if [ -z "$latest_backup" ]; then
        log "No backup found for disaster recovery test"
        return 1
    fi
    
    # Test restoration
    POSTGRES_DB="$test_db" restore_database "$latest_backup"
    local restore_result=$?
    
    # Cleanup test database
    dropdb -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$test_db"
    
    if [ $restore_result -eq 0 ]; then
        log "Disaster recovery test passed"
        return 0
    else
        log "Disaster recovery test failed"
        return 1
    fi
}

# Initialize
mkdir -p "$(dirname "$LOG_FILE")" "$BACKUP_DIR"
init_metrics

# Main execution
case "${1:-backup}" in
    "backup")
        run_backup
        ;;
    "restore")
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 restore <backup_file>"
            exit 1
        fi
        restore_database "$2"
        ;;
    "test-dr")
        test_disaster_recovery
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "daemon")
        # Run as daemon with cron-like scheduling
        while true; do
            # Check if it's backup time (default: 2 AM)
            local hour=$(date +%H)
            if [ "$hour" = "02" ]; then
                run_backup
                # Sleep for an hour to avoid running multiple times
                sleep 3600
            fi
            # Check every minute
            sleep 60
        done
        ;;
    *)
        echo "Usage: $0 {backup|restore|test-dr|health|cleanup|daemon}"
        exit 1
        ;;
esac