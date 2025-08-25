# Portfolio Site Credentials Summary

## 🔐 Current Credentials (Development)

### Admin Panel Access
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@localhost`
- **URL**: https://vocal-pony-24e3de.netlify.app/admin

### Supabase Configuration
- **Project URL**: `https://tdmzayzkqyegvfgxlolj.supabase.co`
- **Anon Key (Public)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM`
- **Service Key (Secret)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E`

### JWT Configuration (Development)
- **JWT Secret**: `dev-jwt-secret-change-in-production`
- **JWT Refresh Secret**: `dev-refresh-secret-change-this`
- **Session Secret**: `dev-session-secret-change-this`

## 🌐 Live Site URLs
- **Main Site**: https://vocal-pony-24e3de.netlify.app
- **Admin Panel**: https://vocal-pony-24e3de.netlify.app/admin
- **API Endpoints**: https://vocal-pony-24e3de.netlify.app/api

## 📁 Credential File Locations

### Local Environment Files
- **Main .env**: `/.env` (development credentials)
- **Production Example**: `/.env.production` 
- **Unified Config**: `/config/environments/.env.unified`

### Netlify Configuration
- **Build Config**: `/netlify.toml` (public environment variables only)
- **Dashboard Variables**: Set in Netlify Dashboard → Site Settings → Environment Variables

## ⚠️ Important Security Notes

### For Production Deployment
1. **NEVER use these development credentials in production**
2. **Generate new secure secrets using**:
   ```bash
   openssl rand -hex 32
   ```

3. **Set production secrets in Netlify Dashboard**:
   - JWT_SECRET (256-bit random string)
   - JWT_REFRESH_SECRET (different 256-bit string)
   - SESSION_SECRET (another random string)
   - ADMIN_PASSWORD_HASH (bcrypt hashed password)
   - SUPABASE_SERVICE_KEY (keep secure, never expose)

### Required Netlify Environment Variables
These MUST be set in Netlify Dashboard for production:
- `JWT_SECRET`
- `JWT_REFRESH_SECRET` 
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `SUPABASE_SERVICE_KEY`

### Password Hashing
To generate a secure password hash for production:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-secure-password', 12);
console.log(hash);
```

## 🔄 Credential Rotation Schedule
- **Monthly**: Review access logs
- **Quarterly**: Rotate JWT secrets and admin passwords
- **After Team Changes**: Rotate all shared secrets
- **If Compromised**: Immediately rotate affected credentials

## 📞 Support Access
- **Supabase Dashboard**: https://supabase.com/dashboard/project/tdmzayzkqyegvfgxlolj
- **Netlify Dashboard**: https://app.netlify.com
- **GitHub Repository**: https://github.com/bjpl/portfolio_site

## 🚨 Emergency Procedures
If credentials are compromised:
1. Immediately rotate all secrets in Netlify Dashboard
2. Update Supabase service keys
3. Force logout all users
4. Review access logs for unauthorized access
5. Update this document with new credential information

---
*Last Updated: 2025-08-25*
*Document Location: `/CREDENTIALS_SUMMARY.md`*