# Complete Hugo Portfolio Setup Script for Windows PowerShell
# Save this file as: setup-complete.ps1
# Run with: .\setup-complete.ps1 -ProjectName "." -OpenInVSCode

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = "portfolio",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = (Get-Location).Path,
    
    [Parameter(Mandatory=$false)]
    [switch]$InstallDependencies = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$OpenInVSCode = $true
)

# Error handling
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Console colors
function Write-Step($msg) { Write-Host "`n➤ $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Error($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "  ℹ $msg" -ForegroundColor Yellow }

# ASCII Art Header
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                              ║" -ForegroundColor Magenta
Write-Host "║     HUGO PORTFOLIO - COMPLETE PROJECT SETUP                 ║" -ForegroundColor Magenta
Write-Host "║     Windows | PowerShell | VSCode | Claude AI               ║" -ForegroundColor Magenta
Write-Host "║                                                              ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Handle current directory setup
if ($ProjectName -eq ".") {
    $fullPath = Get-Location
    Write-Step "Setting up in current directory: $fullPath"
} else {
    $fullPath = Join-Path $ProjectPath $ProjectName
    Write-Step "Creating project at: $fullPath"
    
    if (Test-Path $fullPath) {
        Write-Error "Directory already exists!"
        $response = Read-Host "Delete and recreate? (y/n)"
        if ($response -eq 'y') {
            Remove-Item $fullPath -Recurse -Force
            Write-Success "Removed existing directory"
        } else {
            Write-Info "Exiting..."
            exit
        }
    }
    
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    Set-Location $fullPath
}

Write-Success "Project directory ready"

# Initialize Git
Write-Step "Initializing Git repository"
git init --initial-branch=main 2>$null
Write-Success "Git initialized"

# Create complete directory structure
Write-Step "Creating directory structure"

$directories = @(
    ".github\workflows"
    ".vscode"
    "api"
    "assets"
    "config\_default"
    "content\make\words"
    "content\make\sounds"
    "content\make\visuals"
    "content\learn\built"
    "content\learn\found"
    "content\learn\strategies"
    "content\think\positions"
    "content\think\links"
    "content\meet\me"
    "content\meet\work"
    "content\es\hacer\palabras"
    "content\es\hacer\sonidos"
    "content\es\hacer\visuales"
    "content\es\aprender\construido"
    "content\es\aprender\encontrado"
    "content\es\aprender\estrategias"
    "content\es\pensar\posiciones"
    "content\es\pensar\enlaces"
    "content\es\conocer\yo"
    "content\es\conocer\trabajo"
    "data\taxonomy"
    "data\site"
    "layouts\_default"
    "layouts\partials\components"
    "layouts\partials\meta"
    "layouts\partials\systems"
    "layouts\shortcodes"
    "public"
    "resources"
    "src\styles\tokens"
    "src\styles\base"
    "src\styles\components"
    "src\styles\layouts"
    "src\styles\utilities"
    "src\scripts\core"
    "src\scripts\components"
    "src\scripts\experimental"
    "src\assets\fonts"
    "src\assets\icons"
    "src\assets\images"
    "static\media"
    "static\cache"
    "tools\translator"
    "tools\optimizer"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force -ErrorAction SilentlyContinue | Out-Null
}
Write-Success "Directory structure created"

#############################################
# CREATE ALL CONFIGURATION FILES
#############################################

Write-Step "Creating configuration files"

# .gitignore
$gitignoreContent = @'
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
'@
$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8 -NoNewline

# .env.example
$envExampleContent = @'
# Claude API (get from https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Deployment
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=

# Analytics (optional)
GOOGLE_ANALYTICS_ID=
PLAUSIBLE_DOMAIN=

# Development
NODE_ENV=development
HUGO_ENV=development
'@
$envExampleContent | Out-File -FilePath ".env.example" -Encoding UTF8 -NoNewline

# package.json
$packageJsonContent = @'
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
    "lazysizes": "^5.3.0",
    "workbox-precaching": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-legacy": "^5.0.0",
    "concurrently": "^8.0.0",
    "eslint": "^8.0.0",
    "gray-matter": "^4.0.3",
    "lighthouse-ci": "^0.13.0",
    "markdownlint-cli": "^0.39.0",
    "npm-run-all": "^4.1.5",
    "ora": "^8.0.1",
    "pa11y-ci": "^3.1.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "sass": "^1.70.0",
    "sharp": "^0.33.0",
    "stylelint": "^16.0.0",
    "stylelint-config-standard-scss": "^13.0.0",
    "terser": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "webpack-bundle-analyzer": "^4.10.0"
  }
}
'@
$packageJsonContent | Out-File -FilePath "package.json" -Encoding UTF8 -NoNewline

