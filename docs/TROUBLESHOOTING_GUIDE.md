# Troubleshooting Documentation

## Table of Contents
1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Frontend Issues](#frontend-issues)
4. [Backend Issues](#backend-issues)
5. [Database Issues](#database-issues)
6. [Performance Issues](#performance-issues)
7. [Security Issues](#security-issues)
8. [Deployment Issues](#deployment-issues)
9. [Debug Tools](#debug-tools)
10. [Error Codes Reference](#error-codes-reference)

## Quick Diagnostics

### System Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "=== Portfolio Site Health Check ==="
echo "Time: $(date)"
echo ""

# Check services
echo "1. Checking Services Status..."
systemctl is-active nginx && echo "✓ Nginx: Running" || echo "✗ Nginx: Not running"
pm2 status | grep -q "online" && echo "✓ Node.js: Running" || echo "✗ Node.js: Not running"
systemctl is-active postgresql && echo "✓ PostgreSQL: Running" || echo "✗ PostgreSQL: Not running"
systemctl is-active redis && echo "✓ Redis: Running" || echo "✗ Redis: Not running"

# Check disk space
echo ""
echo "2. Disk Usage:"
df -h | grep -E "^/dev/"

# Check memory
echo ""
echo "3. Memory Usage:"
free -h

# Check connectivity
echo ""
echo "4. Testing Connectivity:"
curl -s -o /dev/null -w "API Response: %{http_code}\n" http://localhost:3000/health
curl -s -o /dev/null -w "Frontend Response: %{http_code}\n" http://localhost

# Check logs for errors
echo ""
echo "5. Recent Errors (last 10):"
tail -n 10 /var/log/portfolio/error.log 2>/dev/null || echo "No error log found"

echo ""
echo "=== Health Check Complete ==="
```

### Quick Fix Commands

```bash
# Restart all services
sudo systemctl restart nginx postgresql redis
pm2 restart all

# Clear all caches
redis-cli FLUSHALL
rm -rf /var/cache/nginx/*
rm -rf /var/www/portfolio/cache/*

# Fix permissions
sudo chown -R www-data:www-data /var/www/portfolio
sudo chmod -R 755 /var/www/portfolio

# Check and fix database
psql -U postgres -c "REINDEX DATABASE portfolio_prod;"
psql -U postgres -c "VACUUM ANALYZE;"
```

## Common Issues

### Issue: Site Not Loading

#### Symptoms
- Browser shows "Site can't be reached"
- Timeout errors
- Blank page

#### Diagnosis
```bash
# Check if services are running
systemctl status nginx
pm2 status
curl http://localhost:3000/health

# Check DNS
nslookup yoursite.com
dig yoursite.com

# Check firewall
sudo ufw status
sudo iptables -L
```

#### Solutions
1. **Service not running**:
   ```bash
   sudo systemctl start nginx
   pm2 start ecosystem.config.js
   ```

2. **Port blocked**:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **DNS issues**:
   - Verify DNS records in your domain provider
   - Clear DNS cache: `sudo systemd-resolve --flush-caches`

### Issue: 500 Internal Server Error

#### Symptoms
- Generic error page
- API returns 500 status
- Application crashes

#### Diagnosis
```bash
# Check application logs
pm2 logs
tail -f /var/log/portfolio/error.log

# Check Node.js errors
journalctl -u portfolio -n 50

# Test database connection
psql -U portfolio_user -d portfolio_prod -c "SELECT 1;"
```

#### Solutions
1. **Database connection issue**:
   ```javascript
   // Check database config
   console.log(process.env.DB_HOST, process.env.DB_PORT);
   
   // Test connection
   const { Pool } = require('pg');
   const pool = new Pool({
     host: process.env.DB_HOST,
     port: process.env.DB_PORT,
     database: process.env.DB_NAME,
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD
   });
   
   pool.query('SELECT NOW()', (err, res) => {
     if (err) console.error('Database error:', err);
     else console.log('Database connected:', res.rows[0]);
   });
   ```

2. **Missing environment variables**:
   ```bash
   # Check if .env file exists
   ls -la .env
   
   # Verify variables are loaded
   node -e "console.log(process.env.NODE_ENV)"
   ```

3. **Syntax errors**:
   ```bash
   # Check for syntax errors
   node -c backend/server.js
   npm run lint
   ```

### Issue: Authentication Not Working

#### Symptoms
- Cannot log in
- Token expired errors
- Unauthorized access

#### Diagnosis
```bash
# Check JWT secret
echo $JWT_SECRET

# Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check Redis (session store)
redis-cli ping
```

#### Solutions
1. **JWT configuration**:
   ```javascript
   // Verify JWT setup
   const jwt = require('jsonwebtoken');
   
   // Test token generation
   const token = jwt.sign(
     { userId: 1, email: 'test@example.com' },
     process.env.JWT_SECRET,
     { expiresIn: '15m' }
   );
   console.log('Token:', token);
   
   // Test token verification
   try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET);
     console.log('Decoded:', decoded);
   } catch (error) {
     console.error('JWT Error:', error);
   }
   ```

2. **Session issues**:
   ```bash
   # Clear Redis sessions
   redis-cli
   > KEYS sess:*
   > FLUSHDB
   ```

3. **Password hashing**:
   ```javascript
   // Test bcrypt
   const bcrypt = require('bcrypt');
   const password = 'testpassword';
   const hash = await bcrypt.hash(password, 10);
   const isValid = await bcrypt.compare(password, hash);
   console.log('Password valid:', isValid);
   ```

## Frontend Issues

### Issue: JavaScript Not Loading

#### Symptoms
- Interactive features not working
- Console errors
- Broken functionality

#### Diagnosis
```javascript
// Browser console
console.log('Checking for errors...');
window.addEventListener('error', (e) => {
  console.error('Global error:', e);
});

// Check if scripts loaded
document.querySelectorAll('script').forEach(script => {
  console.log('Script:', script.src, 'Loaded:', !script.error);
});
```

#### Solutions
1. **Script loading order**:
   ```html
   <!-- Correct order -->
   <script src="/js/vendor.js"></script>
   <script src="/js/main.js"></script>
   <script src="/js/app.js"></script>
   ```

2. **CORS issues**:
   ```javascript
   // Add CORS headers in Express
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
     next();
   });
   ```

3. **Module errors**:
   ```javascript
   // Check for missing dependencies
   try {
     require('missing-module');
   } catch (error) {
     console.error('Module not found:', error.message);
     // Install missing module
     // npm install missing-module
   }
   ```

### Issue: CSS Not Applying

#### Symptoms
- Unstyled content
- Broken layout
- Missing styles

#### Diagnosis
```bash
# Check if CSS files exist
ls -la public/css/

# Check nginx mime types
grep css /etc/nginx/mime.types

# Check browser network tab for 404s
curl -I https://yoursite.com/css/main.css
```

#### Solutions
1. **Build CSS**:
   ```bash
   npm run css:build
   hugo --minify
   ```

2. **Fix paths**:
   ```html
   <!-- Use absolute paths -->
   <link rel="stylesheet" href="/css/main.css">
   <!-- Not relative paths -->
   <link rel="stylesheet" href="css/main.css">
   ```

3. **Clear cache**:
   ```bash
   # Clear build cache
   rm -rf public/css/*
   npm run build
   
   # Clear browser cache
   # Ctrl+Shift+R or Cmd+Shift+R
   ```

### Issue: Images Not Displaying

#### Symptoms
- Broken image icons
- 404 errors for images
- Slow loading images

#### Diagnosis
```bash
# Check image directory
ls -la public/images/
ls -la uploads/

# Check permissions
stat public/images/

# Test image URL
curl -I https://yoursite.com/images/test.jpg
```

#### Solutions
1. **Fix permissions**:
   ```bash
   sudo chmod -R 755 public/images
   sudo chmod -R 755 uploads
   sudo chown -R www-data:www-data uploads
   ```

2. **Process images**:
   ```javascript
   // Optimize images
   const sharp = require('sharp');
   
   sharp('input.jpg')
     .resize(1920, 1080, { fit: 'inside' })
     .jpeg({ quality: 80 })
     .toFile('output.jpg');
   ```

3. **Configure nginx**:
   ```nginx
   location ~* \.(jpg|jpeg|png|gif|ico|webp)$ {
     expires 30d;
     add_header Cache-Control "public, immutable";
     try_files $uri $uri/ =404;
   }
   ```

## Backend Issues

### Issue: API Endpoints Not Responding

#### Symptoms
- 404 errors on API calls
- No response from server
- Timeout errors

#### Diagnosis
```bash
# Test API endpoint
curl -X GET http://localhost:3000/api/health

# Check routing
grep -r "router.get" backend/src/routes/

# Check middleware order
grep -r "app.use" backend/server.js
```

#### Solutions
1. **Route configuration**:
   ```javascript
   // Ensure routes are registered
   const apiRoutes = require('./routes/api');
   app.use('/api', apiRoutes);
   
   // Debug routes
   app._router.stack.forEach(function(r){
     if (r.route && r.route.path){
       console.log(r.route.path)
     }
   });
   ```

2. **Middleware order**:
   ```javascript
   // Correct order
   app.use(express.json());
   app.use(express.urlencoded({ extended: true }));
   app.use(cors());
   app.use('/api', apiRoutes); // Routes after body parsing
   app.use(errorHandler); // Error handler last
   ```

3. **Port conflicts**:
   ```bash
   # Check what's using port 3000
   sudo lsof -i :3000
   
   # Kill process using port
   sudo kill -9 $(sudo lsof -t -i:3000)
   ```

### Issue: Memory Leaks

#### Symptoms
- Increasing memory usage
- Application crashes
- Out of memory errors

#### Diagnosis
```javascript
// Monitor memory usage
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory Usage:');
  for (let key in used) {
    console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
}, 5000);

// Use heapdump
const heapdump = require('heapdump');
heapdump.writeSnapshot('./heap-' + Date.now() + '.heapsnapshot');
```

#### Solutions
1. **Fix event listener leaks**:
   ```javascript
   // Remove listeners
   const handler = (data) => console.log(data);
   emitter.on('event', handler);
   // Later...
   emitter.removeListener('event', handler);
   
   // Or use once
   emitter.once('event', handler);
   ```

2. **Close connections**:
   ```javascript
   // Close database connections
   pool.end(() => {
     console.log('Pool closed');
   });
   
   // Close Redis connections
   redis.quit();
   ```

3. **Limit array sizes**:
   ```javascript
   // Prevent unbounded growth
   const cache = [];
   const MAX_CACHE_SIZE = 1000;
   
   function addToCache(item) {
     cache.push(item);
     if (cache.length > MAX_CACHE_SIZE) {
       cache.shift(); // Remove oldest
     }
   }
   ```

## Database Issues

### Issue: Slow Queries

#### Symptoms
- Page load delays
- API timeouts
- High CPU usage

#### Diagnosis
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;
```

#### Solutions
1. **Add indexes**:
   ```sql
   -- Create index for frequently queried columns
   CREATE INDEX idx_content_status ON content(status);
   CREATE INDEX idx_content_published_at ON content(published_at DESC);
   CREATE INDEX idx_users_email ON users(email);
   
   -- Composite index for complex queries
   CREATE INDEX idx_content_status_published 
   ON content(status, published_at DESC);
   ```

2. **Optimize queries**:
   ```sql
   -- Use EXPLAIN ANALYZE
   EXPLAIN ANALYZE
   SELECT * FROM content 
   WHERE status = 'published' 
   ORDER BY published_at DESC 
   LIMIT 10;
   
   -- Rewrite subqueries as joins
   -- Bad
   SELECT * FROM content 
   WHERE author_id IN (SELECT id FROM users WHERE role = 'author');
   
   -- Good
   SELECT c.* FROM content c
   JOIN users u ON c.author_id = u.id
   WHERE u.role = 'author';
   ```

3. **Vacuum and analyze**:
   ```bash
   # Manual vacuum
   psql -U postgres -d portfolio_prod -c "VACUUM ANALYZE;"
   
   # Configure auto-vacuum
   ALTER SYSTEM SET autovacuum = on;
   ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
   ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;
   ```

### Issue: Connection Pool Exhausted

#### Symptoms
- "Too many connections" error
- Application hangs
- Database refuses connections

#### Diagnosis
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- See connection details
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  state_change
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY state_change;

-- Check max connections
SHOW max_connections;
```

#### Solutions
1. **Increase connection limit**:
   ```sql
   -- In postgresql.conf
   ALTER SYSTEM SET max_connections = 200;
   SELECT pg_reload_conf();
   ```

2. **Fix connection leaks**:
   ```javascript
   // Use connection pool properly
   const pool = new Pool({
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   
   // Always release connections
   const client = await pool.connect();
   try {
     const res = await client.query('SELECT * FROM users');
     return res.rows;
   } finally {
     client.release();
   }
   ```

3. **Kill idle connections**:
   ```sql
   -- Terminate idle connections older than 1 hour
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
     AND state_change < NOW() - INTERVAL '1 hour';
   ```

## Performance Issues

### Issue: Slow Page Load

#### Symptoms
- Long time to first byte (TTFB)
- Slow rendering
- Poor Lighthouse scores

#### Diagnosis
```bash
# Measure TTFB
curl -w "@curl-format.txt" -o /dev/null -s https://yoursite.com

# Run Lighthouse
lighthouse https://yoursite.com --output json --output-path ./lighthouse.json

# Check resource timing in browser
performance.getEntriesByType('resource').forEach(resource => {
  console.log(resource.name, resource.duration);
});
```

#### Solutions
1. **Enable compression**:
   ```nginx
   # nginx.conf
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript 
              application/javascript application/json application/xml+rss;
   ```

2. **Optimize images**:
   ```bash
   # Convert to WebP
   for img in *.jpg; do
     cwebp -q 80 "$img" -o "${img%.jpg}.webp"
   done
   
   # Generate responsive images
   sharp input.jpg --resize 1920 --output large.jpg
   sharp input.jpg --resize 1280 --output medium.jpg
   sharp input.jpg --resize 640 --output small.jpg
   ```

3. **Implement caching**:
   ```javascript
   // Cache API responses
   const cache = new Map();
   
   function getCached(key, getter, ttl = 60000) {
     const cached = cache.get(key);
     if (cached && cached.expires > Date.now()) {
       return cached.data;
     }
     
     const data = getter();
     cache.set(key, {
       data,
       expires: Date.now() + ttl
     });
     return data;
   }
   ```

### Issue: High Server Load

#### Symptoms
- High CPU usage
- Slow response times
- Server unresponsive

#### Diagnosis
```bash
# Check CPU usage
top -b -n 1 | head -20

# Check load average
uptime

# Find CPU-intensive processes
ps aux --sort=-%cpu | head

# Check I/O wait
iostat -x 1 5
```

#### Solutions
1. **Optimize Node.js**:
   ```javascript
   // Use clustering
   const cluster = require('cluster');
   const numCPUs = require('os').cpus().length;
   
   if (cluster.isMaster) {
     for (let i = 0; i < numCPUs; i++) {
       cluster.fork();
     }
   } else {
     require('./server.js');
   }
   ```

2. **Implement rate limiting**:
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests
     message: 'Too many requests'
   });
   
   app.use('/api/', limiter);
   ```

3. **Use CDN for static assets**:
   ```html
   <!-- Use CDN for libraries -->
   <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js"></script>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css">
   ```

## Security Issues

### Issue: SQL Injection Vulnerabilities

#### Symptoms
- Unexpected database errors
- Data breaches
- Suspicious queries in logs

#### Diagnosis
```javascript
// Check for vulnerable queries
grep -r "query(" backend/ | grep -v "?" 

// Test for SQL injection
curl -X POST http://localhost:3000/api/search \
  -d "q='; DROP TABLE users; --"
```

#### Solutions
1. **Use parameterized queries**:
   ```javascript
   // Bad - vulnerable to SQL injection
   const query = `SELECT * FROM users WHERE email = '${email}'`;
   
   // Good - parameterized query
   const query = 'SELECT * FROM users WHERE email = $1';
   const values = [email];
   const result = await pool.query(query, values);
   ```

2. **Input validation**:
   ```javascript
   const Joi = require('joi');
   
   const schema = Joi.object({
     email: Joi.string().email().required(),
     password: Joi.string().min(8).required()
   });
   
   const { error, value } = schema.validate(req.body);
   if (error) {
     return res.status(400).json({ error: error.details[0].message });
   }
   ```

3. **Use ORM/Query builder**:
   ```javascript
   // Using Knex.js
   const users = await knex('users')
     .where('email', email)
     .select('*');
   ```

### Issue: XSS Attacks

#### Symptoms
- Unexpected JavaScript execution
- Stolen cookies
- Defaced pages

#### Diagnosis
```javascript
// Check for unescaped output
grep -r "innerHTML" public/js/
grep -r "document.write" public/js/

// Test XSS vectors
const testVectors = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")'
];
```

#### Solutions
1. **Sanitize output**:
   ```javascript
   // Use DOMPurify
   const clean = DOMPurify.sanitize(dirty);
   element.innerHTML = clean;
   
   // Escape HTML
   function escapeHtml(text) {
     const map = {
       '&': '&amp;',
       '<': '&lt;',
       '>': '&gt;',
       '"': '&quot;',
       "'": '&#039;'
     };
     return text.replace(/[&<>"']/g, m => map[m]);
   }
   ```

2. **Content Security Policy**:
   ```javascript
   // Set CSP headers
   app.use((req, res, next) => {
     res.setHeader(
       'Content-Security-Policy',
       "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
     );
     next();
   });
   ```

## Deployment Issues

### Issue: Deployment Fails

#### Symptoms
- CI/CD pipeline fails
- Deploy script errors
- Application doesn't start

#### Diagnosis
```bash
# Check deployment logs
cat ~/.pm2/logs/portfolio-error.log

# Check git status
git status
git log --oneline -5

# Check build output
npm run build > build.log 2>&1
cat build.log
```

#### Solutions
1. **Fix build errors**:
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   
   # Clear build cache
   rm -rf .cache dist public
   npm run build
   ```

2. **Environment issues**:
   ```bash
   # Verify Node version
   node --version
   
   # Use correct version
   nvm use 20
   
   # Check environment
   echo $NODE_ENV
   ```

3. **Rollback deployment**:
   ```bash
   # Revert to previous version
   git revert HEAD
   git push origin main
   
   # Or use PM2 versioning
   pm2 deploy production revert 1
   ```

## Debug Tools

### Browser DevTools

```javascript
// Performance profiling
console.time('operation');
// ... code to measure ...
console.timeEnd('operation');

// Memory profiling
console.memory;

// Network monitoring
performance.getEntriesByType('resource').forEach(entry => {
  console.log(entry.name, entry.duration);
});

// Debug breakpoints
debugger; // Pauses execution
```

### Node.js Debugging

```bash
# Start with inspector
node --inspect backend/server.js

# Debug with Chrome DevTools
# Open chrome://inspect

# Use Node.js debugger
node inspect backend/server.js
```

### Database Debugging

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();

-- Check query plan
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM content;

-- Monitor active queries
SELECT pid, age(clock_timestamp(), query_start), usename, query 
FROM pg_stat_activity 
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%' 
ORDER BY query_start desc;
```

### Network Debugging

```bash
# Monitor HTTP traffic
tcpdump -i any -n port 80

# Test with curl
curl -v https://yoursite.com

# Check DNS
dig yoursite.com
nslookup yoursite.com

# Trace route
traceroute yoursite.com
```

## Error Codes Reference

### Application Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| E001 | Database connection failed | Check DB credentials and connectivity |
| E002 | Authentication failed | Verify JWT secret and token |
| E003 | Permission denied | Check user roles and permissions |
| E004 | Resource not found | Verify resource exists and path is correct |
| E005 | Validation error | Check input against schema |
| E006 | Rate limit exceeded | Wait or increase limits |
| E007 | File upload failed | Check file size and permissions |
| E008 | Email send failed | Verify SMTP configuration |
| E009 | Cache error | Check Redis connection |
| E010 | External API error | Check API keys and endpoints |

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid input, malformed JSON |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | Wrong HTTP method |
| 409 | Conflict | Duplicate resource |
| 413 | Payload Too Large | File or request too big |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Application error |
| 502 | Bad Gateway | Backend server down |
| 503 | Service Unavailable | Server overload or maintenance |
| 504 | Gateway Timeout | Backend timeout |

### Database Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 23505 | Unique violation | Check for duplicates |
| 23503 | Foreign key violation | Verify referenced record exists |
| 23502 | Not null violation | Provide required field |
| 42P01 | Undefined table | Run migrations |
| 42703 | Undefined column | Check column name |
| 53300 | Too many connections | Increase connection limit |
| 57014 | Query timeout | Optimize query or increase timeout |
| 58030 | IO error | Check disk space |

## Recovery Procedures

### Emergency Response

```bash
#!/bin/bash
# emergency-recovery.sh

echo "Starting emergency recovery..."

# 1. Stop all services
pm2 stop all
sudo systemctl stop nginx

# 2. Clear all caches
redis-cli FLUSHALL
rm -rf /var/cache/*

# 3. Restore from backup
pg_restore -U postgres -d portfolio_prod backup.sql

# 4. Reset application
cd /var/www/portfolio
git fetch origin
git reset --hard origin/main
npm ci --only=production

# 5. Restart services
pm2 start ecosystem.config.js
sudo systemctl start nginx

echo "Recovery complete"
```

### Rollback Procedure

```bash
# Get current version
git describe --tags

# List recent deployments
pm2 deploy production list

# Rollback to previous version
pm2 deploy production revert 1

# Or manual rollback
git checkout v1.2.3
npm ci --only=production
npm run build
pm2 restart all
```

## Support Escalation

### Level 1: Self-Service
- Check this troubleshooting guide
- Review logs
- Try quick fixes

### Level 2: Team Support
- Contact team lead
- Share error logs
- Provide reproduction steps

### Level 3: External Support
- Contact vendor support
- Create GitHub issue
- Engage consultants

### Emergency Contacts
- On-call Engineer: +1-XXX-XXX-XXXX
- Database Admin: +1-XXX-XXX-XXXX
- Security Team: security@yourcompany.com
- Infrastructure: infra@yourcompany.com