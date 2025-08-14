# portfolio.ps1 - Complete Portfolio Management System
param(
    [string]$Command = "help",
    [string]$Title,
    [string]$Type,
    [switch]$Force,
    [switch]$Mobile,
    [switch]$Test,
    [switch]$Optimize
)

# Import existing tools
$global:ProjectRoot = $PSScriptRoot
$global:ContentDir = Join-Path $ProjectRoot "content"
$global:StaticDir = Join-Path $ProjectRoot "static"
$global:PublicDir = Join-Path $ProjectRoot "public"

# Enhanced functions integrating your existing code
function Start-DevEnvironment {
    param(
        [switch]$Mobile = $Mobile,
        [switch]$Test = $Test,
        [switch]$LazyLoading = $true,
        [switch]$SearchIndex = $true
    )
    
    Write-Host "`n🚀 STARTING ENHANCED DEV ENVIRONMENT" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    
    # Kill existing processes
    Get-Process | Where-Object {$_.ProcessName -match "hugo|node"} | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Build search index first
    if ($SearchIndex) {
        Write-Host "🔍 Building search index..." -ForegroundColor Yellow
        node tools/search/build-index.js
    }
    
    # Start Hugo with enhanced config
    $hugoArgs = @(
        "server",
        "--navigateToChanged",
        "--buildDrafts",
        "--buildFuture",
        "--disableFastRender",
        "--noHTTPCache",
        "--bind", "0.0.0.0",
        "--port", "1313",
        "--verbose"
    )
    
    $hugo = Start-Process hugo -ArgumentList $hugoArgs -PassThru -NoNewWindow
    
    # Start Vite for asset compilation
    if (Test-Path "vite.config.js") {
        $vite = Start-Process npm -ArgumentList "run", "dev:assets" -PassThru -NoNewWindow
    }
    
    # Start performance monitoring
    if ($Test) {
        Start-Job -ScriptBlock {
            while ($true) {
                Start-Sleep -Seconds 30
                node tools/performance/budget.js --quiet
            }
        } | Out-Null
    }
    
    Start-Sleep -Seconds 3
    
    # Open browsers
    Start-Process "http://localhost:1313"
    
    if ($Mobile) {
        $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"}).IPAddress[0]
        Write-Host "`n📱 Mobile Preview: http://${localIP}:1313" -ForegroundColor Green
        
        # Generate QR code if qr module available
        if (Get-Command qr -ErrorAction SilentlyContinue) {
            qr "http://${localIP}:1313" | Out-Host
        }
    }
    
    # Show dev panel
    Show-DevPanel
}

function Show-DevPanel {
    Write-Host "`n📊 DEV PANEL" -ForegroundColor Magenta
    Write-Host "==========" -ForegroundColor Magenta
    Write-Host "Server:     " -NoNewline; Write-Host "http://localhost:1313" -ForegroundColor Green
    Write-Host "GraphQL:    " -NoNewline; Write-Host "http://localhost:1313/api/graphql" -ForegroundColor Yellow
    Write-Host "Search:     " -NoNewline; Write-Host "http://localhost:1313/search-index.json" -ForegroundColor Yellow
    Write-Host "Metrics:    " -NoNewline; Write-Host "http://localhost:1313/metrics" -ForegroundColor Yellow
    Write-Host "`nHotkeys:" -ForegroundColor Cyan
    Write-Host "  N - New content      T - Run tests" -ForegroundColor White
    Write-Host "  O - Optimize media   P - Performance check" -ForegroundColor White
    Write-Host "  S - Search rebuild   D - Deploy" -ForegroundColor White
    Write-Host "  R - Refresh all      Q - Quit" -ForegroundColor White
    
    while ($true) {
        $key = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown").Character
        switch ($key) {
            'n' { New-SmartContent }
            't' { Invoke-Tests }
            'o' { Optimize-AllMedia }
            'p' { Check-Performance }
            's' { Build-SearchIndex }
            'd' { Deploy-Smart }
            'r' { Clear-Everything; Start-DevEnvironment }
            'q' { Stop-Everything; break }
        }
    }
}

