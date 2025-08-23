# Security Best Practices Documentation

## Table of Contents
1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Input Validation](#input-validation)
5. [API Security](#api-security)
6. [Frontend Security](#frontend-security)
7. [Infrastructure Security](#infrastructure-security)
8. [Security Monitoring](#security-monitoring)
9. [Incident Response](#incident-response)
10. [Security Checklist](#security-checklist)

## Security Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal access rights for users and services
3. **Zero Trust**: Never trust, always verify
4. **Secure by Default**: Security enabled out of the box
5. **Fail Secure**: System fails to a secure state
6. **Separation of Duties**: Critical tasks require multiple parties

### Threat Model

```yaml
Primary Threats:
  - SQL Injection
  - Cross-Site Scripting (XSS)
  - Cross-Site Request Forgery (CSRF)
  - Authentication Bypass
  - Session Hijacking
  - Data Breaches
  - DDoS Attacks
  - Man-in-the-Middle Attacks
  - Privilege Escalation
  - Information Disclosure

Asset Protection:
  - User credentials
  - Personal information
  - Session tokens
  - API keys
  - Database content
  - Source code
  - Infrastructure access
```

## Authentication & Authorization

### Password Security

#### Password Requirements
```javascript
// Password validation rules
const passwordSchema = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true,
  maxConsecutiveChars: 3
};

// Password strength validator
function validatePassword(password, userInfo) {
  const errors = [];
  
  if (password.length < passwordSchema.minLength) {
    errors.push(`Password must be at least ${passwordSchema.minLength} characters`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special characters');
  }
  
  // Check against common passwords
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  // Check for user information
  const userInfoLower = Object.values(userInfo).map(v => v.toLowerCase());
  if (userInfoLower.some(info => password.toLowerCase().includes(info))) {
    errors.push('Password cannot contain personal information');
  }
  
  return errors;
}
```

#### Password Storage
```javascript
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Hash password with bcrypt
async function hashPassword(password) {
  const saltRounds = 12; // OWASP recommended minimum
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Additional password encryption for sensitive environments
function encryptPassword(hashedPassword, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(hashedPassword, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
```

### JWT Security

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Secure JWT configuration
const jwtConfig = {
  algorithm: 'RS256', // Use RSA instead of HMAC
  expiresIn: '15m',
  issuer: 'portfolio-api',
  audience: 'portfolio-client',
  notBefore: '0s'
};

// Generate secure JWT
function generateToken(payload) {
  // Add security claims
  const securePayload = {
    ...payload,
    jti: crypto.randomBytes(16).toString('hex'), // JWT ID for tracking
    iat: Math.floor(Date.now() / 1000),
    type: 'access'
  };
  
  return jwt.sign(
    securePayload,
    process.env.JWT_PRIVATE_KEY,
    jwtConfig
  );
}

// Verify JWT with additional checks
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
    
    // Check if token is blacklisted
    if (await isTokenBlacklisted(decoded.jti)) {
      throw new Error('Token has been revoked');
    }
    
    // Check if user still exists and is active
    const user = await getUserById(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('User account is not active');
    }
    
    return decoded;
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

// Refresh token rotation
async function rotateRefreshToken(oldRefreshToken) {
  const decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
  // Invalidate old refresh token
  await blacklistToken(decoded.jti);
  
  // Generate new token pair
  const newAccessToken = generateToken({ userId: decoded.userId });
  const newRefreshToken = generateRefreshToken({ userId: decoded.userId });
  
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

### Two-Factor Authentication (2FA)

```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate 2FA secret
function generate2FASecret(user) {
  const secret = speakeasy.generateSecret({
    name: `Portfolio (${user.email})`,
    issuer: 'Portfolio Site',
    length: 32
  });
  
  return {
    secret: secret.base32,
    qrCode: QRCode.toDataURL(secret.otpauth_url)
  };
}

// Verify 2FA token
function verify2FAToken(token, secret) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time windows for clock skew
  });
}

// Backup codes generation
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}
```

### Session Management

```javascript
// Secure session configuration
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const sessionConfig = {
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 3600 // 1 hour
  }),
  secret: process.env.SESSION_SECRET,
  name: 'sessionId', // Don't use default name
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // No JS access
    maxAge: 3600000, // 1 hour
    sameSite: 'strict' // CSRF protection
  }
};

app.use(session(sessionConfig));

// Session invalidation
function invalidateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Concurrent session prevention
async function preventConcurrentSessions(userId, sessionId) {
  const existingSession = await getActiveSession(userId);
  if (existingSession && existingSession !== sessionId) {
    await invalidateSession(existingSession);
  }
  await setActiveSession(userId, sessionId);
}
```

## Data Protection

### Encryption at Rest

```javascript
const crypto = require('crypto');

// Field-level encryption for sensitive data
class FieldEncryption {
  constructor(masterKey) {
    this.masterKey = Buffer.from(masterKey, 'hex');
  }
  
  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.masterKey,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Database encryption configuration
const encryptedFields = ['ssn', 'creditCard', 'bankAccount'];

// Mongoose encryption plugin
function encryptionPlugin(schema) {
  const encryption = new FieldEncryption(process.env.ENCRYPTION_KEY);
  
  // Encrypt before save
  schema.pre('save', function(next) {
    encryptedFields.forEach(field => {
      if (this[field] && this.isModified(field)) {
        this[field] = encryption.encrypt(this[field]);
      }
    });
    next();
  });
  
  // Decrypt after find
  schema.post('find', function(docs) {
    docs.forEach(doc => {
      encryptedFields.forEach(field => {
        if (doc[field]) {
          doc[field] = encryption.decrypt(doc[field]);
        }
      });
    });
  });
}
```

### Data Masking

```javascript
// PII data masking
function maskEmail(email) {
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return `***-***-${cleaned.slice(-4)}`;
}

function maskCreditCard(cardNumber) {
  const cleaned = cardNumber.replace(/\s/g, '');
  return `****-****-****-${cleaned.slice(-4)}`;
}

// Logging with masked data
function logSensitiveOperation(operation, data) {
  const maskedData = {
    ...data,
    email: data.email ? maskEmail(data.email) : undefined,
    phone: data.phone ? maskPhone(data.phone) : undefined,
    creditCard: data.creditCard ? maskCreditCard(data.creditCard) : undefined
  };
  
  logger.info(`Operation: ${operation}`, maskedData);
}
```

## Input Validation

### Schema Validation

```javascript
const Joi = require('joi');
const validator = require('validator');

// Comprehensive input validation schemas
const schemas = {
  user: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .max(255)
      .required()
      .custom((value, helpers) => {
        if (!validator.isEmail(value, { allow_utf8_local_part: false })) {
          return helpers.error('Invalid email format');
        }
        return value;
      }),
    
    password: Joi.string()
      .min(12)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
      }),
    
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .custom((value, helpers) => {
        if (reservedUsernames.includes(value.toLowerCase())) {
          return helpers.error('Username is reserved');
        }
        return value;
      }),
    
    age: Joi.number()
      .integer()
      .min(13)
      .max(120),
    
    website: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .custom((value, helpers) => {
        if (!validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true })) {
          return helpers.error('Invalid URL');
        }
        return value;
      })
  }),
  
  content: Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .required()
      .custom((value, helpers) => {
        // Sanitize HTML
        const clean = validator.escape(value);
        if (clean !== value) {
          return helpers.error('Title contains invalid characters');
        }
        return value;
      }),
    
    body: Joi.string()
      .min(1)
      .max(50000)
      .required(),
    
    tags: Joi.array()
      .items(Joi.string().alphanum().max(20))
      .max(10),
    
    status: Joi.string()
      .valid('draft', 'published', 'archived')
      .required()
  })
};

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schemas[schema].validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({ errors });
    }
    
    req.validatedBody = value;
    next();
  };
}
```

### SQL Injection Prevention

```javascript
// Safe database queries
const { Pool } = require('pg');
const pool = new Pool();

// Parameterized queries
async function getUserByEmail(email) {
  const query = 'SELECT * FROM users WHERE email = $1';
  const values = [email];
  
  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.error('Database query error', { error, query });
    throw new Error('Database operation failed');
  }
}

// Query builder with automatic escaping
const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

async function searchContent(searchTerm, filters) {
  let query = knex('content')
    .select('id', 'title', 'excerpt', 'published_at')
    .where('status', 'published');
  
  if (searchTerm) {
    // Safe full-text search
    query = query.whereRaw(
      'to_tsvector(\'english\', title || \' \' || content) @@ plainto_tsquery(\'english\', ?)',
      [searchTerm]
    );
  }
  
  if (filters.category) {
    query = query.where('category', filters.category);
  }
  
  if (filters.author) {
    query = query.where('author_id', filters.author);
  }
  
  return await query.limit(50);
}

// Stored procedures for complex operations
async function createUserWithProfile(userData) {
  const query = `
    CALL create_user_with_profile($1, $2, $3, $4)
  `;
  
  const values = [
    userData.email,
    userData.passwordHash,
    userData.name,
    JSON.stringify(userData.profile)
  ];
  
  return await pool.query(query, values);
}
```

### XSS Prevention

```javascript
const DOMPurify = require('isomorphic-dompurify');
const helmet = require('helmet');

// Configure CSP with Helmet
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://trusted-cdn.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
    blockAllMixedContent: []
  }
}));

// HTML sanitization
function sanitizeHtml(html, options = {}) {
  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true
  };
  
  const config = { ...defaultOptions, ...options };
  return DOMPurify.sanitize(html, config);
}

// React component for safe rendering
function SafeHtml({ content, allowedTags }) {
  const sanitized = sanitizeHtml(content, { ALLOWED_TAGS: allowedTags });
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// Template literal tag for SQL
function sql(strings, ...values) {
  let query = strings[0];
  const params = [];
  
  for (let i = 0; i < values.length; i++) {
    params.push(values[i]);
    query += `$${i + 1}${strings[i + 1]}`;
  }
  
  return { query, params };
}

// Usage
const { query, params } = sql`
  SELECT * FROM users 
  WHERE email = ${userEmail} 
  AND status = ${status}
`;
```

## API Security

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Different rate limits for different endpoints
const rateLimits = {
  // Strict limit for authentication
  auth: rateLimit({
    store: new RedisStore({
      client: redisClient
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        endpoint: req.path
      });
      res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }
  }),
  
  // Standard API limit
  api: rateLimit({
    store: new RedisStore({
      client: redisClient
    }),
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  }),
  
  // Lenient limit for public content
  public: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false
  })
};

// Apply rate limits
app.use('/api/auth', rateLimits.auth);
app.use('/api', rateLimits.api);
app.use('/', rateLimits.public);

// Dynamic rate limiting based on user tier
function dynamicRateLimit(req, res, next) {
  const userTier = req.user?.tier || 'free';
  const limits = {
    free: 100,
    premium: 1000,
    enterprise: 10000
  };
  
  const limit = limits[userTier];
  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: limit,
    keyGenerator: (req) => req.user?.id || req.ip
  });
  
  limiter(req, res, next);
}
```

### API Key Management

```javascript
const crypto = require('crypto');

// Generate secure API key
function generateApiKey() {
  const key = crypto.randomBytes(32).toString('hex');
  const prefix = 'pk_'; // Identify key type
  const checksum = crypto
    .createHash('sha256')
    .update(key)
    .digest('hex')
    .substring(0, 4);
  
  return `${prefix}${key}_${checksum}`;
}

// Validate API key format
function validateApiKeyFormat(apiKey) {
  const pattern = /^pk_[a-f0-9]{64}_[a-f0-9]{4}$/;
  if (!pattern.test(apiKey)) {
    return false;
  }
  
  const [prefix, keyAndChecksum] = apiKey.split('_');
  const [key, checksum] = [keyAndChecksum.slice(0, -5), keyAndChecksum.slice(-4)];
  
  const expectedChecksum = crypto
    .createHash('sha256')
    .update(key)
    .digest('hex')
    .substring(0, 4);
  
  return checksum === expectedChecksum;
}

// API key middleware
async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  if (!validateApiKeyFormat(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }
  
  // Hash the key before database lookup
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
  
  const keyData = await getApiKeyData(hashedKey);
  
  if (!keyData || keyData.revoked) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
    return res.status(401).json({ error: 'API key expired' });
  }
  
  // Track usage
  await incrementApiKeyUsage(hashedKey);
  
  req.apiKey = keyData;
  next();
}
```

### CORS Configuration

```javascript
const cors = require('cors');

// Secure CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://yoursite.com',
      'https://www.yoursite.com',
      'https://app.yoursite.com'
    ];
    
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Preflight handling
app.options('*', cors(corsOptions));
```

## Frontend Security

### Content Security Policy

```javascript
// Dynamic CSP based on page content
function generateCSP(req, res, next) {
  const nonce = crypto.randomBytes(16).toString('base64');
  
  res.locals.cspNonce = nonce;
  
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      `'nonce-${nonce}'`,
      'https://trusted-analytics.com'
    ],
    styleSrc: [
      "'self'",
      `'nonce-${nonce}'`,
      'https://fonts.googleapis.com'
    ],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    connectSrc: ["'self'", 'https://api.yoursite.com'],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined
  };
  
  const policy = Object.entries(directives)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const directive = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      return `${directive} ${value.join(' ')}`;
    })
    .join('; ');
  
  res.setHeader('Content-Security-Policy', policy);
  next();
}
```

### Secure Cookie Handling

```javascript
// Secure cookie configuration
const cookieConfig = {
  httpOnly: true, // Prevent XSS access
  secure: true, // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 3600000, // 1 hour
  signed: true // Prevent tampering
};

