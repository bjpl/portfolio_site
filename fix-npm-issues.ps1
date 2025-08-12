# fix-npm-issues.ps1

Write-Host "🔧 Fixing NPM and Build Issues" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Step 1: Clean everything
Write-Host "`n📦 Cleaning npm cache and modules..." -ForegroundColor Yellow
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
npm cache clean --force

# Step 2: Create corrected package.json
Write-Host "`n📝 Creating corrected package.json..." -ForegroundColor Yellow
@'
{
  "name": "portfolio-professional",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "hugo server --navigateToChanged --bind 0.0.0.0 --buildDrafts --disableFastRender",
    "build": "hugo --minify --gc",
    "build:search": "hugo list all --format json > public/search-index.json",
    "translate": "node tools/translator/cli.js",
    "translate:batch": "node tools/translator/cli.js batch -l es",
    "new:post": "hugo new content/make/words/new-post.md",
    "new:project": "hugo new content/learn/built/new-project.md"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0"
  },
  "devDependencies": {
    "chalk": "^5.3.0",
    "commander": "^11.0.0",
    "dotenv": "^16.0.0",
    "glob": "^10.0.0",
    "gray-matter": "^4.0.3",
    "ora": "^8.0.1"
  }
}
'@ | Out-File -FilePath "package.json" -Encoding UTF8

Write-Host "✓ package.json created" -ForegroundColor Green

# Step 3: Install only necessary packages
Write-Host "`n📦 Installing essential packages..." -ForegroundColor Yellow
npm install

Write-Host "✓ Packages installed" -ForegroundColor Green

# Step 4: Create simple dev script
Write-Host "`n📝 Creating simple dev script..." -ForegroundColor Yellow
@'
# dev-simple.ps1
Write-Host "Starting Hugo server..." -ForegroundColor Cyan
hugo server --navigateToChanged --bind 0.0.0.0 --buildDrafts --disableFastRender
'@ | Out-File -FilePath "dev-simple.ps1" -Encoding UTF8

Write-Host "✓ Dev script created" -ForegroundColor Green

# Step 5: Fix Hugo config for simpler setup
Write-Host "`n⚙️ Simplifying Hugo configuration..." -ForegroundColor Yellow

# Ensure config directory exists
New-Item -ItemType Directory -Force -Path "config\_default" | Out-Null

# Simplified hugo.yaml
@'
baseURL: http://localhost:1313/
title: Portfolio
languageCode: en-us
defaultContentLanguage: en

# Output
enableRobotsTXT: true
enableGitInfo: false

# Taxonomies
taxonomies:
  tag: tags
  category: categories

# Permalinks
permalinks:
  make: /:section/:slug/
  learn: /:section/:slug/
  think: /:section/:slug/
  meet: /:section/:slug/
'@ | Out-File -FilePath "config\_default\hugo.yaml" -Encoding UTF8

# Simplified params.yaml
@'
author: Your Name
description: Creator working at the intersection of technology and art
email: your.email@example.com

features:
  darkMode: true
  search: true

social:
  github: https://github.com/yourusername
  twitter: https://twitter.com/yourusername
'@ | Out-File -FilePath "config\_default\params.yaml" -Encoding UTF8

# Simplified menus.yaml
@'
main:
  - name: Make
    url: /make/
    weight: 10
  - name: Learn
    url: /learn/
    weight: 20
  - name: Think
    url: /think/
    weight: 30
  - name: Meet
    url: /meet/
    weight: 40
'@ | Out-File -FilePath "config\_default\menus.yaml" -Encoding UTF8

Write-Host "✓ Hugo configuration simplified" -ForegroundColor Green

# Step 6: Create minimal working layouts
Write-Host "`n📄 Creating minimal working layouts..." -ForegroundColor Yellow

# Ensure directories exist
New-Item -ItemType Directory -Force -Path "layouts\_default" | Out-Null
New-Item -ItemType Directory -Force -Path "layouts\partials" | Out-Null
New-Item -ItemType Directory -Force -Path "static\css" | Out-Null

# Create simple CSS file
@'
:root {
    --color-bg: #ffffff;
    --color-text: #1a1a1a;
    --color-primary: #0066ff;
    --color-border: #e5e5e5;
}

