# Netlify Deployment Script
Write-Host "🚀 Deploying to Netlify..." -ForegroundColor Cyan

# Build the site
Write-Host "📦 Building Hugo site..." -ForegroundColor Yellow
hugo --minify

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Hugo build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Hugo build complete!" -ForegroundColor Green

# Check if we're linked to Netlify
$netlifyStatus = netlify status 2>&1
if ($netlifyStatus -match "linked to a project") {
    Write-Host "🔗 Linking to Netlify..." -ForegroundColor Yellow
    # This will prompt you to select or create a project
    netlify link
}

# Deploy to Netlify
Write-Host "🌐 Deploying to Netlify..." -ForegroundColor Cyan
$deployOutput = netlify deploy --dir=public --prod --message="Deployment from PowerShell script"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    
    # Extract and display the URL
    $url = $deployOutput | Select-String -Pattern "https://.*netlify.app" | Select-Object -First 1
    if ($url) {
        Write-Host "🔗 Site URL: $($url.Matches[0].Value)" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📊 Deployment Summary:" -ForegroundColor Magenta
Write-Host "- Build: Complete" -ForegroundColor White
Write-Host "- Deploy: Complete" -ForegroundColor White
Write-Host "- Status: Live" -ForegroundColor White

# Open the site
$openSite = Read-Host "`nDo you want to open the site in your browser? (y/n)"
if ($openSite -eq 'y') {
    netlify open:site
}