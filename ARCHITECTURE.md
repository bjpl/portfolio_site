# Portfolio Site Architecture

## Overview
Full-stack portfolio website with Hugo static site generator and Express.js admin backend.

## Live URLs
- **Main Site**: http://localhost:1313/
- **Admin Panel**: http://localhost:3000/admin/
- **Backend API**: http://localhost:3000/api/

## Technology Stack

### Frontend (Static Site)
- **Hugo** v0.121.0 - Static site generator
- **Languages**: Multi-language support (EN/ES)
- **Content Structure**:
  ```
  /content/
  ├── learn/     (Learning resources)
  ├── make/      (Creative works)
  ├── think/     (Blog/thoughts)
  └── meet/      (About/portfolio)
  ```

### Backend (Admin System)
- **Express.js** v5 - API server
- **SQLite** - Content database
- **JWT** - Authentication
- **WebSocket** - Real-time updates
- **Sharp** - Image processing

### Admin Tools

#### Content Management
- **Content Editor**: Markdown editor with live preview, auto-save, metadata management
- **Content Manager**: CRUD operations for all content types
- **Pages/Blog/Portfolio**: Specialized content interfaces

#### Media Tools
- **File Manager**: Full file system management with drag-drop
- **Image Optimizer**: Batch processing, format conversion, compression
- **Bulk Upload**: Multiple file upload with progress tracking

#### Development Tools
- **Build & Deploy**: Hugo builds, deployment to Netlify/Vercel/GitHub Pages
- **Logs Viewer**: Real-time log monitoring and filtering
- **API Explorer**: Interactive API testing
- **Review Tool**: Content quality checks and SEO analysis

#### System Management
- **Dashboard**: Real-time stats, activity monitoring, system health
- **Analytics**: Traffic analysis, engagement metrics
- **User Management**: Role-based access control
- **Backup System**: Automated backups and restore

## Architecture Features

### API Integration
- Unified API client (`api-client.js`)
- Token-based authentication
- WebSocket for real-time updates
- RESTful endpoints for all operations

### Frontend Features
- Responsive design (mobile-first)
- Dark/light theme support
- Multi-language (i18n)
- Progressive enhancement
- Accessibility (WCAG 2.1)

### Security
- JWT authentication
- CORS configuration
- Input sanitization
- Rate limiting
- Secure file uploads

### Performance
- Static site generation
- Image optimization
- Lazy loading
- CDN-ready
- Cache strategies

## Deployment Options

### Local Development
```bash
# Start Hugo
cd portfolio_site
hugo server -D

# Start Backend
cd backend
npm run start:simple
```

### Production Deployment
- **Netlify**: Serverless functions + static hosting
- **Vercel**: Edge functions + CDN
- **GitHub Pages**: Static hosting only
- **Docker**: Full containerized deployment

## Directory Structure
```
portfolio_site/
├── content/          # Hugo content files
├── layouts/          # Hugo templates
├── static/           # Static assets
│   └── admin/        # Admin panel files
├── backend/          # Express server
│   └── src/          # Server source code
├── public/           # Generated site (git-ignored)
└── config.yaml       # Hugo configuration
```

## Admin Panel Access

### Login Credentials
- Username: `admin`
- Password: `password123`

### Tool URLs
- Dashboard: `/admin/dashboard.html`
- Content Editor: `/admin/content-editor.html`
- Image Optimizer: `/admin/image-optimizer.html`
- File Manager: `/admin/file-manager.html`
- Build & Deploy: `/admin/build-deploy.html`
- Analytics: `/admin/analytics.html`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Content
- `GET /api/content` - List all content
- `POST /api/content` - Create content
- `PUT /api/content/:path` - Update content
- `DELETE /api/content/:path` - Delete content

### Media
- `POST /api/files/upload` - Upload files
- `GET /api/files/:path` - Get file
- `DELETE /api/files/:path` - Delete file
- `POST /api/images/optimize` - Optimize images

### System
- `GET /api/dashboard/stats` - Dashboard statistics
- `POST /api/build/start` - Start build
- `GET /api/logs` - Get system logs
- `POST /api/backup/create` - Create backup

## Development Workflow

1. **Content Creation**
   - Use Content Editor for markdown files
   - Image Optimizer for media assets
   - File Manager for organization

2. **Preview & Test**
   - Hugo server provides live reload
   - Preview builds before deployment

3. **Deploy**
   - Build & Deploy tool for production
   - Multiple deployment targets
   - Automated optimization

## Maintenance

### Regular Tasks
- Check system health on dashboard
- Review analytics for insights
- Create backups before major changes
- Monitor logs for errors

### Updates
- Hugo: Check for new releases
- Dependencies: `npm update` in backend
- Content: Regular review cycles
- Security: Monitor for vulnerabilities

## Support & Documentation
- Hugo Docs: https://gohugo.io/documentation/
- Express Docs: https://expressjs.com/
- Admin Panel: Built-in help tooltips
- API Explorer: Interactive documentation