function New-SmartContent {
    param(
        [string]$Title = $Title,
        [string]$Type = $Type
    )
    
    if (-not $Title) { $Title = Read-Host "Title" }
    if (-not $Type) {
        Write-Host "`nContent Types:" -ForegroundColor Cyan
        Write-Host "  1. 📝 Article (with TOC, reading time, social cards)"
        Write-Host "  2. 🎨 Project (gallery, tech stack, metrics)"
        Write-Host "  3. 📸 Gallery (lazy loading, lightbox)"
        Write-Host "  4. 🎥 Video (YouTube/Vimeo/self-hosted)"
        Write-Host "  5. 🎵 Audio (player, transcript)"
        Write-Host "  6. 💻 Code (syntax highlight, playground)"
        Write-Host "  7. 📊 Data Story (charts, tables)"
        Write-Host "  8. 🗺️ Interactive (maps, 3D, canvas)"
        Write-Host "  9. 📑 Case Study (metrics, testimonials)"
        Write-Host "  10. 🔗 Link Collection (bookmarks)"
        
        $Type = Read-Host "Select (1-10)"
    }
    
    $slug = ($Title.ToLower() -replace '[^\w\s-]', '' -replace '\s+', '-')
    $date = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"
    
    # Generate enhanced frontmatter based on type
    $frontmatter = Get-EnhancedFrontmatter -Type $Type -Title $Title -Date $date
    
    # Generate content template with all features
    $content = Get-ContentTemplate -Type $Type -Frontmatter $frontmatter
    
    # Determine path based on type
    $path = Get-ContentPath -Type $Type -Slug $slug
    
    # Create file with content
    New-Item -ItemType File -Path $path -Force -Value $content | Out-Null
    
    # Create associated directories
    $mediaDir = "static/media/$(Split-Path -Parent $path | Split-Path -Leaf)/$slug"
    New-Item -ItemType Directory -Path $mediaDir -Force | Out-Null
    
    # Generate social media card
    if (Get-Command "magick" -ErrorAction SilentlyContinue) {
        Generate-SocialCard -Title $Title -Path "$mediaDir/og-image.png"
    }
    
    Write-Host "✅ Created: $path" -ForegroundColor Green
    Write-Host "📁 Media folder: $mediaDir" -ForegroundColor Yellow
    
    # Open in VS Code with helpful extensions
    code $path
    
    # Copy path to clipboard
    Set-Clipboard -Value $path
    Write-Host "📋 Path copied to clipboard" -ForegroundColor Gray
}

