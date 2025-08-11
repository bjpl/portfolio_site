# dev.ps1 - Development server
param(
    [int]$Port = 1313,
    [switch]$OpenBrowser
)

Write-Host "Starting Hugo development server..." -ForegroundColor Cyan

if ($OpenBrowser) {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:$Port"
}

hugo server --navigateToChanged --bind 0.0.0.0 --port $Port