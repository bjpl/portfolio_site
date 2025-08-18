#!/usr/bin/env node

/**
 * Production Setup Script for Portfolio Site (Demo Version)
 * Generates secure credentials with example values
 */

const bcrypt = require('../backend/node_modules/bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🚀 Portfolio Site - Production Setup (Demo)\n');

// Generate secure random strings
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64url');
}

// Generate password hash
async function generatePasswordHash(password) {
  const saltRounds = 12; // Higher security for production
  return await bcrypt.hash(password, saltRounds);
}

async function setupProduction() {
  try {
    console.log('📋 Generating secure production credentials...\n');
    
    // Generate secure secrets
    const jwtSecret = generateSecret(64);
    const refreshSecret = generateSecret(64);
    const sessionSecret = generateSecret(32);
    
    console.log('✅ Generated secure JWT and session secrets');
    
    // Example admin credentials (you should change these!)
    const adminUsername = 'admin';
    const adminEmail = 'admin@yourportfolio.com';
    const adminPassword = 'ChangeThisPassword123!'; // This will be hashed
    
    const adminPasswordHash = await generatePasswordHash(adminPassword);
    console.log('✅ Generated secure password hash');
    
    // Example domain
    const domain = 'yourportfolio.com';
    const corsOrigins = `https://${domain},https://www.${domain}`;
    
    // Create production environment file
    const envContent = `# Portfolio Site - Production Configuration
# Generated on ${new Date().toISOString()}
# IMPORTANT: Update the values below with your actual configuration!

# SECURITY - Keep these secret!
NODE_ENV=production
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${refreshSecret}
SESSION_SECRET=${sessionSecret}

# Admin Credentials - CHANGE THESE!
ADMIN_USERNAME=${adminUsername}
ADMIN_EMAIL=${adminEmail}
ADMIN_PASSWORD_HASH=${adminPasswordHash}

# Domain Configuration - UPDATE WITH YOUR DOMAIN!
CORS_ORIGIN=${corsOrigins}
CORS_CREDENTIALS=true

# Database (update as needed)
DB_TYPE=sqlite
# For PostgreSQL in production:
# DB_TYPE=postgresql
# DB_HOST=your-db-host
# DB_NAME=portfolio_prod
# DB_USER=portfolio_user
# DB_PASSWORD=secure-db-password

# Email Configuration (optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# CONTACT_EMAIL=contact@${domain}

# Monitoring (recommended)
# SENTRY_DSN=your-sentry-dsn-for-error-tracking

# Production URL
PRODUCTION_URL=https://${domain}
`;

    // Write production env file
    const prodEnvPath = path.join(process.cwd(), '.env.production');
    fs.writeFileSync(prodEnvPath, envContent);
    
    console.log('\n✅ Created .env.production file');
    
    // Show example credentials for demo
    console.log('\n📋 Demo Credentials Generated:');
    console.log(`Username: ${adminUsername}`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword} (CHANGE THIS!)`);
    console.log(`Domain: ${domain} (UPDATE THIS!)`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. ✅ Review and customize .env.production');
    console.log('2. 🔧 Update domain in netlify/functions/auth.js');
    console.log('3. 🔒 Change admin password and email');
    console.log('4. 🌐 Configure your actual domain');
    console.log('5. 📧 Set up email settings (optional)');
    console.log('6. 🚀 Deploy to your hosting platform');
    
    console.log('\n🔒 Security Checklist:');
    console.log('✓ Secure JWT secrets generated');
    console.log('✓ Password hash generated');
    console.log('✓ Production environment configured');
    console.log('❗ CHANGE default admin credentials');
    console.log('❗ UPDATE domain configuration');
    console.log('❗ Configure HTTPS on your domain');
    
    console.log('\n🚀 Production setup complete!');
    console.log('📁 Configuration saved to: .env.production');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupProduction();