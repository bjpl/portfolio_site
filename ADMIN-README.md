# 🚀 Hugo Dev Portfolio Admin System

## Quick Start

1. **Start the admin system:**
   ```bash
   # Windows
   start-admin.bat
   
   # Or manually
   cd backend
   npm run dev
   ```

2. **Access the admin panel:**
   - URL: http://localhost:3000/admin/dashboard.html
   - Username: `admin`
   - Password: `admin123`

## 📊 Admin Tools Overview

### Dashboard
- **📊 Overview** - Main dashboard with statistics and quick actions
- **System Check** - http://localhost:3000/admin/system-check.html

### Content Management
- **📝 Content Manager** - Manage all site content with WYSIWYG editor
- **✏️ Content Editor** - Advanced Markdown/YAML editor with syntax highlighting
- **📄 Pages** - Static page management
- **📝 Blog Posts** - Blog article creation and editing
- **🎨 Portfolio Items** - Portfolio project management

### Media Management
- **🖼️ File Manager** - Browse, upload, and organize files
- **📦 Bulk Upload** - Upload multiple files with drag-and-drop
- **🖼️ Image Optimizer** - Resize, compress, and convert images

### Development Tools
- **✅ Review Tool** - Content review with quality checks and versioning
- **⚡ Build & Deploy** - Build Hugo site and deploy to production
- **🔌 API Explorer** - Test and explore backend APIs
- **📋 Logs** - View system logs and debug information

### Settings & Configuration
- **⚙️ Site Settings** - Global site configuration
- **👥 Users** - User management (single-user system)
- **📈 Analytics** - Site analytics and metrics
- **💾 Backup** - Backup and restore functionality

## 🔧 Features

### ✅ Fully Implemented
- JWT authentication (no demo mode)
- Toast notification system
- Real-time WebSocket updates
- File upload with drag-and-drop
- Image optimization with Sharp
- Hugo build integration
- Content CRUD operations
- SEO management tools
- Analytics dashboard
- System health monitoring

### 🎨 UI/UX Features
- Modern, responsive design
- Dark mode support
- Keyboard shortcuts
- Quick search (Ctrl/Cmd + K)
- Mobile-friendly interface
- Interactive modals
- Real-time form validation
- Progress indicators

## 📁 Project Structure

```
portfolio_site/
├── backend/
│   ├── src/
│   │   ├── server-simple.js       # Main server (port 3000)
│   │   └── routes/
│   │       ├── auth.js            # Authentication
│   │       ├── content-api.js     # Content management
│   │       ├── files-api.js       # File operations
│   │       ├── images-api.js      # Image processing
│   │       └── build-deploy-api.js # Build & deployment
│   └── package.json
├── static/admin/
│   ├── dashboard.html             # Main dashboard
│   ├── content-manager.html       # Content management
│   ├── review.html               # Review tool
│   ├── bulk-upload.html          # Bulk upload tool
│   ├── system-check.html         # System diagnostics
│   ├── js/
│   │   ├── toast.js              # Toast notifications
│   │   ├── admin-functions.js    # Core functions
│   │   └── admin-navigation.js   # Navigation system
│   └── api-client.js             # API client library
└── content/                      # Hugo content
    ├── learn/
    ├── make/
    ├── think/
    └── meet/
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token

### Content
- `GET /api/content` - List all content
- `GET /api/content/:id` - Get specific content
- `POST /api/content` - Create content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### Files
- `GET /api/files/list/*` - List files in directory
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/delete` - Delete file
- `POST /api/files/create-folder` - Create folder

### Images
- `POST /api/images/optimize` - Optimize image
- `POST /api/images/resize` - Resize image
- `POST /api/images/convert` - Convert format
- `POST /api/images/batch` - Batch process

### Build & Deploy
- `POST /api/build-deploy/build` - Start build
- `GET /api/build-deploy/status` - Build status
- `POST /api/build-deploy/deploy` - Deploy site
- `GET /api/build-deploy/logs` - Build logs

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + K` - Quick search
- `Alt + N` - Toggle navigation
- `Alt + S` - Toggle sidebar
- `Ctrl/Cmd + S` - Save (in editors)
- `F1` - Show help (in editors)
- `Escape` - Close modals/menus

## 🛠️ Development

### Requirements
- Node.js 14+
- npm or yarn
- Hugo (for site building)

### Environment Variables
Create `.env` file in backend directory:
```env
JWT_SECRET=your-secret-key
PORT=3000
NODE_ENV=development
```

### Running Tests
Use the System Check tool to verify all components:
http://localhost:3000/admin/system-check.html

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
hugo
```

### Deploy to Netlify
1. Connect GitHub repository
2. Set build command: `hugo`
3. Set publish directory: `public/`
4. Add environment variables

## 📝 Notes

- Single-user system (no real-time collaboration)
- All features fully implemented (no placeholders)
- Strategic development without over-engineering
- Toast notifications replace all alerts
- Backend runs on port 3000
- Frontend served from `/admin/`

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### Authentication Issues
1. Clear browser localStorage
2. Restart backend server
3. Check JWT token in browser DevTools

### Build Failures
1. Ensure Hugo is installed
2. Check content directory structure
3. Verify config.yaml settings

## 📚 Documentation

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [JWT Authentication](https://jwt.io/introduction)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

## 💡 Tips

1. Use System Check regularly to verify health
2. Enable auto-save in content editors
3. Use bulk upload for multiple files
4. Configure deployment targets in Build & Deploy
5. Monitor logs for debugging
6. Regular backups recommended

---

**Version:** 1.0.0  
**Last Updated:** 2025-08-16  
**Status:** ✅ Fully Implemented