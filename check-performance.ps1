# check-performance.ps1
# Performance budget checker for Hugo portfolio

param(
    [string]$BuildDir = "public",
    [switch]$SkipLighthouse,
    [switch]$Verbose
)

Write-Host "🎯 Running Performance Budget Check" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if build directory exists
if (!(Test-Path $BuildDir)) {
    Write-Host "❌ Build directory not found: $BuildDir" -ForegroundColor Red
    Write-Host "   Run 'hugo' to build the site first" -ForegroundColor Yellow
    exit 1
}

# Run the performance budget check
node tools/performance/budget.js

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Performance budget check passed!" -ForegroundColor Green
    
    # Open HTML report if it exists
    $reportPath = "test-results\performance-budget.html"
    if (Test-Path $reportPath) {
        $response = Read-Host "`nOpen report in browser? (y/n)"
        if ($response -eq 'y') {
            Start-Process $reportPath
        }
    }
} else {
    Write-Host "`n❌ Performance budget check failed!" -ForegroundColor Red
    Write-Host "   See test-results/performance-budget.html for details" -ForegroundColor Yellow
}