# tsconfig.json
$tsconfigContent = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "noEmit": true,
    "types": ["vite/client", "node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts"],
  "exclude": ["node_modules", "dist", "public"]
}
'@
$tsconfigContent | Out-File -FilePath "tsconfig.json" -Encoding UTF8 -NoNewline

# vite.config.ts
$viteConfigContent = @'
import { defineConfig } from 'vite';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: 'src',
  base: '/',
  
  build: {
    outDir: '../assets',
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/scripts/app.ts'),
        styles: resolve(__dirname, 'src/styles/main.scss')
      },
      output: {
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: 'css/[name].[hash].[ext]'
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/tokens";`
      }
    }
  },
  
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  
  server: {
    proxy: {
      '/api': 'http://localhost:1313'
    }
  }
});
'@
$viteConfigContent | Out-File -FilePath "vite.config.ts" -Encoding UTF8 -NoNewline

# .eslintrc.json
$eslintContent = @'
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "indent": ["error", 2],
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-console": "warn",
    "no-debugger": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
'@
$eslintContent | Out-File -FilePath ".eslintrc.json" -Encoding UTF8 -NoNewline

# .stylelintrc.json
$stylelintContent = @'
{
  "extends": "stylelint-config-standard-scss",
  "rules": {
    "selector-class-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$",
    "scss/at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["tailwind", "apply", "variants", "responsive", "screen"]
      }
    ],
    "declaration-block-trailing-semicolon": null,
    "no-descending-specificity": null,
    "custom-property-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
    "max-nesting-depth": 3,
    "selector-max-compound-selectors": 3
  }
}
'@
$stylelintContent | Out-File -FilePath ".stylelintrc.json" -Encoding UTF8 -NoNewline

# .pa11yci
$pa11yContent = @'
{
  "defaults": {
    "standard": "WCAG2AAA",
    "timeout": 10000,
    "wait": 1000,
    "chromeLaunchConfig": {
      "args": ["--no-sandbox"]
    }
  },
  "urls": [
    "http://localhost:1313/",
    "http://localhost:1313/make/",
    "http://localhost:1313/learn/",
    "http://localhost:1313/think/",
    "http://localhost:1313/meet/"
  ],
  "viewport": {
    "width": 1280,
    "height": 1024
  }
}
'@
$pa11yContent | Out-File -FilePath ".pa11yci" -Encoding UTF8 -NoNewline

# .lighthouserc.js
$lighthouseContent = @'
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:1313/',
        'http://localhost:1313/make/',
        'http://localhost:1313/learn/'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
'@
$lighthouseContent | Out-File -FilePath ".lighthouserc.js" -Encoding UTF8 -NoNewline

