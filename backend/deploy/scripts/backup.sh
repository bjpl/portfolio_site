#!/bin/bash

# Portfolio Backend Backup Script
# Automated database and file backups for production environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
LOG_FILE="${LOG_FILE:-/var/log/portfolio-backup.log}"

# Default settings
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-portfolio_production}"
DB_USER="${DB_USER:-portfolio_user}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_COMPRESS="${BACKUP_COMPRESS:-true}"
S3_BUCKET="${S3_BUCKET:-}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE=$(date +"%Y-%m-%d %H:%M:%S")

# Logging function
log() {
    echo "[$DATE] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$DATE] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local emoji
        case "$status" in
            success) emoji=":white_check_mark:" ;;
            failure) emoji=":x:" ;;
            warning) emoji=":warning:" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji Portfolio Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Create backup directories
create_backup_dirs() {
    log "Creating backup directories..."
    
    mkdir -p "$BACKUP_DIR"/{database,uploads,logs,config}
    
    if [[ ! -w "$BACKUP_DIR" ]]; then
        log_error "Backup directory is not writable: $BACKUP_DIR"
        exit 1
    fi
}

# Backup database
backup_database() {
    log "Starting database backup..."
    
    local backup_file="$BACKUP_DIR/database/portfolio_db_$TIMESTAMP.sql"
    
    # Create database dump
    if PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --clean \
        --if-exists \
        --create \
        > "$backup_file" 2>/dev/null; then
        
        log "Database backup completed: $backup_file"
        
        # Compress if enabled
        if [[ "$BACKUP_COMPRESS" == "true" ]]; then
            log "Compressing database backup..."
            gzip "$backup_file"
            backup_file="${backup_file}.gz"
        fi
        
        # Get file size
        local file_size=$(du -h "$backup_file" | cut -f1)
        log "Database backup size: $file_size"
        
        echo "$backup_file"
    else
        log_error "Database backup failed"
        return 1
    fi
}

# Backup uploaded files
backup_uploads() {
    log "Starting uploads backup..."
    
    local uploads_dir="/app/uploads"
    local backup_file="$BACKUP_DIR/uploads/uploads_$TIMESTAMP.tar"
    
    if [[ -d "$uploads_dir" ]] && [[ "$(ls -A "$uploads_dir" 2>/dev/null)" ]]; then
        if tar -cf "$backup_file" -C "$(dirname "$uploads_dir")" "$(basename "$uploads_dir")" 2>/dev/null; then
            log "Uploads backup completed: $backup_file"
            
            # Compress if enabled
            if [[ "$BACKUP_COMPRESS" == "true" ]]; then
                log "Compressing uploads backup..."
                gzip "$backup_file"
                backup_file="${backup_file}.gz"
            fi
            
            # Get file size
            local file_size=$(du -h "$backup_file" | cut -f1)
            log "Uploads backup size: $file_size"
            
            echo "$backup_file"
        else
            log_error "Uploads backup failed"
            return 1
        fi
    else
        log "No uploads directory found or directory is empty"
        echo ""
    fi
}

# Backup application logs
backup_logs() {
    log "Starting logs backup..."
    
    local logs_dir="/app/logs"
    local backup_file="$BACKUP_DIR/logs/logs_$TIMESTAMP.tar"
    
    if [[ -d "$logs_dir" ]] && [[ "$(ls -A "$logs_dir" 2>/dev/null)" ]]; then
        if tar -cf "$backup_file" -C "$(dirname "$logs_dir")" "$(basename "$logs_dir")" 2>/dev/null; then
            log "Logs backup completed: $backup_file"
            
            # Compress if enabled
            if [[ "$BACKUP_COMPRESS" == "true" ]]; then
                log "Compressing logs backup..."
                gzip "$backup_file"
                backup_file="${backup_file}.gz"
            fi
            
            # Get file size
            local file_size=$(du -h "$backup_file" | cut -f1)
            log "Logs backup size: $file_size"
            
            echo "$backup_file"
        else
            log_error "Logs backup failed"
            return 1
        fi
    else
        log "No logs directory found or directory is empty"
        echo ""
    fi
}

# Backup configuration files
backup_config() {
    log "Starting configuration backup..."
    
    local config_dir="/app/config"
    local backup_file="$BACKUP_DIR/config/config_$TIMESTAMP.tar"
    
    if [[ -d "$config_dir" ]] && [[ "$(ls -A "$config_dir" 2>/dev/null)" ]]; then
        if tar -cf "$backup_file" -C "$(dirname "$config_dir")" "$(basename "$config_dir")" 2>/dev/null; then
            log "Configuration backup completed: $backup_file"
            
            # Compress if enabled
            if [[ "$BACKUP_COMPRESS" == "true" ]]; then
                log "Compressing configuration backup..."
                gzip "$backup_file"
                backup_file="${backup_file}.gz"
            fi
            
            echo "$backup_file"
        else
            log_error "Configuration backup failed"
            return 1
        fi
    else
        log "No configuration directory found"
        echo ""
    fi
}