// Set secure cookie
app.get('/set-cookie', (req, res) => {
  res.cookie('sessionId', req.session.id, cookieConfig);
  res.json({ success: true });
});

// Cookie encryption for sensitive data
const cryptr = require('cryptr');
const cookieEncryption = new cryptr(process.env.COOKIE_SECRET);

function setEncryptedCookie(res, name, value, options = {}) {
  const encrypted = cookieEncryption.encrypt(JSON.stringify(value));
  res.cookie(name, encrypted, { ...cookieConfig, ...options });
}

function getEncryptedCookie(req, name) {
  const encrypted = req.cookies[name];
  if (!encrypted) return null;
  
  try {
    const decrypted = cookieEncryption.decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error('Cookie decryption failed', { name, error });
    return null;
  }
}
```

## Infrastructure Security

### Server Hardening

```bash
#!/bin/bash
# server-hardening.sh

# Update system
apt-get update && apt-get upgrade -y

# Install security tools
apt-get install -y fail2ban ufw unattended-upgrades

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Configure fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Configure automatic updates
dpkg-reconfigure -plow unattended-upgrades

# Kernel hardening
cat >> /etc/sysctl.conf << EOF
# IP Spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_max_syn_backlog = 4096
EOF

sysctl -p

# File integrity monitoring
apt-get install -y aide
aideinit
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Setup log rotation
cat > /etc/logrotate.d/portfolio << EOF
/var/log/portfolio/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload portfolio
    endscript
}
EOF
```

### Docker Security

```dockerfile
# Secure Dockerfile
FROM node:20-alpine AS builder

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Production image
FROM node:20-alpine

