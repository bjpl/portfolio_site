# Stop All Services - PowerShell Script
Write-Host "🛑 Stopping Hugo Management System" -ForegroundColor Red
Write-Host "=================================" -ForegroundColor Red

# Kill Node processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill Hugo process
Write-Host "Stopping Hugo server..." -ForegroundColor Yellow
Get-Process hugo -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "✅ All services stopped" -ForegroundColor Green
