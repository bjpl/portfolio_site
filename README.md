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