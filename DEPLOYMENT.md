# Portfolio Site Deployment Guide

This is a simplified portfolio site with Hugo static site generator and a minimal Node.js backend for dynamic features.

## Architecture

- **Frontend**: Hugo static site generator
- **Backend**: Simple Node.js/Express API
- **Database**: None (content stored in markdown files)
- **Contact Form**: Saves to files or sends email

## Local Development

### Prerequisites
- Node.js 18+ 
- Hugo 0.120+
- Git

### Setup

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Start services:
   ```bash
   # Terminal 1: Hugo
   hugo server

   # Terminal 2: Backend API
   cd backend
   npm run start:simple
   ```

5. Access the site at http://localhost:1313

## Production Deployment

### Option 1: Static Hosting + Serverless Functions

**Frontend (Netlify/Vercel/GitHub Pages):**
1. Build Hugo site: `hugo --minify`
2. Deploy `public/` directory
3. Configure custom domain

**Backend (Vercel Functions/Netlify Functions):**
1. Convert endpoints to serverless functions
2. Deploy to same platform as frontend
3. Update API URLs in frontend

### Option 2: VPS Deployment (DigitalOcean/Linode)

1. **Setup server:**
   ```bash
   # Install Node.js and Hugo
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo snap install hugo --channel=extended
   ```

2. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd portfolio_site
   cd backend && npm install --production
   ```

3. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start backend/src/server-simple.js --name portfolio-api
   pm2 save
   pm2 startup
   ```

4. **Setup Nginx:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       # Serve Hugo static files
       location / {
           root /var/www/portfolio_site/public;
           try_files $uri $uri/ /index.html;
       }
       
       # Proxy API requests
       location /api {
           proxy_pass http://localhost:3335;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### Option 3: Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY backend/package*.json ./
   RUN npm ci --production
   COPY backend/ .
   COPY public/ ./public/
   EXPOSE 3335
   CMD ["node", "src/server-simple.js"]
   ```

2. **Build and run:**
   ```bash
   docker build -t portfolio-app .
   docker run -p 3335:3335 --env-file .env portfolio-app
   ```

## Content Management

### Adding New Projects

1. Create markdown file in `content/make/[category]/`
2. Add frontmatter:
   ```yaml
   ---
   title: "Project Title"
   date: 2025-08-16
   draft: false
   description: "Brief description"
   tags: ["tag1", "tag2"]
   featured: true  # For homepage display
   ---
   ```
3. Rebuild Hugo: `hugo`

### Updating Skills

Edit the skills array in `backend/src/server-simple.js`

### Managing Contact Form

- Messages saved to `backend/data/contacts/`
- Configure SMTP in `.env` for email notifications

## Monitoring

- Check API health: `curl http://yourdomain.com/api/health`
- View PM2 logs: `pm2 logs portfolio-api`
- Monitor with: `pm2 monit`

## Backup Strategy

1. **Content**: Git repository contains all content
2. **Contact Messages**: Backup `backend/data/contacts/` regularly
3. **Configuration**: Keep `.env` file backed up securely

## Performance Tips

1. Enable Hugo minification: `hugo --minify`
2. Use CDN for static assets
3. Enable gzip compression in Nginx
4. Cache API responses where appropriate

## Troubleshooting

**Hugo not building:**
- Check markdown syntax in content files
- Verify Hugo version: `hugo version`

**API not responding:**
- Check PM2 status: `pm2 status`
- View logs: `pm2 logs portfolio-api`
- Verify port is not in use: `netstat -tulpn | grep 3335`

**Contact form not sending emails:**
- Verify SMTP credentials in `.env`
- Check firewall allows outbound SMTP
- Messages still saved to files as backup

## Security Checklist

- [ ] Set strong passwords
- [ ] Enable firewall (ufw)
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS
- [ ] Set up fail2ban
- [ ] Regular backups
- [ ] Monitor logs