[data-theme="dark"] {
    --color-bg: #1a1a1a;
    --color-text: #ffffff;
    --color-primary: #4d94ff;
    --color-border: #333333;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: system-ui, -apple-system, sans-serif;
    background: var(--color-bg);
    color: var(--color-text);
    line-height: 1.6;
    transition: background-color 0.3s, color 0.3s;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.site-header {
    border-bottom: 1px solid var(--color-border);
    padding: 1rem 0;
    background: var(--color-bg);
    position: sticky;
    top: 0;
    z-index: 100;
}

.site-header__inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.site-header__logo {
    font-size: 1.5rem;
    font-weight: bold;
    text-decoration: none;
    color: var(--color-text);
}

.site-nav ul {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.site-nav a {
    color: var(--color-text);
    text-decoration: none;
}

.site-nav a:hover {
    color: var(--color-primary);
}

.theme-toggle {
    background: none;
    border: 1px solid var(--color-border);
    padding: 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    color: var(--color-text);
}

main {
    min-height: calc(100vh - 200px);
    padding: 2rem 0;
}

.home-hero {
    padding: 4rem 0;
    text-align: center;
}

.home-hero h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.section-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
}

.section-card {
    padding: 2rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--color-text);
    transition: transform 0.3s;
}

.section-card:hover {
    transform: translateY(-4px);
}

.site-footer {
    border-top: 1px solid var(--color-border);
    padding: 2rem 0;
    margin-top: 4rem;
}
'@ | Out-File -FilePath "static\css\main.css" -Encoding UTF8

# Create baseof.html
@'
<!DOCTYPE html>
<html lang="{{ site.Language.Lang }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ if .IsHome }}{{ site.Title }}{{ else }}{{ .Title }} | {{ site.Title }}{{ end }}</title>
    <meta name="description" content="{{ .Description | default site.Params.description }}">
    <link rel="stylesheet" href="/css/main.css">
    <script>
        // Theme setup
        (function() {
            const theme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', theme);
        })();
    </script>
</head>
<body>
    <header class="site-header">
        <div class="container">
            <div class="site-header__inner">
                <a href="/" class="site-header__logo">{{ site.Title }}</a>
                <nav class="site-nav">
                    <ul>
                        {{ range site.Menus.main }}
                        <li><a href="{{ .URL }}">{{ .Name }}</a></li>
                        {{ end }}
                    </ul>
                </nav>
                <button class="theme-toggle" onclick="toggleTheme()">🌓</button>
            </div>
        </div>
    </header>
    
    <main>
        {{- block "main" . }}{{- end }}
    </main>
    
    <footer class="site-footer">
        <div class="container">
            <p>&copy; {{ now.Year }} {{ site.Params.author }}</p>
        </div>
    </footer>
    
    <script>
        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        }
    </script>
</body>
</html>
'@ | Out-File -FilePath "layouts\_default\baseof.html" -Encoding UTF8

# Create index.html
@'
{{ define "main" }}
<div class="container">
    <section class="home-hero">
        <h1>{{ site.Title }}</h1>
        <p>{{ site.Params.description }}</p>
    </section>
    
    <section>
        <h2>Explore</h2>
        <div class="section-grid">
            {{ range site.Menus.main }}
            <a href="{{ .URL }}" class="section-card">
                <h3>{{ .Name }}</h3>
            </a>
            {{ end }}
        </div>
    </section>
</div>
{{ end }}
'@ | Out-File -FilePath "layouts\index.html" -Encoding UTF8

# Create list.html
@'
{{ define "main" }}
<div class="container">
    <h1>{{ .Title }}</h1>
    {{ with .Description }}<p>{{ . }}</p>{{ end }}
    
    <div class="content-list">
        {{ range .Pages }}
        <article>
            <h2><a href="{{ .Permalink }}">{{ .Title }}</a></h2>
            <time>{{ .Date.Format "January 2, 2006" }}</time>
            {{ with .Description }}<p>{{ . }}</p>{{ end }}
        </article>
        {{ end }}
    </div>
</div>
{{ end }}
'@ | Out-File -FilePath "layouts\_default\list.html" -Encoding UTF8

# Create single.html
@'
{{ define "main" }}
<article class="container">
    <h1>{{ .Title }}</h1>
    <time>{{ .Date.Format "January 2, 2006" }}</time>
    <div>{{ .Content }}</div>
</article>
{{ end }}
'@ | Out-File -FilePath "layouts\_default\single.html" -Encoding UTF8

Write-Host "✓ Layouts created" -ForegroundColor Green

Write-Host "`n✅ All fixes applied!" -ForegroundColor Green
Write-Host "`nTo start the server, run:" -ForegroundColor Cyan
Write-Host "  .\dev-simple.ps1" -ForegroundColor Yellow
Write-Host "`nOr use Hugo directly:" -ForegroundColor Cyan
Write-Host "  hugo server" -ForegroundColor Yellow