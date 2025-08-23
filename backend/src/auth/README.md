# Authentication & Authorization System

A comprehensive, production-ready authentication and authorization system with advanced security features.

## 🔒 Features

### Authentication Methods
- **JWT Tokens**: Secure access tokens with rotation
- **Refresh Tokens**: Automatic token rotation with family tracking
- **OAuth Integration**: GitHub and Google OAuth support
- **Email Verification**: Secure email verification workflow
- **Password Reset**: Secure password reset with time-limited tokens

### Security Features
- **Password Security**: bcrypt/Argon2 hashing with breach detection
- **Rate Limiting**: IP-based and adaptive rate limiting
- **Brute Force Protection**: Account lockout and IP blocking
- **CSRF Protection**: Cross-site request forgery protection
- **Session Security**: Secure cookie configuration
- **API Key Management**: Enterprise-grade API key system

### Authorization
- **Role-Based Access Control (RBAC)**: Admin, Editor, Author, Viewer roles
- **Permission-Based Authorization**: Granular permission checks
- **Resource Ownership**: Owner-based access control
- **API Key Permissions**: Scoped API key permissions

## 📁 Directory Structure

```
auth/
├── controllers/        # Request handlers
│   ├── AuthController.js
│   └── ApiKeyController.js
├── middleware/         # Authentication & authorization middleware
│   ├── AuthMiddleware.js
│   ├── RateLimitMiddleware.js
│   └── SessionMiddleware.js
├── models/            # Database models
│   ├── ApiKey.js
│   ├── AuthAttempt.js
│   ├── OAuthProvider.js
│   └── RefreshToken.js
├── services/          # Business logic services
│   ├── TokenService.js
│   ├── OAuthService.js
│   ├── PasswordService.js
│   ├── EmailService.js
│   └── ApiKeyService.js
├── routes/            # Route definitions
│   └── authRoutes.js
├── tests/             # Test suites
│   ├── auth.test.js
│   ├── apikey.test.js
│   └── security.test.js
├── utils/             # Utilities
│   └── SecurityAudit.js
└── README.md
```

## 🚀 Quick Start

### 1. Environment Configuration

Create a `.env` file with required variables:

```bash
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-different-from-jwt
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Session Configuration
SESSION_SECRET=your-session-secret-at-least-32-chars
SESSION_STORE=redis  # or mongodb, memory

# Password Security
USE_ARGON2=true  # Use Argon2 instead of bcrypt
PASSWORD_PEPPER=your-password-pepper-for-extra-security

# Email Service
EMAIL_PROVIDER=smtp  # or sendgrid, mailgun, ses
EMAIL_FROM=noreply@yourapp.com
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# OAuth Providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Rate Limiting
REDIS_URL=redis://localhost:6379  # For rate limiting store
RATE_LIMIT_STORE=redis

# Security
FORCE_HTTPS=true
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
```

### 2. Database Setup

Run migrations to create required tables:

```bash
npx sequelize-cli db:migrate
```

### 3. Integration

```javascript
const express = require('express');
const authRoutes = require('./auth/routes/authRoutes');
const AuthMiddleware = require('./auth/middleware/AuthMiddleware');
const RateLimitMiddleware = require('./auth/middleware/RateLimitMiddleware');
const SessionMiddleware = require('./auth/middleware/SessionMiddleware');

const app = express();

// Apply session middleware
app.use(...SessionMiddleware.fullSecurityStack());

// Apply rate limiting
app.use(RateLimitMiddleware.general());

// Auth routes
app.use('/auth', authRoutes);

// Protected routes example
app.get('/protected', 
  AuthMiddleware.authenticate(),
  (req, res) => {
    res.json({ message: 'Access granted!', user: req.user });
  }
);

// Admin only routes
app.get('/admin', 
  AuthMiddleware.adminOnly(),
  (req, res) => {
    res.json({ message: 'Admin access granted!' });
  }
);
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json
Cookie: refreshToken=your-refresh-token

# Or in body:
{
  "refreshToken": "your-refresh-token"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer your-access-token
```

#### Logout All Sessions
```http
POST /auth/logout-all
Authorization: Bearer your-access-token
```

### Email Verification

#### Verify Email
```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification-token"
}
```

#### Resend Verification
```http
POST /auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Password Management

#### Request Password Reset
```http
POST /auth/request-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "password": "NewSecurePassword123!"
}
```

#### Change Password (Authenticated)
```http
POST /auth/change-password
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

### OAuth

#### Get OAuth Authorization URL
```http
GET /auth/oauth/github/url?redirectUri=https://yourapp.com/callback
```

#### Handle OAuth Callback
```http
POST /auth/oauth/github/callback
Content-Type: application/json

{
  "code": "oauth-authorization-code",
  "redirectUri": "https://yourapp.com/callback",
  "state": "oauth-state-parameter"
}
```

### API Key Management

#### Create API Key
```http
POST /auth/api-keys
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "name": "My API Key",
  "permissions": {
    "read": true,
    "write": true,
    "admin": false
  },
  "allowedIPs": ["192.168.1.1", "10.0.0.0/8"],
  "rateLimit": 1000,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

#### List API Keys
```http
GET /auth/api-keys?includeInactive=false
Authorization: Bearer your-access-token
```

#### Update API Key
```http
PATCH /auth/api-keys/{keyId}
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "name": "Updated API Key Name",
  "rateLimit": 2000
}
```

#### Revoke API Key
```http
DELETE /auth/api-keys/{keyId}
Authorization: Bearer your-access-token
```

#### Get Usage Statistics
```http
GET /auth/api-keys/{keyId}/usage?timeframe=24h
Authorization: Bearer your-access-token
```

## 🔐 Middleware Usage

### Authentication Middleware

```javascript
const AuthMiddleware = require('./auth/middleware/AuthMiddleware');