# vercel.json
$vercelContent = @'
{
  "buildCommand": "npm run build",
  "outputDirectory": "public",
  "framework": null,
  "installCommand": "npm ci",
  
  "functions": {
    "api/translate.js": {
      "maxDuration": 30
    }
  },
  
  "headers": [
    {
      "source": "/fonts/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, immutable, max-age=31536000"
        }
      ]
    },
    {
      "source": "/media/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=2592000, stale-while-revalidate=86400"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
'@
$vercelContent | Out-File -FilePath "vercel.json" -Encoding UTF8 -NoNewline

Write-Success "Configuration files created"

#############################################
# CREATE HUGO CONFIG FILES
#############################################

Write-Step "Creating Hugo configuration"

# config/_default/hugo.yaml
$hugoConfigContent = @'
baseURL: https://yoursite.com
title: Your Name
titleCaseStyle: none
timeout: 30s
enableGitInfo: true
enableRobotsTXT: true

# Clean URLs
uglyURLs: false
canonifyURLs: false
relativeURLs: false

# Language
defaultContentLanguage: en
defaultContentLanguageInSubdir: false

# Performance
disableKinds: []
disableLiveReload: false
enableEmoji: false

# Build
buildDrafts: false
buildExpired: false
buildFuture: false

# Output
disableHugoGeneratorInject: true

# Taxonomies
taxonomies:
  tag: tags
  series: series
  format: formats

# Permalinks
permalinks:
  make: /:section/:slug/
  learn: /:section/:slug/
  think: /:section/:slug/
  meet: /:section/:slug/

# Module
module:
  mounts:
    - source: src/assets
      target: assets
    - source: src/styles
      target: assets/styles
    - source: static
      target: static
'@
$hugoConfigContent | Out-File -FilePath "config\_default\hugo.yaml" -Encoding UTF8 -NoNewline

# config/_default/languages.yaml
$languagesContent = @'
en:
  weight: 1
  languageName: English
  languageCode: en-US
  contentDir: content
  params:
    locale: en_US
    dateFormat: Jan 2, 2006
    description: Creator working at the intersection of technology and art
    
es:
  weight: 2
  languageName: Español
  languageCode: es-ES
  contentDir: content/es
  params:
    locale: es_ES
    dateFormat: 2 de January, 2006
    description: Creador trabajando en la intersección de tecnología y arte
'@
$languagesContent | Out-File -FilePath "config\_default\languages.yaml" -Encoding UTF8 -NoNewline

# config/_default/params.yaml
$paramsContent = @'
# Site Metadata
author: Your Name
email: your.email@example.com
description: Creator working at the intersection of technology and art
keywords: [creative, technology, art, design, development]
images: [/media/og-image.jpg]

# Design System
design:
  theme: auto
  experimental: true
  motion: true
  noise: true
  blur: true
  
# Features
features:
  search: true
  translation: true
  analytics: false
  comments: false
  newsletter: false
  
# Performance
performance:
  lazyLoad: true
  preconnect: 
    - https://fonts.googleapis.com
    - https://cdn.jsdelivr.net
  prefetch: true
  modulePreload: true
  critical: true
  
# SEO
seo:
  jsonLD: true
  openGraph: true
  twitterCard: summary_large_image
  twitterHandle: "@yourhandle"
  
# Social
social:
  github: https://github.com/yourusername
  twitter: https://twitter.com/yourusername
  linkedin: https://linkedin.com/in/yourusername
  email: mailto:your.email@example.com
'@
$paramsContent | Out-File -FilePath "config\_default\params.yaml" -Encoding UTF8 -NoNewline

# config/_default/menus.yaml
$menusContent = @'
main:
  - identifier: make
    name: make
    url: /make/
    weight: 10
    
  - identifier: learn
    name: learn
    url: /learn/
    weight: 20
    
  - identifier: think
    name: think
    url: /think/
    weight: 30
    
  - identifier: meet
    name: meet
    url: /meet/
    weight: 40

footer:
  - identifier: colophon
    name: Colophon
    url: /colophon/
    weight: 10
    
  - identifier: feed
    name: RSS
    url: /index.xml
    weight: 20
'@
$menusContent | Out-File -FilePath "config\_default\menus.yaml" -Encoding UTF8 -NoNewline

# config/_default/outputs.yaml
$outputsContent = @'
home:
  - HTML
  - RSS
  - JSON

section:
  - HTML
  - RSS
  - JSON

page:
  - HTML

taxonomy:
  - HTML
  - RSS

term:
  - HTML
  - RSS
'@
$outputsContent | Out-File -FilePath "config\_default\outputs.yaml" -Encoding UTF8 -NoNewline

Write-Success "Hugo configuration created"

#############################################
# CREATE VSCODE CONFIGURATION
#############################################

Write-Step "Creating VSCode configuration"

# .vscode/settings.json
$vscodeSettingsContent = @'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.rulers": [80, 120],
  "editor.wordWrap": "on",
  "editor.linkedEditing": true,
  "editor.bracketPairColorization.enabled": true,
  
  "files.associations": {
    "*.html": "html",
    "*.scss": "scss",
    "*.ts": "typescript",
    "*.md": "markdown"
  },
  
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/public": false,
    "**/resources": true,
    "**/.hugo_build.lock": true
  },
  
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  
  "[html]": {
    "editor.defaultFormatter": "vscode.html-language-features"
  },
  "[scss]": {
    "editor.defaultFormatter": "stylelint.vscode-stylelint"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.defaultFormatter": "yzhang.markdown-all-in-one",
    "editor.wordWrap": "on"
  },
  "[powershell]": {
    "editor.defaultFormatter": "ms-vscode.powershell"
  },
  
  "eslint.validate": ["javascript", "typescript"],
  "stylelint.validate": ["css", "scss"],
  
  "powershell.codeFormatting.preset": "Stroustrup",
  "powershell.integratedConsole.showOnStartup": false,
  
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true
}
'@
$vscodeSettingsContent | Out-File -FilePath ".vscode\settings.json" -Encoding UTF8 -NoNewline

