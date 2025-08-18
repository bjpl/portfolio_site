# Netlify Deployment Guide

## Quick Deploy Options

### Option 1: Manual Deploy (Easiest)
1. Open https://app.netlify.com
2. Drag and drop the `public` folder onto the Netlify dashboard
3. Your site will be live instantly!

### Option 2: CLI Deploy (Already Set Up)
```powershell
# Run the deployment script
.\deploy-netlify.ps1
```

### Option 3: Git Integration (Automatic)
1. Push your code to GitHub
2. Connect your GitHub repo to Netlify
3. Set build command: `hugo --minify`
4. Set publish directory: `public`

## Current Status
✅ **Site Built**: The Hugo site has been built successfully in the `public` folder
✅ **Backend Running**: API server is running on port 3000
✅ **Netlify Logged In**: You're authenticated as brandon.lambert87@gmail.com
⏳ **Ready to Deploy**: Choose one of the options above

## Your Site Structure

```
public/                 # ← This is what gets deployed to Netlify
├── index.html         # Main site
├── admin/             # Admin panel
│   ├── login.html    # Admin login
│   ├── dashboard.html # Admin dashboard
│   └── ...           # Other admin pages
├── api/              # API documentation
├── css/              # Stylesheets
├── js/               # JavaScript
└── ...               # Other static assets
```

## Environment Variables for Netlify

Add these in Netlify Dashboard → Site Settings → Environment Variables:

```env
# API Configuration (if using serverless functions)
JWT_SECRET=your-secret-key-here
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$2a$10$... (generate with bcrypt)

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Netlify Functions (Optional)

If you want to run the backend API as serverless functions:

1. The functions are already set up in `netlify/functions/`
2. They'll automatically deploy with your site
3. Access them at: `https://your-site.netlify.app/.netlify/functions/function-name`

## Deploy Now!

### Quick Manual Deploy:
1. Open File Explorer
2. Navigate to: `C:\Users\brand\Development\Project_Workspace\portfolio_site\public`
3. Select all files (Ctrl+A)
4. Drag to https://app.netlify.com

Your site will be live in seconds!

## Post-Deployment

After deployment, you can:
1. Access your site at the provided URL
2. Test the admin panel at `/admin/login.html`
3. Use the test page at `/admin/test-integration.html`

## Troubleshooting

### Issue: Admin panel not working
**Solution**: The admin panel needs a backend API. Either:
- Use the Netlify Functions (serverless)
- Deploy the backend separately (Heroku, Railway, etc.)
- Use demo mode for testing

### Issue: Images not loading
**Solution**: Check that all image paths are relative and start with `/`

### Issue: 404 errors
**Solution**: Add a `_redirects` file in the public folder:
```
/*    /index.html   200
```

## Success Metrics

Your deployment is successful when:
- ✅ Site loads at the Netlify URL
- ✅ Navigation works
- ✅ Images display correctly
- ✅ Admin panel is accessible
- ✅ No console errors

---

**Ready to deploy!** Choose Option 1 (Manual) for the quickest deployment.