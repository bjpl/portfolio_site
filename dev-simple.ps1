# dev-simple.ps1
Write-Host "Starting Hugo server..." -ForegroundColor Cyan
hugo server --navigateToChanged --bind 0.0.0.0 --buildDrafts --disableFastRender