# Upload to S3 (if configured)
upload_to_s3() {
    local backup_file="$1"
    
    if [[ -z "$S3_BUCKET" ]] || [[ ! -f "$backup_file" ]]; then
        return 0
    fi
    
    log "Uploading backup to S3: $backup_file"
    
    local s3_key="backups/$(date +%Y/%m/%d)/$(basename "$backup_file")"
    
    if aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" 2>/dev/null; then
        log "S3 upload completed: s3://$S3_BUCKET/$s3_key"
    else
        log_error "S3 upload failed for: $backup_file"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    
    # Clean local backups
    find "$BACKUP_DIR" -type f -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean S3 backups (if configured)
    if [[ -n "$S3_BUCKET" ]]; then
        local cutoff_date=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y-%m-%d)
        aws s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "backups/" --query "Contents[?LastModified<='${cutoff_date}'].Key" --output text | \
        while read -r key; do
            if [[ -n "$key" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$key" 2>/dev/null || true
            fi
        done
    fi
    
    log "Cleanup completed"
}

# Generate backup manifest
generate_manifest() {
    local db_backup="$1"
    local uploads_backup="$2"
    local logs_backup="$3"
    local config_backup="$4"
    
    local manifest_file="$BACKUP_DIR/manifest_$TIMESTAMP.json"
    
    cat > "$manifest_file" << EOF
{
    "timestamp": "$TIMESTAMP",
    "date": "$DATE",
    "environment": "${NODE_ENV:-production}",
    "hostname": "$(hostname)",
    "backups": {
        "database": {
            "file": "$(basename "$db_backup" 2>/dev/null || echo "null")",
            "size": "$(du -h "$db_backup" 2>/dev/null | cut -f1 || echo "0")",
            "compressed": $BACKUP_COMPRESS
        },
        "uploads": {
            "file": "$(basename "$uploads_backup" 2>/dev/null || echo "null")",
            "size": "$(du -h "$uploads_backup" 2>/dev/null | cut -f1 || echo "0")",
            "compressed": $BACKUP_COMPRESS
        },
        "logs": {
            "file": "$(basename "$logs_backup" 2>/dev/null || echo "null")",
            "size": "$(du -h "$logs_backup" 2>/dev/null | cut -f1 || echo "0")",
            "compressed": $BACKUP_COMPRESS
        },
        "config": {
            "file": "$(basename "$config_backup" 2>/dev/null || echo "null")",
            "size": "$(du -h "$config_backup" 2>/dev/null | cut -f1 || echo "0")",
            "compressed": $BACKUP_COMPRESS
        }
    },
    "retention_days": $BACKUP_RETENTION_DAYS,
    "s3_bucket": "$S3_BUCKET"
}
EOF
    
    log "Backup manifest created: $manifest_file"
    echo "$manifest_file"
}

# Verify backups
verify_backups() {
    local db_backup="$1"
    local uploads_backup="$2"
    local logs_backup="$3"
    local config_backup="$4"
    
    log "Verifying backups..."
    
    local errors=0
    
    # Verify database backup
    if [[ -n "$db_backup" ]] && [[ -f "$db_backup" ]]; then
        if [[ "$db_backup" == *.gz ]]; then
            if ! gzip -t "$db_backup" 2>/dev/null; then
                log_error "Database backup file is corrupted: $db_backup"
                errors=$((errors + 1))
            fi
        else
            if [[ ! -s "$db_backup" ]]; then
                log_error "Database backup file is empty: $db_backup"
                errors=$((errors + 1))
            fi
        fi
    else
        log_error "Database backup file not found or not specified"
        errors=$((errors + 1))
    fi
    
    # Verify other backups if they exist
    for backup in "$uploads_backup" "$logs_backup" "$config_backup"; do
        if [[ -n "$backup" ]] && [[ -f "$backup" ]]; then
            if [[ "$backup" == *.gz ]]; then
                if ! gzip -t "$backup" 2>/dev/null; then
                    log_error "Backup file is corrupted: $backup"
                    errors=$((errors + 1))
                fi
            fi
        fi
    done
    
    if [[ $errors -eq 0 ]]; then
        log "All backups verified successfully"
        return 0
    else
        log_error "Backup verification failed with $errors errors"
        return 1
    fi
}

# Main backup function
main() {
    log "=== Starting Portfolio Backend Backup Process ==="
    
    local start_time=$(date +%s)
    local success=true
    
    # Create backup directories
    create_backup_dirs
    
    # Perform backups
    local db_backup=""
    local uploads_backup=""
    local logs_backup=""
    local config_backup=""
    
    # Database backup (critical)
    if db_backup=$(backup_database); then
        log "Database backup successful"
    else
        log_error "Database backup failed"
        success=false
    fi
    
    # Other backups (non-critical)
    uploads_backup=$(backup_uploads) || log "Uploads backup skipped"
    logs_backup=$(backup_logs) || log "Logs backup skipped"
    config_backup=$(backup_config) || log "Config backup skipped"
    
    # Verify backups
    if ! verify_backups "$db_backup" "$uploads_backup" "$logs_backup" "$config_backup"; then
        success=false
    fi
    
    # Generate manifest
    local manifest_file
    manifest_file=$(generate_manifest "$db_backup" "$uploads_backup" "$logs_backup" "$config_backup")
    
    # Upload to S3 if configured
    if [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3 "$db_backup" || log "S3 upload failed for database backup"
        [[ -n "$uploads_backup" ]] && upload_to_s3 "$uploads_backup"
        [[ -n "$logs_backup" ]] && upload_to_s3 "$logs_backup"
        [[ -n "$config_backup" ]] && upload_to_s3 "$config_backup"
        upload_to_s3 "$manifest_file" || log "S3 upload failed for manifest"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ "$success" == "true" ]]; then
        log "=== Backup Process Completed Successfully (${duration}s) ==="
        send_notification "success" "Portfolio backend backup completed in ${duration}s"
    else
        log_error "=== Backup Process Completed With Errors (${duration}s) ==="
        send_notification "failure" "Portfolio backend backup completed with errors"
        exit 1
    fi
}

# Handle signals
trap 'log "Backup interrupted"; send_notification "failure" "Portfolio backup was interrupted"; exit 130' INT TERM

# Run main function
main "$@"