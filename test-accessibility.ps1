# test-accessibility.ps1
# Comprehensive accessibility testing for Hugo portfolio

param(
    [string[]]$Routes = @('/', '/make/', '/learn/', '/think/', '/meet/'),
    [switch]$OpenReport,
    [switch]$Verbose
)

Write-Host "♿ Running Accessibility Test Suite" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if server is running
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:1313" -UseBasicParsing -TimeoutSec 2
    $serverRunning = $response.StatusCode -eq 200
} catch {
    $serverRunning = $false
}

if (-not $serverRunning) {
    Write-Host "❌ Hugo server not running!" -ForegroundColor Red
    Write-Host "   Start the server with: hugo server" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Server is running" -ForegroundColor Green

# Install dependencies if needed
$requiredPackages = @('puppeteer', 'axe-core', 'pa11y')
foreach ($package in $requiredPackages) {
    if (-not (Test-Path "node_modules\$package")) {
        Write-Host "Installing $package..." -ForegroundColor Yellow
        npm install $package
    }
}

# Run tests
Write-Host "`nRunning accessibility tests..." -ForegroundColor Cyan
node tools/accessibility/test-suite.js

# Check results
$reportPath = "test-results\accessibility\accessibility-report.html"
if (Test-Path $reportPath) {
    Write-Host "`n✅ Tests complete! Report saved to:" -ForegroundColor Green
    Write-Host "   $reportPath" -ForegroundColor White
    
    if ($OpenReport) {
        Start-Process $reportPath
    } else {
        $response = Read-Host "`nOpen report in browser? (y/n)"
        if ($response -eq 'y') {
            Start-Process $reportPath
        }
    }
} else {
    Write-Host "❌ Test failed - no report generated" -ForegroundColor Red
}