# Security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Remove unnecessary files
RUN rm -rf .git .env* *.md

USER nodejs

EXPOSE 3000

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1
```

## Security Monitoring

### Audit Logging

```javascript
// Comprehensive audit logging
class AuditLogger {
  constructor(database) {
    this.db = database;
  }
  
  async log(event) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: event.type,
      userId: event.userId,
      ipAddress: event.ip,
      userAgent: event.userAgent,
      resource: event.resource,
      action: event.action,
      result: event.result,
      metadata: event.metadata,
      risk_score: this.calculateRiskScore(event)
    };
    
    // Store in database
    await this.db.collection('audit_logs').insertOne(auditEntry);
    
    // Alert on high-risk events
    if (auditEntry.risk_score > 7) {
      await this.alertSecurityTeam(auditEntry);
    }
    
    return auditEntry;
  }
  
  calculateRiskScore(event) {
    let score = 0;
    
    // Failed authentication attempts
    if (event.type === 'auth_failed') score += 3;
    
    // Privilege escalation
    if (event.action === 'role_change') score += 5;
    
    // Data export
    if (event.action === 'bulk_export') score += 4;
    
    // Suspicious IP
    if (this.isSuspiciousIP(event.ip)) score += 3;
    
    // Unusual time
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) score += 2;
    
    return Math.min(score, 10);
  }
  
  async getAuditTrail(filters) {
    const query = this.buildQuery(filters);
    return await this.db.collection('audit_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(1000)
      .toArray();
  }
}