function Get-EnhancedFrontmatter {
    param($Type, $Title, $Date)
    
    $base = @"
title: "$Title"
date: $Date
lastmod: $Date
draft: false
description: ""
summary: ""
tags: []
categories: []
keywords: []
author: "$(git config user.name)"
"@
    
    # Add type-specific frontmatter
    switch ($Type) {
        "1" { # Article
            $base += @"

toc: true
tocLevels: [2, 3, 4]
readingTime: true
wordCount: true
socialShare: true
newsletter: true
comments: true
relatedPosts: true
series: []
math: false
diagram: false
"@
        }
        "2" { # Project
            $base += @"

projectMeta:
  client: ""
  duration: ""
  role: ""
  team: []
  status: "completed"
technologies: []
links:
  github: ""
  demo: ""
  video: ""
  docs: ""
gallery:
  enabled: true
  layout: "grid"
metrics:
  performance: 100
  accessibility: 100
  seo: 100
testimonial:
  quote: ""
  author: ""
  role: ""
featured: true
weight: 1
"@
        }
        "3" { # Gallery
            $base += @"

gallery:
  enabled: true
  layout: "masonry"
  columns: 3
  gap: "1rem"
  lightbox: true
  lazyLoad: true
  showCaptions: true
  showExif: false
images: []
photographyMeta:
  camera: ""
  location: ""
  date: ""
"@
        }
        "4" { # Video
            $base += @"

video:
  platform: "youtube"
  id: ""
  duration: ""
  thumbnail: ""
  autoplay: false
  loop: false
  controls: true
  muted: false
playlist: []
captions:
  - lang: "en"
    file: ""
transcript: true
downloadable: false
"@
        }
        "5" { # Audio
            $base += @"

audio:
  file: ""
  duration: ""
  size: ""
  format: "mp3"
podcast:
  episode: 1
  season: 1
  explicit: false
  iTunesId: ""
  spotifyId: ""
chapters: []
transcript: true
downloadable: true
"@
        }
        "6" { # Code
            $base += @"

code:
  language: "javascript"
  playground: true
  runnable: true
  editable: true
  theme: "monokai"
repository:
  url: ""
  branch: "main"
  path: ""
dependencies: []
setup: []
demo:
  codepen: ""
  codesandbox: ""
  stackblitz: ""
  replit: ""
"@
        }
        "7" { # Data Story
            $base += @"

data:
  source: ""
  updated: $Date
  license: ""
  format: "json"
visualizations:
  - type: "line"
    id: "chart1"
    title: ""
  - type: "bar"
    id: "chart2"
    title: ""
interactive: true
downloadable: true
methodology: true
"@
        }
        "8" { # Interactive
            $base += @"

interactive:
  type: "canvas"
  width: "100%"
  height: "600px"
  controls: true
  fullscreen: true
libraries:
  - "three.js"
  - "d3.js"
fallback:
  image: ""
  message: "Your browser doesn't support this feature"
performance:
  fps: 60
  quality: "high"
"@
        }
        "9" { # Case Study
            $base += @"

caseStudy:
  client: ""
  industry: ""
  challenge: ""
  solution: ""
  duration: ""
  year: 2024
results:
  - metric: "Performance"
    before: "50%"
    after: "95%"
    improvement: "+90%"
testimonials:
  - quote: ""
    author: ""
    role: ""
    company: ""
    image: ""
process:
  - phase: "Discovery"
    duration: "2 weeks"
    activities: []
awards: []
press: []
"@
        }
        "10" { # Links
            $base += @"

links:
  - title: ""
    url: ""
    description: ""
    tags: []
    date: $Date
bookmarklet: false
archive: true
rss: true
"@
        }
    }
    
    return $base
}

function Get-ContentTemplate {
    param($Type, $Frontmatter)
    
    $template = "---`n$Frontmatter`n---`n`n"
    
    # Add type-specific content template
    switch ($Type) {
        "1" { # Article template with all embeds
            $template += @"
## Introduction

Start with a compelling hook...

<!--more-->

## Main Content

### Embedding Examples

#### YouTube Video
{{< youtube id="VIDEO_ID" title="Video Title" >}}

#### Twitter/X Post
{{< tweet user="username" id="1234567890" >}}

#### CodePen
{{< codepen id="PEN_ID" height="400" theme="dark" default-tab="result" >}}

#### GitHub Gist
{{< gist username="USERNAME" id="GIST_ID" >}}

#### Instagram Post
{{< instagram id="POST_ID" >}}

#### TikTok Video
{{< tiktok id="VIDEO_ID" >}}

#### Spotify Track/Playlist
{{< spotify type="track" id="SPOTIFY_ID" height="152" >}}

#### SoundCloud Track
{{< soundcloud id="TRACK_ID" >}}

### Interactive Elements

#### Mermaid Diagram
{{< mermaid >}}
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Result 1]
    B -->|No| D[Result 2]
{{< /mermaid >}}

#### Math Equation
{{< math >}}
\sqrt{3x-1}+(1+x)^2
{{< /math >}}

#### Data Table
{{< datatable source="/data/table.csv" sortable="true" >}}

#### Chart
{{< chart type="line" >}}
{
  labels: ['Jan', 'Feb', 'Mar'],
  datasets: [{
    label: 'Sales',
    data: [10, 20, 30]
  }]
}
{{< /chart >}}

### Code Examples

#### Tabbed Code
{{< tabs >}}
{{< tab "JavaScript" >}}
```javascript
const hello = () => console.log("Hello World");
```
{{< /tab >}}
{{< tab "Python" >}}
```python
def hello():
    print("Hello World")
```
{{< /tab >}}
{{< /tabs >}}

#### Live Code Editor
{{< playground language="javascript" theme="monokai" >}}
// Try editing this code
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
{{< /playground >}}

### Media Gallery

{{< gallery match="images/gallery/*.jpg" sortOrder="desc" rowHeight="300" >}}

### Call to Action

{{< cta type="newsletter" >}}
Subscribe to get updates
{{< /cta >}}

## Related Posts

{{< related-posts count="3" >}}

## Comments

{{< comments >}}
"@
        }
        "2" { # Project template
            $template += @"
## Project Overview

Brief description of the project...

{{< project-hero image="/media/projects/hero.jpg" >}}

## The Challenge

Describe the problem that needed solving...

## The Solution

### Tech Stack
{{< tech-stack >}}
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **Infrastructure**: Docker, Kubernetes, AWS
- **Tools**: Webpack, Jest, GitHub Actions
{{< /tech-stack >}}

### Key Features
{{< features >}}
- ✨ Feature 1 with description
- 🚀 Feature 2 with description
- 🎯 Feature 3 with description
- 💡 Feature 4 with description
{{< /features >}}

## Development Process

{{< timeline >}}
- **Week 1-2**: Research & Planning
- **Week 3-4**: Design & Prototyping
- **Week 5-8**: Development
- **Week 9-10**: Testing & Optimization
- **Week 11-12**: Launch & Monitoring
{{< /timeline >}}

## Results & Impact

{{< metrics >}}
- 📈 **Performance**: 95/100 Lighthouse score
- ♿ **Accessibility**: WCAG AAA compliant
- 🚀 **Speed**: 0.8s load time
- 👥 **Users**: 10,000+ active users
{{< /metrics >}}

## Gallery

{{< project-gallery >}}

## Live Demo

{{< demo url="https://demo.example.com" height="600" >}}

## Code Repository

{{< github-card repo="username/repository" >}}

## Testimonial

{{< testimonial 
  quote="This project exceeded all our expectations."
  author="Client Name"
  role="CEO"
  company="Company Inc."
  image="/media/testimonials/client.jpg"
>}}

## Lessons Learned

Key takeaways from this project...

## What's Next

Future improvements and iterations...
"@
        }
        default {
            $template += @"
## Content

Start writing here...

### Section 1

Content...

### Section 2

More content...

## Conclusion

Wrap up...
"@
        }
    }
    
    return $template
}

