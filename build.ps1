# build.ps1 - Production build
param(
    [string]$Environment = "production",
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

Write-Host "Building for $Environment..." -ForegroundColor Cyan

# Clean
Remove-Item -Path "public" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "resources" -Recurse -Force -ErrorAction SilentlyContinue

# Install dependencies
npm ci

# Lint
if (-not $SkipTests) {
    npm run lint
}

# Build assets
npm run build:assets

# Build Hugo
$env:HUGO_ENV = $Environment
hugo --minify --gc --environment $Environment

# Generate search index
hugo list all --format json > public/search-index.json

Write-Host "Build complete!" -ForegroundColor Green