# Portfolio Site

A modern, multilingual portfolio website built with Hugo and Node.js, featuring a complete content management system.

## 🚀 Features

### Core Architecture
- **Four-Pillar Content Structure**: Learn, Make, Meet, Think sections
- **Hugo Static Site Generator**: Fast, SEO-optimized static content
- **Node.js/Express Backend**: RESTful API with WebSocket support
- **SQLite Database**: Lightweight, file-based database with Sequelize ORM (PostgreSQL ready for production)
- **Redis Caching**: Optional high-performance caching with in-memory fallback
- **Docker Containerization**: Production-ready deployment

### Security & Authentication
- **JWT Authentication**: Access & refresh token system
- **Role-Based Access Control**: Admin, Editor, Author, Viewer roles
- **Session Management**: Secure session tracking with device fingerprinting
- **Input Validation**: Express-validator with XSS protection
- **Rate Limiting**: Multi-level rate limiting (auth, API, general)
- **Security Headers**: Helmet.js, CSP, CORS configuration
- **Password Security**: Bcrypt hashing with configurable rounds

### Backend Features
- **Structured Logging**: Winston with daily rotation
- **Email Service**: Nodemailer with templates
- **File Upload**: Multer with security checks
- **WebSocket**: Real-time updates with authentication
- **Graceful Shutdown**: Proper resource cleanup
- **Health Checks**: Monitoring endpoints
- **Audit Logging**: Security event tracking

### Content Management
- **Portfolio Projects**: Featured projects with technology stacks
- **Skills & Experience**: Professional background management
- **Testimonials**: Client feedback system
- **Blog/Content**: Markdown-based content with frontmatter
- **Media Management**: Image upload and optimization
- **Contact Forms**: Spam protection with honeypot

### DevOps & Infrastructure
- **Docker Multi-Stage Build**: Optimized production images
- **Nginx Reverse Proxy**: Load balancing and caching
- **Database Migrations**: Sequelize auto-sync for SQLite
- **Backup Service**: Automated database backups
- **Environment Configuration**: Comprehensive .env management

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- SQLite 3.35+ (included with most systems)
- Redis 7+
- Docker & Docker Compose (optional)
- Hugo 0.111.3+ (for static site)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/portfolio-site.git
cd portfolio-site
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Install dependencies**
```bash
# Backend dependencies
cd backend
npm install

# Root dependencies (if any)
cd ..
npm install
```

4. **Set up the database**
```bash
# SQLite database will be created automatically when backend starts
# No manual setup required - database file is created at backend/portfolio_db.sqlite

# Optional: Redis for caching (not required for development)
docker-compose up -d redis
```

5. **Start development server**
```bash
# Backend API
cd backend
npm run dev

# Hugo development (in another terminal)
hugo server -D
```

## 🐳 Docker Deployment

### Development with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production Deployment
```bash
# Build production image
docker build -t portfolio-app .

# Run with production profile
docker-compose --profile production up -d
```

## 🏗️ Project Structure

```
portfolio-site/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration management
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Sequelize models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   └── server.js       # Main server file
│   └── package.json
├── content/                # Hugo content (markdown)
│   ├── learn/             # Learning resources
│   ├── make/              # Portfolio projects
│   ├── meet/              # About/contact
│   └── think/             # Blog/thoughts
├── static/                # Static assets
│   └── admin/            # Admin dashboard
├── nginx/                 # Nginx configuration
│   ├── nginx.conf
│   └── sites/
├── scripts/              # Database & utility scripts
│   └── init-db.sql      # Database initialization
├── docker-compose.yml    # Docker orchestration
├── Dockerfile           # Multi-stage build
└── .env.example        # Environment template
```

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env`:

```env
# Server Configuration
NODE_ENV=production
PORT=3333
HOST=localhost

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# Database
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio_db.sqlite
DB_USER=portfolio_user
DB_PASSWORD=changeme

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Portfolio <noreply@portfolio.com>"

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

## 🔐 API Documentation

### Authentication Endpoints

```http
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User login
POST   /api/auth/logout       # User logout
POST   /api/auth/refresh      # Refresh access token
POST   /api/auth/forgot       # Request password reset
POST   /api/auth/reset        # Reset password
GET    /api/auth/verify/:token # Verify email
```

### Portfolio Endpoints

```http
GET    /api/portfolio/projects          # List projects
GET    /api/portfolio/projects/featured # Featured projects
GET    /api/portfolio/projects/:slug    # Get project
POST   /api/portfolio/projects          # Create project (auth)
PUT    /api/portfolio/projects/:id      # Update project (auth)
DELETE /api/portfolio/projects/:id      # Delete project (auth)

GET    /api/portfolio/skills            # List skills
GET    /api/portfolio/experience        # List experiences
GET    /api/portfolio/testimonials      # List testimonials
POST   /api/portfolio/contact           # Submit contact form
```

### Content Management Endpoints

```http
GET    /api/content/learn              # Learning content
GET    /api/content/make               # Portfolio content
GET    /api/content/meet               # About content
GET    /api/content/think              # Blog content
GET    /api/content/search             # Search all content
GET    /api/content/tags               # Get all tags
GET    /api/content/related/:id        # Related content
```

### Admin Endpoints

```http
GET    /api/admin/dashboard/stats      # Dashboard statistics
GET    /api/admin/users                # List users (admin)
POST   /api/admin/users                # Create user (admin)
PUT    /api/admin/users/:id            # Update user (admin)
DELETE /api/admin/users/:id            # Delete user (admin)
GET    /api/admin/analytics            # View analytics (admin)
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "Auth Service"
```

## 📊 Monitoring

### Health Checks

```bash
# API health
curl http://localhost:3333/api/health

# Nginx health
curl http://localhost/health

# Database health (check if SQLite file exists)
ls -la backend/portfolio_db.sqlite
```

### Logging

Logs are stored in:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- `logs/audit.log` - Security audit logs
- `logs/access.log` - HTTP access logs

## 🚀 Deployment

### Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure production database (consider PostgreSQL for production)
- [ ] Set up SSL certificates
- [ ] Configure email service
- [ ] Set up monitoring (Sentry)
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline
- [ ] Configure CDN for static assets
- [ ] Set up rate limiting
- [ ] Review security headers

### Nginx Production Config

Uncomment HTTPS section in `nginx/sites/portfolio.conf` and add SSL certificates.

### Database Backup

Automated backups run daily via Docker Compose backup service:

```bash
# Enable backup service
docker-compose --profile backup up -d

# Manual backup
cp backend/portfolio_db.sqlite backup_$(date +%Y%m%d_%H%M%S).sqlite
```

## 🔒 Security

### Security Features
- JWT with refresh tokens
- Rate limiting per endpoint
- Input validation & sanitization
- XSS protection
- SQL injection prevention
- CSRF protection
- Secure session management
- Audit logging
- Content Security Policy
- HTTPS enforcement

### Security Best Practices
1. Regularly update dependencies
2. Use environment variables for secrets
3. Enable HTTPS in production
4. Implement IP whitelisting for admin
5. Regular security audits
6. Monitor failed login attempts
7. Implement 2FA for admin accounts

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Hugo static site generator
- Express.js framework
- SQLite database
- Redis cache
- Docker containerization
- All open source contributors

## 📧 Contact

For questions or support, please contact:
- Email: admin@portfolio.local
- GitHub Issues: [Create an issue](https://github.com/yourusername/portfolio-site/issues)

---

Built with ❤️ using modern web technologies