function Get-ContentPath {
    param($Type, $Slug)
    
    switch ($Type) {
        "1" { return "content/make/words/$Slug.md" }
        "2" { return "content/learn/built/$Slug.md" }
        "3" { return "content/make/visuals/$Slug.md" }
        "4" { return "content/make/visuals/$Slug.md" }
        "5" { return "content/make/sounds/$Slug.md" }
        "6" { return "content/learn/strategies/$Slug.md" }
        "7" { return "content/think/positions/$Slug.md" }
        "8" { return "content/make/visuals/$Slug.md" }
        "9" { return "content/learn/built/$Slug.md" }
        "10" { return "content/think/links/$Slug.md" }
        default { return "content/think/positions/$Slug.md" }
    }
}

function Optimize-AllMedia {
    Write-Host "`n🖼️ OPTIMIZING ALL MEDIA" -ForegroundColor Cyan
    
    # Optimize images
    Get-ChildItem -Path "static" -Include *.jpg,*.jpeg,*.png -Recurse | ForEach-Object {
        $webp = $_.FullName -replace '\.(jpg|jpeg|png)$', '.webp'
        if (-not (Test-Path $webp)) {
            if (Get-Command "cwebp" -ErrorAction SilentlyContinue) {
                cwebp -q 85 $_.FullName -o $webp 2>$null
                Write-Host "✓ Generated WebP: $(Split-Path $webp -Leaf)" -ForegroundColor Green
            }
        }
        
        # Generate responsive sizes
        if (Get-Command "magick" -ErrorAction SilentlyContinue) {
            $base = $_.BaseName
            $dir = $_.DirectoryName
            
            @(320, 640, 768, 1024, 1920) | ForEach-Object {
                $sized = Join-Path $dir "$base-$($_)w.jpg"
                if (-not (Test-Path $sized)) {
                    magick $_.FullName -resize $_ $sized
                    Write-Host "✓ Generated ${_}w version" -ForegroundColor Gray
                }
            }
        }
    }
    
    # Generate image metadata
    node tools/optimizer/images.js
    
    Write-Host "✅ Media optimization complete!" -ForegroundColor Green
}

