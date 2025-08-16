# Free & Sustainable Hosting Guide for Portfolio Site

## Current Status
- **Hugo Site**: Running on http://localhost:1313
- **Backend API**: Running on http://localhost:3335
- **Admin Panel**: http://localhost:1313/admin/login.html (admin/password123)

## Quick Start (Local Development)

### Windows
```bash
# Double-click start.bat or run:
./start.bat
```

### Mac/Linux
```bash
chmod +x start.sh
./start.sh
```

## Free Hosting Options (Recommended)

### Option 1: Netlify + Netlify Functions (BEST FREE OPTION)
**Cost: $0/month forever**
**Perfect for: Portfolio sites with contact forms**

1. **Sign up at netlify.com (free)**

2. **Prepare for deployment:**
```bash
# Build static site
hugo --minify

# Create netlify.toml
```

3. **Create `netlify.toml` in root:**
```toml
[build]
  command = "hugo --minify"
  publish = "public"

[build.environment]
  HUGO_VERSION = "0.121.0"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

4. **Convert backend to Netlify Functions:**
Create `netlify/functions/contact.js`:
```javascript
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  const { name, email, subject, message } = JSON.parse(event.body);
  
  // Save to Netlify Forms or send email
  // For now, just log and return success
  console.log('Contact form:', { name, email, subject, message });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
```

5. **Deploy:**
- Push to GitHub
- Connect GitHub repo to Netlify
- Auto-deploys on every push!

### Option 2: Vercel (Also Free)
**Cost: $0/month**
**Perfect for: Next.js migration or serverless functions**

1. **Sign up at vercel.com**
2. **Install Vercel CLI:**
```bash
npm i -g vercel
```

3. **Deploy:**
```bash
vercel
```

4. **Create `vercel.json`:**
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

### Option 3: GitHub Pages + Formspree
**Cost: $0/month**
**Perfect for: Simple static sites**

1. **Enable GitHub Pages:**
- Go to repo Settings > Pages
- Source: Deploy from branch
- Branch: main, folder: /docs

2. **Build for GitHub Pages:**
```bash
# Build to docs folder
hugo -d docs --baseURL="https://yourusername.github.io/portfolio_site"
```

3. **Use Formspree for contact form:**
- Sign up at formspree.io (free tier: 50 submissions/month)
- Update contact form action:
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

### Option 4: Cloudflare Pages
**Cost: $0/month**
**Perfect for: Fast global CDN**

1. **Sign up at cloudflare.com**
2. **Connect GitHub repo**
3. **Build settings:**
   - Build command: `hugo --minify`
   - Build output: `/public`
   - Environment: `HUGO_VERSION = 0.121.0`

## Keep It Running Sustainably

### 1. Automated Local Startup (Windows)

**Add to Windows Startup:**
1. Press `Win + R`, type `shell:startup`
2. Copy `start.bat` to this folder
3. Services start automatically on Windows boot

**Or use Task Scheduler:**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: When computer starts
4. Action: Start `start.bat`

### 2. Process Manager (PM2) - Production-like locally

**Install PM2:**
```bash
npm install -g pm2
```

**Create `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [
    {
      name: 'hugo-site',
      script: 'hugo',
      args: 'server',
      cwd: './',
      watch: false
    },
    {
      name: 'backend-api',
      script: 'npm',
      args: 'run start:simple',
      cwd: './backend',
      env: {
        PORT: 3335
      }
    }
  ]
};
```

**Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save        # Save current process list
pm2 startup     # Generate startup script
```

### 3. Docker Compose (Most Professional)

**Create `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  hugo:
    image: klakegg/hugo:0.121.0-ext-alpine
    command: server --bind=0.0.0.0
    volumes:
      - .:/src
    ports:
      - "1313:1313"
    restart: unless-stopped

  backend:
    build: ./backend
    ports:
      - "3335:3335"
    environment:
      - PORT=3335
    restart: unless-stopped
```

**Create `backend/Dockerfile`:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["npm", "run", "start:simple"]
```

**Run with Docker:**
```bash
docker-compose up -d
```

## Monitoring & Maintenance

### 1. Health Checks
```bash
# Check if services are running
curl http://localhost:1313
curl http://localhost:3335/api/health
```

### 2. Auto-restart on Crash

**Windows (using NSSM):**
1. Download NSSM from nssm.cc
2. Install services:
```bash
nssm install HugoSite "C:\path\to\hugo.exe" server
nssm install BackendAPI "C:\path\to\node.exe" backend\src\server-simple.js
```

**Linux (using systemd):**
Create `/etc/systemd/system/portfolio.service`:
```ini
[Unit]
Description=Portfolio Site
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/portfolio_site
ExecStart=/path/to/start.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable portfolio
sudo systemctl start portfolio
```

## Recommended Free Setup

### For Beginners:
1. **Netlify** for hosting (free forever)
2. **GitHub** for version control (free)
3. **Formspree** for contact forms (50 free/month)

### For Advanced Users:
1. **Cloudflare Pages** for hosting (unlimited bandwidth)
2. **GitHub Actions** for CI/CD
3. **Supabase** for backend if needed (free tier generous)

### Monthly Cost: $0

## Quick Deploy Commands

```bash
# Build for production
hugo --minify

# Test production build locally
cd public && python -m http.server 8000

# Deploy to Netlify (after setup)
netlify deploy --prod

# Deploy to Vercel
vercel --prod

# Deploy to GitHub Pages
./deploy-gh-pages.sh
```

## Backup Strategy (Free)

1. **GitHub**: All code and content
2. **Google Drive**: Database backups (15GB free)
3. **Automated backups:**
```bash
# Add to cron/Task Scheduler
git add -A
git commit -m "Auto-backup $(date)"
git push
```

## Support & Updates

- **Hugo Updates**: Check hugo releases
- **Dependencies**: Run `npm audit` monthly
- **Content**: Regular git commits
- **Monitoring**: Use UptimeRobot (free tier)

## Emergency Recovery

If everything breaks:
```bash
# Reset to last known good state
git reset --hard HEAD~1

# Fresh install
rm -rf node_modules
cd backend && npm install
cd .. && ./start.bat  # or ./start.sh
```

## Questions?

The site is designed to run with zero monthly costs using:
- Static site generation (Hugo)
- Serverless functions (when deployed)
- Free hosting tiers
- Git for version control

No credit card required, ever!