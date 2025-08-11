# deploy.ps1 - Deploy to production
param(
    [string]$Target = "vercel",
    [switch]$SkipBuild
)

if (-not $SkipBuild) {
    .\build.ps1 -Environment production
}

switch ($Target) {
    "vercel" {
        Write-Host "Deploying to Vercel..." -ForegroundColor Cyan
        vercel --prod
    }
    "netlify" {
        Write-Host "Deploying to Netlify..." -ForegroundColor Cyan
        netlify deploy --prod --dir=public
    }
}

Write-Host "Deployment complete!" -ForegroundColor Green