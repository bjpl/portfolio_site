# Launch Hugo Content Tools
Write-Host "Starting Hugo server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "hugo server -D"

# Wait for server to start
Start-Sleep -Seconds 3

# Open tools in browser
Write-Host "Opening tools dashboard..." -ForegroundColor Green
Start-Process "http://localhost:1313/tools/"

Write-Host "Tools are ready!" -ForegroundColor Cyan
Write-Host "Bulk Upload: http://localhost:1313/tools/bulk-upload/" -ForegroundColor Yellow
Write-Host "Content Review: http://localhost:1313/tools/content-review/" -ForegroundColor Yellow
