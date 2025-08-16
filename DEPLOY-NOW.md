# 🚀 Deploy Your Portfolio NOW!

## ✅ GitHub Status: COMPLETE!
Your code is now live at: https://github.com/bjpl/portfolio_site

## 🎯 Deploy to Netlify in 2 Minutes

### Option 1: One-Click Deploy (Easiest!)

Click this button to deploy directly:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/bjpl/portfolio_site)

### Option 2: Manual Deploy (More Control)

1. **Go to Netlify:**
   https://app.netlify.com/signup

2. **Sign up with GitHub** (use your bjpl account)

3. **Click "Import from Git"**

4. **Choose GitHub** → **Select "portfolio_site"**

5. **Configure your build:**
   - Build command: `hugo --minify`
   - Publish directory: `public`
   - Everything else: Leave as default

6. **Click "Deploy portfolio_site"**

## 📝 After Deployment

### Your Site URLs:
- Temporary: `https://[random-name].netlify.app`
- Custom: Change in Site Settings → Change site name
- Example: `https://bjpl-portfolio.netlify.app`

### Next Steps:
1. **Change site name:** Settings → Domain management → Change site name
2. **Add custom domain:** (if you have one) Settings → Domain management → Add custom domain
3. **Enable form notifications:** Forms → Settings → Form notifications

## 🔧 Environment Variables for Netlify

In Netlify Dashboard → Site Settings → Environment Variables, add:

```
HUGO_VERSION = 0.121.0
```

## 📊 What Happens Next?

1. Netlify will build your site (takes ~30 seconds)
2. Your site goes live instantly
3. Every push to GitHub auto-deploys
4. You get HTTPS/SSL for free
5. Global CDN for fast loading

## 🎨 Quick Customizations

### Change Site Title
Edit `config.toml`:
```toml
title = "Your Name Portfolio"
```

### Update Contact Email
Edit `netlify/functions/contact.js` to add your email

### Change Colors
Edit `static/css/main.css` - look for `:root` section

## 💻 Local Commands Reference

```bash
# View your live site
open https://[your-site].netlify.app

# Make changes locally
./start.bat

# Push updates
git add .
git commit -m "Update"
git push

# Check deployment status
open https://app.netlify.com/sites/[your-site]/deploys
```

## 🆘 Troubleshooting

### Build Failed?
- Check build logs in Netlify dashboard
- Most common: Wrong Hugo version (set HUGO_VERSION=0.121.0 in environment)

### Forms Not Working?
- Netlify Forms are automatically detected
- Check Forms tab in Netlify dashboard

### Admin Panel?
- For production, the simplified contact form will work through Netlify
- For full CMS, keep using local development + git push

## 🎉 Congratulations!

Your portfolio is about to be:
- ✅ Live on the internet
- ✅ Fast (CDN + static)
- ✅ Secure (HTTPS)
- ✅ Free forever
- ✅ Auto-updating

Just click the deploy button above or follow the manual steps!

---

**Your GitHub:** https://github.com/bjpl/portfolio_site
**Your Email:** brandon.lambert87@gmail.com
**Deploy Time:** ~2 minutes
**Cost:** $0.00/month forever