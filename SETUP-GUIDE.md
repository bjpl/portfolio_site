# Complete Setup Guide

Follow these steps to get your portfolio site running locally and deployed for FREE!

## Part 1: Local Setup (5 minutes)

### Step 1: Test Current Setup
Your site is already running! Check these URLs:
- Website: http://localhost:1313
- Admin: http://localhost:1313/admin/login.html
- API Health: http://localhost:3335/api/health

### Step 2: Quick Restart (if needed)
```bash
# Windows - just double-click:
start.bat

# Mac/Linux:
./start.sh
```

## Part 2: GitHub Setup (10 minutes)

### Step 1: Create GitHub Account (if needed)
1. Go to [github.com](https://github.com)
2. Click "Sign up" (it's free)
3. Verify your email

### Step 2: Create New Repository
1. Click the "+" icon (top right)
2. Select "New repository"
3. Name it: `portfolio-site`
4. Make it Public (for free hosting)
5. DON'T initialize with README (we have one)
6. Click "Create repository"

### Step 3: Push Your Code
GitHub will show you commands. Run these in your terminal:

```bash
# Initialize and push
git add .
git commit -m "Initial portfolio site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/portfolio-site.git
git push -u origin main
```

## Part 3: Netlify Deployment (10 minutes)

### Step 1: Create Netlify Account
1. Go to [netlify.com](https://netlify.com)
2. Click "Sign up"
3. Choose "Sign up with GitHub" (easier!)

### Step 2: Deploy Your Site
1. Click "Add new site"
2. Choose "Import an existing project"
3. Select "GitHub"
4. Choose your `portfolio-site` repository
5. Netlify auto-detects Hugo! Just click "Deploy"

### Step 3: Your Site is Live!
- Netlify gives you a URL like: `amazing-einstein-123abc.netlify.app`
- Visit it - your site is live!
- Every time you push to GitHub, it auto-updates!

## Part 4: Custom Domain (Optional)

### Option A: Use Netlify Subdomain (FREE)
1. Go to Site Settings > Domain Management
2. Click "Change site name"
3. Choose something like: `yourname.netlify.app`

### Option B: Custom Domain (if you have one)
1. Go to Domain Settings
2. Add your domain
3. Follow DNS instructions

## Part 5: Make Your First Edit

### Edit Content Locally
1. Open `content/make/words/first-post.md`
2. Edit the content
3. Save the file

### Push Changes
```bash
git add .
git commit -m "Update content"
git push
```

### Watch It Deploy!
- Go to Netlify dashboard
- See your site building
- In 30 seconds, changes are live!

## Troubleshooting

### "Port already in use"
```bash
# Windows
netstat -ano | findstr :1313
# Kill the process ID shown

# Then restart:
./start.bat
```

### "Hugo not found"
Download Hugo from: https://gohugo.io/getting-started/installing/

### "Node not found"
Download Node.js from: https://nodejs.org

### Admin Panel Not Working?
The admin panel needs the backend running locally. For production, use:
1. Local editing + git push
2. Or use Netlify CMS (free)
3. Or Forestry.io (free tier)

## What's Next?

### Customize Your Content
- Edit files in `content/` folder
- Add your projects in `content/make/`
- Write blog posts in `content/think/`
- Update about in `content/meet/`

### Change Colors/Style
Edit `static/css/main.css`

### Add Features
- Contact form works with Netlify Forms (free)
- Add Google Analytics (free)
- Add comments with Disqus (free)

## Need Help?

### Quick Fixes
1. Restart everything: `./start.bat`
2. Check if services running: 
   - http://localhost:1313
   - http://localhost:3335/api/health
3. Git issues? Start fresh:
   ```bash
   git status
   git add .
   git commit -m "Fix"
   git push
   ```

### Resources
- Hugo Docs: https://gohugo.io/documentation/
- Netlify Docs: https://docs.netlify.com/
- This project: Check `FREE-HOSTING-GUIDE.md`

## Success Checklist

- [ ] Local site works at http://localhost:1313
- [ ] Created GitHub account
- [ ] Pushed code to GitHub
- [ ] Created Netlify account
- [ ] Connected GitHub to Netlify
- [ ] Site is live on Netlify
- [ ] Made first edit and deployed

Congratulations! Your portfolio is live and FREE forever! 🎉