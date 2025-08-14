# Test API Endpoints - PowerShell Script
Write-Host "🧪 Testing API Endpoints" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# Test health endpoint
Write-Host "`nTesting Health Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health Check: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
}

# Test dashboard stats
Write-Host "`nTesting Dashboard Stats..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method Get
    Write-Host "✅ Stats Retrieved: $($response.posts) posts, $($response.drafts) drafts" -ForegroundColor Green
} catch {
    Write-Host "❌ Stats Failed: $_" -ForegroundColor Red
}

# Test content list
Write-Host "`nTesting Content List..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/review/content?limit=5" -Method Get
    Write-Host "✅ Content List: $($response.Count) items retrieved" -ForegroundColor Green
} catch {
    Write-Host "❌ Content List Failed: $_" -ForegroundColor Red
}

# Test WebSocket connection
Write-Host "`nTesting WebSocket..." -ForegroundColor Yellow
Write-Host "WebSocket test requires manual verification at ws://localhost:3001" -ForegroundColor Gray

Write-Host "`n✅ API Test Complete!" -ForegroundColor Green