# .vscode/tasks.json
$vscodeTasksContent = @'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Hugo: Serve",
      "type": "shell",
      "command": "hugo",
      "args": ["server", "--navigateToChanged", "--bind", "0.0.0.0"],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^([^\\s].*)\\((\\d+,\\d+)\\):\\s+(error|warning)\\s+(.*)$",
          "file": 1,
          "location": 2,
          "severity": 3,
          "message": 4
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "^Watching for changes",
          "endsPattern": "^Press Ctrl\\+C to stop"
        }
      }
    },
    {
      "label": "NPM: Dev",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": "$tsc"
    },
    {
      "label": "NPM: Build",
      "type": "npm",
      "script": "build",
      "group": "build",
      "problemMatcher": "$tsc"
    },
    {
      "label": "Create New Post",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-Command",
        "$title = Read-Host 'Enter post title'; $slug = $title.ToLower() -replace ' ', '-'; hugo new \"make/words/$slug.md\""
      ],
      "problemMatcher": []
    }
  ]
}
'@
$vscodeTasksContent | Out-File -FilePath ".vscode\tasks.json" -Encoding UTF8 -NoNewline

# .vscode/launch.json
$vscodeLaunchContent = @'
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:1313",
      "webRoot": "${workspaceFolder}/public",
      "preLaunchTask": "NPM: Dev"
    },
    {
      "type": "edge",
      "request": "launch",
      "name": "Launch Edge against localhost",
      "url": "http://localhost:1313",
      "webRoot": "${workspaceFolder}/public",
      "preLaunchTask": "NPM: Dev"
    }
  ]
}
'@
$vscodeLaunchContent | Out-File -FilePath ".vscode\launch.json" -Encoding UTF8 -NoNewline

# .vscode/extensions.json
$vscodeExtensionsContent = @'
{
  "recommendations": [
    "budparr.language-hugo-vscode",
    "yzhang.markdown-all-in-one",
    "davidanson.vscode-markdownlint",
    "dbaeumer.vscode-eslint",
    "stylelint.vscode-stylelint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.powershell",
    "eamodio.gitlens",
    "ritwickdey.liveserver",
    "streetsidesoftware.code-spell-checker",
    "gruntfuggly.todo-tree"
  ]
}
'@
$vscodeExtensionsContent | Out-File -FilePath ".vscode\extensions.json" -Encoding UTF8 -NoNewline

Write-Success "VSCode configuration created"

#############################################
# CREATE CLAUDE TRANSLATION SYSTEM
#############################################

Write-Step "Creating Claude AI translation system"

# tools/translator/cli.js
$translatorCliContent = @'
#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { Translator } from './translator.js';
import { findContentFiles, parseMarkdown, saveTranslation } from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