// Audit middleware
function auditMiddleware(action) {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original end function
    const originalEnd = res.end;
    
    res.end = async function(...args) {
      const event = {
        type: 'api_access',
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        resource: req.path,
        action: action || req.method,
        result: res.statusCode < 400 ? 'success' : 'failure',
        metadata: {
          method: req.method,
          statusCode: res.statusCode,
          duration: Date.now() - startTime,
          requestBody: req.body ? Object.keys(req.body) : undefined
        }
      };
      
      await auditLogger.log(event);
      originalEnd.apply(res, args);
    };
    
    next();
  };
}
```

### Intrusion Detection

```javascript
// Intrusion detection system
class IntrusionDetector {
  constructor() {
    this.patterns = {
      sqlInjection: /(\b(union|select|insert|update|delete|drop)\b.*\b(from|where|table)\b)|(--)|(;)|(\|\|)|(\*)/gi,
      xss: /(<script[\s\S]*?>[\s\S]*?<\/script>)|(<iframe[\s\S]*?>)|javascript:|on\w+\s*=/gi,
      pathTraversal: /(\.\.[\/\\])+/g,
      commandInjection: /([;&|`]|\$\(|\${)/g,
      xxe: /<!DOCTYPE[^>]*\[|<!ENTITY/gi
    };
    
    this.thresholds = {
      failedLogins: 5,
      requestRate: 100,
      errorRate: 0.1
    };
  }
  
  detectAttack(request) {
    const threats = [];
    
    // Check request patterns
    const requestString = JSON.stringify(request);
    
    for (const [attack, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(requestString)) {
        threats.push({
          type: attack,
          confidence: 'high',
          pattern: pattern.source
        });
      }
    }
    
    // Check behavior patterns
    if (this.isPortScanning(request)) {
      threats.push({
        type: 'port_scanning',
        confidence: 'medium'
      });
    }
    
    if (this.isBruteForce(request)) {
      threats.push({
        type: 'brute_force',
        confidence: 'high'
      });
    }
    
    return threats;
  }
  
  async handleThreat(threat, request) {
    // Log threat
    logger.security('Threat detected', {
      threat,
      request: {
        ip: request.ip,
        path: request.path,
        method: request.method
      }
    });
    
    // Block IP if high confidence
    if (threat.confidence === 'high') {
      await this.blockIP(request.ip);
    }
    
    // Alert security team
    await this.sendSecurityAlert(threat, request);
  }
}
```

## Incident Response

### Incident Response Plan

```javascript
// Incident response automation
class IncidentResponse {
  constructor() {
    this.severityLevels = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4
    };
  }
  
  async handleIncident(incident) {
    const severity = this.assessSeverity(incident);
    
    // Immediate containment
    if (severity <= this.severityLevels.HIGH) {
      await this.containIncident(incident);
    }
    
    // Create incident ticket
    const ticketId = await this.createIncidentTicket(incident, severity);
    
    // Notify appropriate teams
    await this.notifyTeams(incident, severity);
    
    // Start forensics collection
    await this.collectForensics(incident);
    
    // Initiate recovery if needed
    if (incident.requiresRecovery) {
      await this.initiateRecovery(incident);
    }
    
    return ticketId;
  }
  
  async containIncident(incident) {
    switch (incident.type) {
      case 'data_breach':
        // Revoke all access tokens
        await this.revokeAllTokens();
        // Force password reset
        await this.forcePasswordReset();
        break;
        
      case 'ddos_attack':
        // Enable DDoS protection
        await this.enableDDoSProtection();
        // Scale infrastructure
        await this.autoScale(10);
        break;
        
      case 'malware':
        // Isolate affected systems
        await this.isolateSystems(incident.affectedSystems);
        // Run antivirus scan
        await this.runSecurityScan();
        break;
    }
  }
  
  async collectForensics(incident) {
    const forensics = {
      timestamp: new Date().toISOString(),
      logs: await this.collectLogs(incident.timeframe),
      networkTraffic: await this.captureNetworkTraffic(),
      systemState: await this.captureSystemState(),
      memoryDump: await this.createMemoryDump()
    };
    
    // Store securely
    await this.storeForensics(forensics, incident.id);
    
    return forensics;
  }
}
```

## Security Checklist

### Development Phase
- [ ] Input validation implemented for all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding, CSP)
- [ ] CSRF tokens implemented
- [ ] Authentication system secure
- [ ] Authorization checks in place
- [ ] Sensitive data encrypted
- [ ] Security headers configured
- [ ] Error messages don't leak information
- [ ] Dependencies updated and scanned

### Deployment Phase
- [ ] SSL/TLS certificates installed
- [ ] Firewall configured
- [ ] Server hardened
- [ ] Unnecessary services disabled
- [ ] File permissions set correctly
- [ ] Database access restricted
- [ ] Backup system configured
- [ ] Monitoring enabled
- [ ] Logging configured
- [ ] Incident response plan ready

### Operational Phase
- [ ] Security patches applied regularly
- [ ] Logs reviewed daily
- [ ] Backup integrity verified
- [ ] Security scans performed weekly
- [ ] Penetration testing quarterly
- [ ] Access reviews monthly
- [ ] Incident drills conducted
- [ ] Security training provided
- [ ] Compliance audits passed
- [ ] Documentation updated

### Security Contacts
- Security Team: security@yourcompany.com
- CISO: ciso@yourcompany.com
- Incident Response: incident@yourcompany.com
- Bug Bounty: security-bounty@yourcompany.com

Remember: Security is not a one-time task but an ongoing process. Regular reviews, updates, and training are essential for maintaining a secure application.