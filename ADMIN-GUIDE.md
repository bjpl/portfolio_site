# Portfolio Admin Panel - Quick Start Guide

## 🚀 Getting Started

### Method 1: Quick Start (Windows)
```batch
# Just double-click the start-admin.bat file
start-admin.bat
```

### Method 2: Manual Start
```bash
# 1. Start the backend server
cd backend
node src/server-simple.js

# 2. Open browser to admin panel
http://localhost:3000/admin/login.html
```

## 🔑 Login Credentials
- **Username:** admin
- **Password:** password123

## 📍 Important URLs

- **Admin Login:** http://localhost:3000/admin/login.html
- **System Status:** http://localhost:3000/admin/system-status.html
- **Dashboard:** http://localhost:3000/admin/dashboard.html
- **Test Auth:** http://localhost:3000/admin/test-auth.html

## ✅ System Check

1. **First Time Setup:**
   - Open http://localhost:3000/admin/system-status.html
   - Click "Run All Tests" to verify everything is working
   - Click "Test Login" to authenticate
   - Click "Go to Admin Panel" to start

2. **If You See "Demo Mode":**
   - Open System Status page
   - Click "Clear Storage" 
   - Click "Test Login"
   - Try logging in again

## 🛠️ Available Tools

### Content Management
- **Content Editor** - Create and edit blog posts, portfolio items, pages
- **Content Manager** - Manage all content with AI assistance
- **File Manager** - Upload and manage media files
- **Image Optimizer** - Compress and optimize images

### Development Tools  
- **Build & Deploy** - Build site and deploy to production
- **SEO Manager** - Manage meta tags, sitemap, keywords
- **Analytics Dashboard** - View traffic, engagement metrics
- **API Explorer** - Test and explore API endpoints

### System Tools
- **Backup Manager** - Create and restore backups
- **Activity Logs** - View system activity and user actions
- **Site Settings** - Configure site-wide settings
- **User Management** - Manage admin users

## 🔧 Troubleshooting

### Backend Not Running?
```bash
# Check if port 3000 is in use
netstat -an | findstr :3000

# Kill the process if needed
taskkill /F /PID <process_id>

# Restart the server
cd backend
node src/server-simple.js
```

### Still Seeing Demo Mode?
1. Clear browser cache and cookies
2. Open DevTools (F12)
3. Go to Application > Local Storage
4. Clear all entries for localhost:3000
5. Try logging in again

### API Not Responding?
1. Check server is running: http://localhost:3000/api/health
2. Check console for errors
3. Restart the server

## 📊 API Endpoints

All API endpoints are available at `http://localhost:3000/api/`

### Public Endpoints
- `GET /api/health` - Health check
- `POST /api/auth/login` - Login
- `GET /api/portfolio/projects` - Get projects
- `GET /api/blog/recent` - Get recent posts

### Protected Endpoints (require auth token)
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/admin/analytics` - Analytics data
- `POST /api/admin/backup/create` - Create backup
- `GET /api/admin/logs/activity` - Activity logs

## 💡 Tips

1. **Use System Status Page** - Always check system status first if something isn't working
2. **Keep Server Running** - The backend server must be running for the admin panel to work
3. **Use Chrome/Edge** - Best compatibility with modern browsers
4. **Check Console** - Press F12 to see any JavaScript errors

## 🎯 Next Steps

1. Login to the admin panel
2. Explore the dashboard
3. Try creating some content
4. Test the build & deploy system
5. Set up your SEO settings

---

**Need Help?** Check the system status page first: http://localhost:3000/admin/system-status.html