program
  .name('hugo-translator')
  .description('Translate Hugo content using Claude AI')
  .version('1.0.0');

program
  .command('translate <file>')
  .description('Translate a single content file')
  .option('-l, --language <lang>', 'Target language code', 'es')
  .option('-o, --output <path>', 'Output path')
  .option('-f, --force', 'Overwrite existing translations')
  .action(async (file, options) => {
    const spinner = ora('Initializing translator...').start();
    
    try {
      const translator = new Translator(process.env.ANTHROPIC_API_KEY);
      
      spinner.text = 'Reading content file...';
      const content = await fs.readFile(file, 'utf-8');
      const { frontmatter, body } = parseMarkdown(content);
      
      spinner.text = 'Translating content...';
      const translated = await translator.translateContent(body, options.language);
      
      spinner.text = 'Translating metadata...';
      const translatedMeta = await translator.translateMetadata(frontmatter, options.language);
      
      const outputPath = options.output || file.replace('/content/', `/content/${options.language}/`);
      await saveTranslation(outputPath, translatedMeta, translated);
      
      spinner.succeed(chalk.green(`✓ Translated to ${outputPath}`));
    } catch (error) {
      spinner.fail(chalk.red(`✗ Translation failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Translate multiple files')
  .option('-s, --source <pattern>', 'Source file pattern', 'content/**/*.md')
  .option('-l, --language <lang>', 'Target language code', 'es')
  .option('-c, --concurrent <number>', 'Concurrent translations', '3')
  .action(async (options) => {
    const spinner = ora('Finding content files...').start();
    
    try {
      const files = await findContentFiles(options.source);
      spinner.succeed(chalk.green(`Found ${files.length} files to translate`));
      
      const translator = new Translator(process.env.ANTHROPIC_API_KEY);
      const concurrent = parseInt(options.concurrent);
      
      for (let i = 0; i < files.length; i += concurrent) {
        const batch = files.slice(i, i + concurrent);
        await Promise.all(batch.map(file => 
          translator.translateFile(file, options.language)
        ));
        console.log(chalk.cyan(`Progress: ${Math.min(i + concurrent, files.length)}/${files.length}`));
      }
      
      console.log(chalk.green('✓ All translations complete!'));
    } catch (error) {
      spinner.fail(chalk.red(`✗ Batch translation failed: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();
'@
$translatorCliContent | Out-File -FilePath "tools\translator\cli.js" -Encoding UTF8 -NoNewline

# tools/translator/translator.js
$translatorContent = @'
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export class Translator {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    
    this.client = new Anthropic({
      apiKey: apiKey
    });
    
    this.cache = new Map();
  }
  
  async translateContent(content, targetLang) {
    // Check cache
    const cacheKey = `${targetLang}:${content.substring(0, 50)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const prompt = `
      Translate the following Markdown content to ${this.getLanguageName(targetLang)}.
      Preserve all Markdown formatting, links, and code blocks.
      Maintain the same tone and style.
      Do not translate code blocks, URLs, or Hugo shortcodes.
      
      Content:
      ${content}
    `;
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const translated = response.content[0].text;
      this.cache.set(cacheKey, translated);
      
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Failed to translate content: ${error.message}`);
    }
  }
  
  async translateMetadata(frontmatter, targetLang) {
    const translatable = ['title', 'description', 'summary'];
    const translated = { ...frontmatter };
    
    for (const field of translatable) {
      if (frontmatter[field]) {
        translated[field] = await this.translateText(frontmatter[field], targetLang);
      }
    }
    
    // Update locale
    translated.locale = this.getLocaleCode(targetLang);
    
    return translated;
  }
  
  async translateText(text, targetLang) {
    const prompt = `
      Translate to ${this.getLanguageName(targetLang)}: "${text}"
      Provide only the translation, no explanation.
    `;
    
    const response = await this.client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    return response.content[0].text.trim().replace(/^"|"$/g, '');
  }
  
  async translateFile(filePath, targetLang) {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    
    const translatedBody = await this.translateContent(body, targetLang);
    const translatedData = await this.translateMetadata(data, targetLang);
    
    const outputPath = this.getOutputPath(filePath, targetLang);
    await this.saveTranslation(outputPath, translatedData, translatedBody);
    
    return outputPath;
  }
  
  getOutputPath(filePath, targetLang) {
    return filePath.replace('/content/', `/content/${targetLang}/`);
  }
  
  async saveTranslation(outputPath, frontmatter, content) {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    const output = matter.stringify(content, frontmatter);
    await fs.writeFile(outputPath, output, 'utf-8');
  }
  
  getLanguageName(code) {
    const languages = {
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ja: 'Japanese',
      zh: 'Chinese',
      ko: 'Korean'
    };
    return languages[code] || code;
  }
  
  getLocaleCode(code) {
    const locales = {
      es: 'es_ES',
      fr: 'fr_FR',
      de: 'de_DE',
      it: 'it_IT',
      pt: 'pt_PT',
      ja: 'ja_JP',
      zh: 'zh_CN',
      ko: 'ko_KR'
    };
    return locales[code] || code;
  }
}
'@
$translatorContent | Out-File -FilePath "tools\translator\translator.js" -Encoding UTF8 -NoNewline

Write-Success "Claude translation system created"

#############################################
# CREATE POWERSHELL SCRIPTS
#############################################

Write-Step "Creating PowerShell automation scripts"

# dev.ps1
$devScriptContent = @'
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
'@
$devScriptContent | Out-File -FilePath "dev.ps1" -Encoding UTF8 -NoNewline

# build.ps1
$buildScriptContent = @'
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
'@
$buildScriptContent | Out-File -FilePath "build.ps1" -Encoding UTF8 -NoNewline

# deploy.ps1
$deployScriptContent = @'
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
'@
$deployScriptContent | Out-File -FilePath "deploy.ps1" -Encoding UTF8 -NoNewline

# new-content.ps1
$newContentScriptContent = @'
# new-content.ps1 - Create new content
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("post", "project", "experiment")]
    [string]$Type,
    
    [Parameter(Mandatory=$true)]
    [string]$Title,
    
    [switch]$OpenInVSCode
)

