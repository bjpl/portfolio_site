# Start All Services - PowerShell Script
Write-Host "🚀 Starting Hugo Management System" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if backend dependencies are installed
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    cd backend
    npm install
    cd ..
}

# Start backend services
Write-Host "`n📡 Starting Backend Services..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

# Wait for backend to start
Start-Sleep -Seconds 3

# Start WebSocket server
Write-Host "🔌 Starting WebSocket Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run ws" -WindowStyle Normal

# Wait for WebSocket to start
Start-Sleep -Seconds 2

# Start Hugo server
Write-Host "🎨 Starting Hugo Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "hugo server -D --navigateToChanged" -WindowStyle Normal

# Wait for Hugo to start
Start-Sleep -Seconds 3

# Open browser
Write-Host "`n✅ All services started!" -ForegroundColor Green
Write-Host "`nAccess points:" -ForegroundColor Cyan
Write-Host "  📊 Dashboard: http://localhost:1313/admin/dashboard.html" -ForegroundColor White
Write-Host "  ✅ Review Tool: http://localhost:1313/admin/review.html" -ForegroundColor White
Write-Host "  📤 Bulk Upload: http://localhost:1313/admin/bulk-upload.html" -ForegroundColor White
Write-Host "  🔧 API: http://localhost:3000/api/health" -ForegroundColor White
Write-Host "  🔌 WebSocket: ws://localhost:3001" -ForegroundColor White

# Open dashboard in browser
Start-Process "http://localhost:1313/admin/dashboard.html"

Write-Host "`nPress Ctrl+C in each window to stop services" -ForegroundColor Yellow