// Basic authentication (required)
app.get('/protected', AuthMiddleware.authenticate(), handler);

// Optional authentication
app.get('/optional', AuthMiddleware.optionalAuth(), handler);

// Role-based access
app.get('/admin', AuthMiddleware.adminOnly(), handler);
app.get('/editor', AuthMiddleware.editorOrHigher(), handler);

// Permission-based access
app.get('/write', AuthMiddleware.requirePermissions(['write']), handler);

// API key authentication
app.get('/api/data', AuthMiddleware.authenticateApiKey(['read']), handler);
```

### Rate Limiting

```javascript
const RateLimitMiddleware = require('./auth/middleware/RateLimitMiddleware');

// General rate limiting
app.use(RateLimitMiddleware.general());

// Auth endpoint protection
app.use('/auth', RateLimitMiddleware.auth());

// API key rate limiting
app.use('/api', RateLimitMiddleware.apiKey());

// Adaptive rate limiting
app.use(RateLimitMiddleware.adaptiveRateLimit());
```

## 🛡️ Security Features

### Password Security

- **Strength Validation**: Uses zxcvbn for password strength analysis
- **Breach Detection**: Checks against haveibeenpwned database
- **Secure Hashing**: bcrypt or Argon2 with configurable parameters
- **Password History**: Prevents password reuse
- **Timing Attack Prevention**: Constant-time operations

### Token Security

- **JWT Security**: Signed tokens with configurable expiration
- **Refresh Token Rotation**: Automatic token rotation
- **Token Families**: Tracks token generations for security
- **Token Blacklisting**: Support for token revocation
- **Secure Storage**: HttpOnly cookies for refresh tokens

### Rate Limiting

- **IP-based Limiting**: Per-IP request limits
- **Adaptive Limiting**: Dynamic limits based on behavior
- **Multiple Stores**: Memory, Redis, or MongoDB storage
- **Whitelist Support**: IP whitelisting for trusted sources
- **Detailed Logging**: Complete audit trail

### Brute Force Protection

- **Account Lockout**: Temporary account lockout after failed attempts
- **IP Blocking**: Automatic IP blocking for suspicious activity
- **Progressive Delays**: Increasing delays for repeated failures
- **Notification System**: Email alerts for security events

## 📊 Security Audit

Run comprehensive security audits:

```javascript
const SecurityAudit = require('./auth/utils/SecurityAudit');

// Full security audit
const report = await SecurityAudit.runAudit();
console.log(report);

// Quick security check
const quickCheck = await SecurityAudit.quickCheck();
console.log(quickCheck);
```

Audit checks include:
- User account security
- Password policy compliance
- Token management
- API key security
- Authentication attempts analysis
- OAuth provider security
- System configuration review

## 🧪 Testing

Run the test suite:

```bash
# Run all auth tests
npm test auth

# Run specific test files
npm test auth/tests/auth.test.js
npm test auth/tests/security.test.js
npm test auth/tests/apikey.test.js

# Run with coverage
npm run test:coverage
```

Test coverage includes:
- Authentication flows
- Authorization checks
- Security features
- API key management
- Rate limiting
- Error handling

## 🔧 Configuration Options

### JWT Configuration

```javascript
// config/auth.js
module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'your-app',
    audience: 'your-app-users'
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '30d',
    rotationEnabled: true
  }
};
```

### Rate Limiting Configuration

```javascript
// Configurable rate limits
const rateLimits = {
  general: { windowMs: 15 * 60 * 1000, max: 1000 },
  auth: { windowMs: 15 * 60 * 1000, max: 5 },
  passwordReset: { windowMs: 60 * 60 * 1000, max: 3 },
  register: { windowMs: 60 * 60 * 1000, max: 5 }
};
```

### Email Templates

Customize email templates:

```javascript
// Override email service templates
EmailService.getWelcomeTemplate = (user) => {
  return customWelcomeTemplate(user);
};
```

## 📈 Monitoring & Logging

### Metrics Tracked

- Authentication success/failure rates
- API key usage statistics
- Rate limiting violations
- Security events and alerts
- Token rotation frequency
- Password strength distribution

### Logging

All security events are logged with:
- Timestamp
- User ID (if available)
- IP address
- User agent
- Event type
- Success/failure status
- Additional metadata

## 🚀 Production Deployment

### Environment Checklist

- [ ] Strong JWT secrets (32+ characters)
- [ ] HTTPS enforced
- [ ] Secure session configuration
- [ ] Redis/MongoDB for rate limiting
- [ ] Email service configured
- [ ] OAuth providers configured
- [ ] CORS origins specified
- [ ] Database connection secured
- [ ] Monitoring and logging enabled

### Security Hardening

1. **Use strong secrets**: Generate cryptographically secure secrets
2. **Enable HTTPS**: Force HTTPS in production
3. **Configure CORS**: Restrict origins to trusted domains
4. **Set up monitoring**: Monitor for security events
5. **Regular audits**: Run security audits regularly
6. **Update dependencies**: Keep dependencies updated
7. **Backup strategies**: Implement secure backup procedures

## 🤝 Contributing

1. Follow security best practices
2. Add tests for new features
3. Update documentation
4. Run security audit before submitting
5. Follow coding standards

## 📄 License

This authentication system is part of the portfolio project and follows the main project's license.

## 🆘 Support

For security issues, please follow responsible disclosure:
1. Do not report security vulnerabilities in public issues
2. Email security concerns privately
3. Allow time for fixes before public disclosure

---

**Note**: This authentication system is designed for production use but should be reviewed and configured according to your specific security requirements.