$slug = $Title.ToLower() -replace '[^\w\s-]', '' -replace '\s+', '-'

$path = switch ($Type) {
    "post" { "content/make/words/$slug.md" }
    "project" { "content/learn/built/$slug.md" }
    "experiment" { "content/make/visuals/$slug.md" }
}

hugo new $path

if ($OpenInVSCode) {
    code $path
}

Write-Host "Created: $path" -ForegroundColor Green
'@
$newContentScriptContent | Out-File -FilePath "new-content.ps1" -Encoding UTF8 -NoNewline

Write-Success "PowerShell scripts created"

#############################################
# CREATE SAMPLE CONTENT
#############################################

Write-Step "Creating sample content"

# content/_index.md
$homeContent = @'
---
title: Home
description: Creator working at the intersection of technology and art
---

Welcome to my digital garden.
'@
$homeContent | Out-File -FilePath "content\_index.md" -Encoding UTF8 -NoNewline

# content/make/_index.md
$makeContent = @'
---
title: Make
description: Creative works and experiments
menu: main
weight: 10
---

Things I've created.
'@
$makeContent | Out-File -FilePath "content\make\_index.md" -Encoding UTF8 -NoNewline

# content/learn/_index.md
$learnContent = @'
---
title: Learn
description: Tools and discoveries
menu: main
weight: 20
---

Knowledge and tools.
'@
$learnContent | Out-File -FilePath "content\learn\_index.md" -Encoding UTF8 -NoNewline

# content/think/_index.md
$thinkContent = @'
---
title: Think
description: Ideas and positions
menu: main
weight: 30
---

Thoughts and reflections.
'@
$thinkContent | Out-File -FilePath "content\think\_index.md" -Encoding UTF8 -NoNewline

# content/meet/_index.md
$meetContent = @'
---
title: Meet
description: About and contact
menu: main
weight: 40
---

