# save as: setup-project.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = "portfolio",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = "$env:USERPROFILE\Projects"
)

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host "🚀 Creating Hugo Portfolio Project" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Create project directory
$fullPath = Join-Path $ProjectPath $ProjectName
if (Test-Path $fullPath) {
    Write-Host "❌ Directory already exists: $fullPath" -ForegroundColor Red
    $response = Read-Host "Delete and recreate? (y/n)"
    if ($response -eq 'y') {
        Remove-Item $fullPath -Recurse -Force
    } else {
        exit
    }
}

New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
Set-Location $fullPath

Write-Host "✅ Created project at: $fullPath" -ForegroundColor Green

# Initialize git
Write-Host "📝 Initializing Git..." -ForegroundColor Yellow
git init

# Create directory structure
Write-Host "📁 Creating directory structure..." -ForegroundColor Yellow

$directories = @(
    ".github\workflows",
    ".vscode",
    "src\styles\tokens",
    "src\styles\base",
    "src\styles\components",
    "src\styles\layouts",
    "src\styles\utilities",
    "src\scripts\core",
    "src\scripts\components",
    "src\scripts\experimental",
    "src\assets\fonts",
    "src\assets\icons",
    "src\assets\images",
    "content\make\words",
    "content\make\sounds",
    "content\make\visuals",
    "content\learn\built",
    "content\learn\found",
    "content\learn\strategies",
    "content\think\positions",
    "content\think\links",
    "content\meet\me",
    "content\meet\work",
    "content\es\hacer\palabras",
    "content\es\hacer\sonidos",
    "content\es\hacer\visuales",
    "content\es\aprender\construido",
    "content\es\aprender\encontrado",
    "content\es\aprender\estrategias",
    "content\es\pensar\posiciones",
    "content\es\pensar\enlaces",
    "content\es\conocer\yo",
    "content\es\conocer\trabajo",
    "data\taxonomy",
    "data\site",
    "layouts\_default",
    "layouts\partials\components",
    "layouts\partials\meta",
    "layouts\partials\systems",
    "layouts\shortcodes",
    "layouts\embeds",
    "static\media",
    "static\cache",
    "tools\translator",
    "tools\optimizer",
    "tools\analytics",
    "config\_default",
    "assets",
    "resources",
    "public"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Host "  ✓ $dir" -ForegroundColor DarkGray
}

Write-Host "✅ Directory structure created" -ForegroundColor Green

# Create .gitignore
Write-Host "📝 Creating .gitignore..." -ForegroundColor Yellow
@"
# Hugo
/public/
/resources/_gen/
/assets/jsconfig.json
hugo_stats.json
/.hugo_build.lock

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
pnpm-lock.yaml

# Editor
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
!.vscode/*.code-snippets
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
Desktop.ini

# Environment
.env
.env.local
.env.*.local

# Build
/dist/
/build/
/out/
*.log

# Cache
.cache/
.temp/
static/cache/

# Testing
coverage/
.nyc_output/
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8

Write-Host "✅ .gitignore created" -ForegroundColor Green

# Create package.json
Write-Host "📝 Creating package.json..." -ForegroundColor Yellow
@"
{
  "name": "portfolio-professional",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm:dev:*\"",
    "dev:hugo": "hugo server --navigateToChanged --bind 0.0.0.0",
    "dev:assets": "vite build --watch",
    "build": "run-s clean build:*",
    "build:assets": "vite build",
    "build:hugo": "hugo --minify --gc",
    "build:optimize": "node tools/optimizer/run.js",
    "clean": "rimraf public static/cache resources",
    "translate": "node tools/translator/cli.js",
    "translate:watch": "node tools/translator/cli.js --watch",
    "lint": "run-p lint:*",
    "lint:styles": "stylelint \"src/styles/**/*.scss\"",
    "lint:scripts": "eslint \"src/scripts/**/*.ts\"",
    "lint:markdown": "markdownlint \"content/**/*.md\"",
    "test": "run-s test:*",
    "test:a11y": "pa11y-ci",
    "test:lighthouse": "lighthouse-ci",
    "optimize:images": "node tools/optimizer/images.js",
    "analyze": "webpack-bundle-analyzer",
    "deploy": "run-s build deploy:*",
    "deploy:vercel": "vercel --prod",
    "new:post": "hugo new make/words/new-post.md",
    "new:project": "hugo new learn/built/new-project.md"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "focus-trap": "^7.5.0",
    "lazy-sizes": "^5.3.0",
    "workbox-precaching": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@vitejs/plugin-legacy": "^5.0.0",
    "concurrently": "^8.0.0",
    "eslint": "^8.0.0",
    "lighthouse-ci": "^0.13.0",
    "markdownlint-cli": "^0.39.0",
    "npm-run-all": "^4.1.5",
    "pa11y-ci": "^3.1.0",
    "rimraf": "^5.0.0",
    "sass": "^1.70.0",
    "stylelint": "^16.0.0",
    "stylelint-config-standard-scss": "^13.0.0",
    "terser": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "webpack-bundle-analyzer": "^4.10.0"
  }
}
"@ | Out-File -FilePath "package.json" -Encoding UTF8

Write-Host "✅ package.json created" -ForegroundColor Green

# Initialize npm and install dependencies
Write-Host "📦 Installing npm packages..." -ForegroundColor Yellow
npm install

Write-Host "✅ npm packages installed" -ForegroundColor Green

# Create README
Write-Host "📝 Creating README.md..." -ForegroundColor Yellow
@"
# $ProjectName

A professional Hugo portfolio built with modern web technologies.

## Quick Start

``````powershell
# Development
npm run dev

# Build for production
npm run build

# Deploy
npm run deploy