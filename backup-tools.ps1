# Backup content tools
$date = Get-Date -Format "yyyy-MM-dd-HHmm"
$backupPath = "backups/tools-backup-$date"

Write-Host "Creating backup..." -ForegroundColor Green
New-Item -ItemType Directory -Path $backupPath -Force

# Copy tools
Copy-Item -Path "static/tools" -Destination $backupPath -Recurse

Write-Host "Backup created at: $backupPath" -ForegroundColor Cyan
