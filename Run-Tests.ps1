# Run-Tests.ps1
# Simple test runner for the portfolio project

Write-Host "🧪 Running Portfolio Tests" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check if vitest is installed
if (-not (Test-Path "node_modules/vitest")) {
    Write-Host "⚠️  Vitest not installed. Installing..." -ForegroundColor Yellow
    npm install --save-dev vitest @vitest/ui happy-dom
}

# Check if test files exist
$testFiles = Get-ChildItem -Path "tests" -Filter "*.test.ts" -Recurse -ErrorAction SilentlyContinue

if ($testFiles.Count -eq 0) {
    Write-Host "⚠️  No test files found in tests/" -ForegroundColor Yellow
    Write-Host "   Create some test files first" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($testFiles.Count) test file(s)" -ForegroundColor Gray

# Run tests
Write-Host "
Running tests..." -ForegroundColor Yellow
npx vitest run

# Ask if user wants to open UI
$response = Read-Host "
Open test UI? (y/n)"
if ($response -eq 'y') {
    Write-Host "Opening test UI..." -ForegroundColor Yellow
    npx vitest --ui
}
