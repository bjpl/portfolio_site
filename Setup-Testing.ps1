# Setup-Testing.ps1
# Sets up the testing environment for the portfolio project

param(
    [switch]$UpdatePackages,
    [switch]$RunTests
)

Write-Host "🧪 Setting Up Testing Environment" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Check Node version
$nodeVersion = node --version
Write-Host "Node version: $nodeVersion" -ForegroundColor Gray

if ($nodeVersion -match "v(\d+)\.(\d+)") {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    
    if ($major -lt 20 -or ($major -eq 20 -and $minor -lt 11)) {
        Write-Host "⚠️  Node version 20.11.0 or higher recommended" -ForegroundColor Yellow
        Write-Host "   Current: $nodeVersion" -ForegroundColor Yellow
        Write-Host "   Some packages may have compatibility issues" -ForegroundColor Yellow
    }
}

# Create directory structure
Write-Host "
📁 Creating directory structure..." -ForegroundColor Yellow
$directories = @(
    'tests',
    'tests/unit',
    'tests/integration',
    'tests/e2e',
    'tests/fixtures',
    'docs',
    'docs/api',
    'docs/architecture',
    'docs/components',
    'docs/deployment',
    'docs/guides'
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "   ✅ Created: $dir" -ForegroundColor Gray
    } else {
        Write-Host "   ⏭️  Exists: $dir" -ForegroundColor DarkGray
    }
}

# Check for test files
if (Test-Path "tests/setup.ts") {
    Write-Host "
✅ Test setup file exists" -ForegroundColor Green
} else {
    Write-Host "
⚠️  Test setup file missing - run the setup commands" -ForegroundColor Yellow
}

# Update packages if requested
if ($UpdatePackages) {
    Write-Host "
📦 Updating packages..." -ForegroundColor Yellow
    
    # Check if package-updated.json exists
    if (Test-Path "package-updated.json") {
        Write-Host "Found package-updated.json" -ForegroundColor Gray
        Write-Host "Please manually merge it with package.json" -ForegroundColor Yellow
    }
    
    Write-Host "Installing test dependencies..." -ForegroundColor Gray
    npm install --save-dev vitest @vitest/ui @testing-library/dom happy-dom
}

# Run tests if requested
if ($RunTests) {
    Write-Host "
🏃 Running tests..." -ForegroundColor Yellow
    
    if (Test-Path "vitest.config.ts") {
        npm test
    } else {
        Write-Host "⚠️  vitest.config.ts not found" -ForegroundColor Red
        Write-Host "   Create it first before running tests" -ForegroundColor Yellow
    }
}

Write-Host "
✨ Setup complete!" -ForegroundColor Green
Write-Host "
Next steps:" -ForegroundColor Cyan
Write-Host "1. Review package-updated.json and merge with package.json" -ForegroundColor White
Write-Host "2. Fix the LazyLoader interface issue (see lazy-loading-fixed.ts)" -ForegroundColor White
Write-Host "3. Run tests: npm test" -ForegroundColor White
Write-Host "4. View test UI: npm run test:ui" -ForegroundColor White