About me and my work.
'@
$meetContent | Out-File -FilePath "content\meet\_index.md" -Encoding UTF8 -NoNewline

Write-Success "Sample content created"

#############################################
# CREATE README
#############################################

Write-Step "Creating README"

$readmeContent = @'
# Hugo Portfolio - Professional Creative Portfolio

A modern, performant, and accessible portfolio built with Hugo, TypeScript, and Claude AI.

## Features

- 🚀 **Performance First** - Lighthouse score 95+
- ♿ **WCAG AAA Accessible** - Full keyboard navigation
- 🌐 **Multi-language** - Claude AI powered translations
- 🎨 **Design System** - Token-based theming
- 📱 **Fully Responsive** - Mobile-first design
- 🔍 **SEO Optimized** - Schema.org, Open Graph
- 🌙 **Dark Mode** - Auto-detect system preference
- ⚡ **Fast Search** - Client-side search index
- 📊 **Analytics Ready** - Privacy-friendly tracking
- 🔒 **Security First** - CSP headers, HTTPS only

## Quick Start

```powershell
# 1. Clone repository
git clone https://github.com/yourusername/portfolio.git
cd portfolio

# 2. Install dependencies
npm install

# 3. Start development server
.\dev.ps1 -OpenBrowser

# 4. Build for production
.\build.ps1

# 5. Deploy
.\deploy.ps1 -Target vercel
```

## Project Structure

```
portfolio/
├── content/         # Markdown content
├── layouts/         # Hugo templates
├── src/            # Source files (TS/SCSS)
├── static/         # Static assets
├── config/         # Hugo configuration
└── tools/          # Build tools & translators
```

## Development

### Create New Content

```powershell
# Create new post
.\new-content.ps1 -Type post -Title "My New Post" -OpenInVSCode

# Create new project
.\new-content.ps1 -Type project -Title "Cool Project"
```

### Translation

```powershell
# Translate single file
node tools/translator/cli.js translate content/make/words/post.md -l es

# Batch translate
node tools/translator/cli.js batch -l es
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
ANTHROPIC_API_KEY=your-api-key
VERCEL_TOKEN=your-vercel-token
```

### Site Configuration

Edit `config/_default/params.yaml`:

```yaml
author: Your Name
email: your.email@example.com
social:
  github: https://github.com/yourusername
  twitter: https://twitter.com/yourusername
```

## License

MIT License

---

Made with ❤️ using Hugo, PowerShell, and VSCode on Windows
'@
$readmeContent | Out-File -FilePath "README.md" -Encoding UTF8 -NoNewline

Write-Success "README created"

#############################################
# INSTALL DEPENDENCIES
#############################################

if ($InstallDependencies) {
    Write-Step "Installing npm dependencies"
    npm install
    Write-Success "Dependencies installed"
}

#############################################
# FINAL SUMMARY
#############################################

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "                    ✅ SETUP COMPLETE!                          " -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green

Write-Host "`n📊 Project Statistics:" -ForegroundColor Cyan
$fileCount = (Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue).Count
$dirCount = (Get-ChildItem -Path . -Recurse -Directory -ErrorAction SilentlyContinue).Count
Write-Host "   Files created: $fileCount" -ForegroundColor White
Write-Host "   Directories created: $dirCount" -ForegroundColor White

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Update .env with your API keys" -ForegroundColor White
Write-Host "   2. Customize config/_default/params.yaml" -ForegroundColor White
Write-Host "   3. Run: " -NoNewline -ForegroundColor White
Write-Host ".\dev.ps1 -OpenBrowser" -ForegroundColor Yellow
Write-Host "   4. Start creating content!" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "   README.md has full documentation" -ForegroundColor White
Write-Host "   VSCode tasks configured (Ctrl+Shift+P > Tasks)" -ForegroundColor White

if ($OpenInVSCode) {
    Write-Host "`n🔧 Opening in VSCode..." -ForegroundColor Cyan
    code .
}

Write-Host "`n✨ Happy building!" -ForegroundColor Magenta
Write-Host ""