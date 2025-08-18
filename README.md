# Portfolio Site

A modern, fast, and simple portfolio site built with Hugo and a custom CMS for easy content management.

## Features

✅ **Simple Content Management**
- Direct Markdown editing with live preview
- Auto-commit to Git on save
- One-click deploy to production

✅ **Performance Optimized**
- Static site generation with Hugo
- Lazy loading images
- Minified assets
- SEO optimized

✅ **Professional Features**
- Portfolio showcase
- Blog/content sections
- Contact form
- Analytics tracking
- Dark mode support
- Multi-language (EN/ES)

## Quick Start

### Prerequisites
- Node.js (v14+)
- Hugo (v0.121+)
- Git

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd portfolio_site
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Start the servers:
```bash
# Terminal 1: Start CMS server
cd backend
npm start

# Terminal 2: Start Hugo dev server
hugo server -D
```

4. Access the site:
- **Portfolio Site**: http://localhost:1313
- **Admin Panel**: http://localhost:3000/admin/simple-editor.html

## Configuration

### Google Analytics
Add your tracking ID in `config.yaml`:
```yaml
googleAnalytics: "G-XXXXXXXXXX"
```

### Site Metadata
Update site information in `config.yaml`:
```yaml
params:
  author: "Your Name"
  description: "Your site description"
  twitter_username: "yourhandle"
```

## Content Management

### Creating Content
1. Go to the admin panel
2. Click "New Content"
3. Enter filename (e.g., `blog/my-post.md`)
4. Write your content
5. Click "Save" (auto-commits to Git)

### Deploying Changes
1. Make your edits in the admin panel
2. Click "Deploy to Live"
3. Changes will be live in ~1 minute via Netlify

## Project Structure

```
portfolio_site/
├── content/          # Markdown content files
├── layouts/          # Hugo templates
├── static/           # Static assets (CSS, JS, images)
│   └── admin/        # Admin panel
├── backend/          # CMS server
│   └── src/
│       └── simple-cms-server.js
├── public/           # Built site (git-ignored)
└── config.yaml       # Hugo configuration
```

## Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set build command: `hugo --minify`
3. Set publish directory: `public`
4. Deploy!

### Manual Deploy
```bash
# Build the site
hugo --minify

# Deploy the public/ folder to your hosting
```

## Architecture

```
User → Admin Panel → Edit Markdown → Git Commit → Push → Netlify → Live Site
```

This is a **simple, working solution** that:
- Directly edits Hugo markdown files
- Auto-commits changes to Git
- Auto-deploys via Netlify
- No database required
- No complex build process

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.