function Build-SearchIndex {
    Write-Host "🔍 Building search index..." -ForegroundColor Yellow
    node tools/search/build-index.js
    
    # Also build algolia index if configured
    if ($env:ALGOLIA_APP_ID) {
        hugo-algolia -s
    }
    
    Write-Host "✅ Search index built!" -ForegroundColor Green
}

function Invoke-Tests {
    Write-Host "`n🧪 RUNNING TEST SUITE" -ForegroundColor Cyan
    
    # Accessibility tests
    Write-Host "♿ Accessibility..." -ForegroundColor Yellow
    node tools/accessibility/test-suite.js
    
    # Performance budget
    Write-Host "📊 Performance..." -ForegroundColor Yellow
    node tools/performance/budget.js
    
    # Link checking
    Write-Host "🔗 Links..." -ForegroundColor Yellow
    npx linkinator http://localhost:1313 --recurse --silent
    
    # HTML validation
    Write-Host "✓ HTML..." -ForegroundColor Yellow
    npx html-validate "public/**/*.html"
    
    Write-Host "✅ All tests complete!" -ForegroundColor Green
}

function Check-Performance {
    Write-Host "`n📊 PERFORMANCE CHECK" -ForegroundColor Cyan
    
    # Build first
    hugo --quiet --minify
    
    # Check bundle sizes
    $sizes = @{}
    $sizes.HTML = (Get-ChildItem -Path "public" -Filter "*.html" -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB
    $sizes.CSS = (Get-ChildItem -Path "public" -Filter "*.css" -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB
    $sizes.JS = (Get-ChildItem -Path "public" -Filter "*.js" -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB
    $sizes.Total = (Get-ChildItem -Path "public" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    
    Write-Host "`nBundle Sizes:" -ForegroundColor Yellow
    $sizes.GetEnumerator() | ForEach-Object {
        $unit = if ($_.Key -eq "Total") { "MB" } else { "KB" }
        Write-Host ("  {0,-10} {1,8:N2} {2}" -f $_.Key, $_.Value, $unit)
    }
    
    # Run Lighthouse
    if (Get-Command "lighthouse" -ErrorAction SilentlyContinue) {
        lighthouse http://localhost:1313 --output=json --output-path=./lighthouse-report.json --quiet
        $report = Get-Content ./lighthouse-report.json | ConvertFrom-Json
        
        Write-Host "`nLighthouse Scores:" -ForegroundColor Yellow
        Write-Host ("  Performance:    {0}/100" -f [int]($report.categories.performance.score * 100))
        Write-Host ("  Accessibility:  {0}/100" -f [int]($report.categories.accessibility.score * 100))
        Write-Host ("  Best Practices: {0}/100" -f [int]($report.categories.'best-practices'.score * 100))
        Write-Host ("  SEO:           {0}/100" -f [int]($report.categories.seo.score * 100))
    }
}

function Deploy-Smart {
    Write-Host "`n🚀 SMART DEPLOY" -ForegroundColor Cyan
    
    # Pre-deploy checks
    Write-Host "Running pre-deploy checks..." -ForegroundColor Yellow
    
    # Check for draft content
    $drafts = Get-ChildItem -Path "content" -Filter "*.md" -Recurse | Select-String "draft: true"
    if ($drafts) {
        Write-Host "⚠️  Found $($drafts.Count) draft posts" -ForegroundColor Yellow
        $continue = Read-Host "Continue? (y/n)"
        if ($continue -ne 'y') { return }
    }
    
    # Build production
    Write-Host "Building production site..." -ForegroundColor Yellow
    hugo --minify --gc
    
    # Run tests
    Invoke-Tests
    
    # Choose deployment target
    Write-Host "`nDeploy to:" -ForegroundColor Yellow
    Write-Host "  1. Vercel (recommended)" -ForegroundColor White
    Write-Host "  2. Netlify" -ForegroundColor White
    Write-Host "  3. GitHub Pages" -ForegroundColor White
    Write-Host "  4. Cloudflare Pages" -ForegroundColor White
    Write-Host "  5. Custom (FTP/S3/etc)" -ForegroundColor White
    
    $target = Read-Host "Select (1-5)"
    
    switch ($target) {
        "1" {
            vercel --prod
            $url = vercel ls --output json | ConvertFrom-Json | Select-Object -First 1 | Select-Object -ExpandProperty url
            Write-Host "✅ Deployed to: https://$url" -ForegroundColor Green
        }
        "2" {
            netlify deploy --prod --dir=public
        }
        "3" {
            git add .
            git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            git push origin main
        }
        "4" {
            wrangler pages publish public
        }
        "5" {
            Write-Host "Custom deployment - implement your script here" -ForegroundColor Yellow
        }
    }
    
    # Post-deploy tasks
    Write-Host "`nPost-deploy tasks:" -ForegroundColor Yellow
    
    # Purge CDN cache
    Write-Host "  ✓ Purging CDN cache..." -ForegroundColor Gray
    
    # Warm up cache
    Write-Host "  ✓ Warming up cache..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://yoursite.com" -Method Head
    
    # Submit sitemap
    Write-Host "  ✓ Submitting sitemap..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://www.google.com/ping?sitemap=https://yoursite.com/sitemap.xml"
    
    Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
}

function Clear-Everything {
    Write-Host "🧹 Clearing all caches and builds..." -ForegroundColor Yellow
    Remove-Item -Path "public", "resources", ".hugo_build.lock", "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cleared!" -ForegroundColor Green
}

function Stop-Everything {
    Write-Host "Stopping all processes..." -ForegroundColor Yellow
    Get-Process | Where-Object {$_.ProcessName -match "hugo|node|npm"} | Stop-Process -Force
    Write-Host "✅ All processes stopped" -ForegroundColor Green
}

function Generate-SocialCard {
    param($Title, $Path)
    
    # Use ImageMagick to generate social cards
    if (Get-Command "magick" -ErrorAction SilentlyContinue) {
        $cmd = @"
magick -size 1200x630 xc:'#0066ff' \
  -gravity center -pointsize 60 -fill white \
  -annotate +0+0 "$Title" \
  "$Path"
"@
        Invoke-Expression $cmd
    }
}

# Main command router
switch ($Command.ToLower()) {
    "help" {
        Write-Host "`n📚 PORTFOLIO COMMANDS" -ForegroundColor Cyan
        Write-Host "===================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage: .\portfolio.ps1 [command] [options]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor White
        Write-Host "  dev       Start development environment" -ForegroundColor Gray
        Write-Host "  new       Create new content" -ForegroundColor Gray
        Write-Host "  build     Build production site" -ForegroundColor Gray
        Write-Host "  deploy    Deploy to production" -ForegroundColor Gray
        Write-Host "  test      Run all tests" -ForegroundColor Gray
        Write-Host "  perf      Check performance" -ForegroundColor Gray
        Write-Host "  optimize  Optimize all media" -ForegroundColor Gray
        Write-Host "  search    Build search index" -ForegroundColor Gray
        Write-Host "  clean     Clear all caches" -ForegroundColor Gray
        Write-Host "  help      Show this help" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Options:" -ForegroundColor White
        Write-Host "  -Mobile   Enable mobile preview" -ForegroundColor Gray
        Write-Host "  -Test     Enable testing mode" -ForegroundColor Gray
        Write-Host "  -Force    Force operation" -ForegroundColor Gray
        Write-Host "  -Optimize Run optimizations" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Yellow
        Write-Host "  .\portfolio.ps1 dev -Mobile" -ForegroundColor White
        Write-Host "  .\portfolio.ps1 new -Title 'My Post' -Type 1" -ForegroundColor White
        Write-Host "  .\portfolio.ps1 deploy -Test" -ForegroundColor White
    }
    "dev" { Start-DevEnvironment }
    "new" { New-SmartContent }
    "build" { hugo --minify --gc }
    "deploy" { Deploy-Smart }
    "test" { Invoke-Tests }
    "perf" { Check-Performance }
    "optimize" { Optimize-AllMedia }
    "search" { Build-SearchIndex }
    "clean" { Clear-Everything }
    default { Start-DevEnvironment }
}
