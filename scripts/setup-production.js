#!/usr/bin/env node

/**
 * Production Setup Script for Portfolio Site
 * Generates secure credentials and validates configuration
 */

const bcrypt = require('../backend/node_modules/bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🚀 Portfolio Site - Production Setup\n');

// Generate secure random strings
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64url');
}

// Generate password hash
async function generatePasswordHash(password) {
  const saltRounds = 12; // Higher security for production
  return await bcrypt.hash(password, saltRounds);
}

// Prompt for user input (simplified version)
function prompt(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function setupProduction() {
  try {
    console.log('📋 This script will help you set up secure production credentials.\n');
    
    // Generate secure secrets
    const jwtSecret = generateSecret(64);
    const refreshSecret = generateSecret(64);
    const sessionSecret = generateSecret(32);
    
    console.log('✅ Generated secure JWT and session secrets');
    
    // Get admin credentials
    console.log('\n👤 Admin User Setup');
    const adminUsername = await prompt('Admin username (default: admin): ') || 'admin';
    const adminEmail = await prompt('Admin email: ');
    
    let adminPassword;
    let confirmPassword;
    
    do {
      adminPassword = await prompt('Admin password (min 12 characters): ');
      if (adminPassword.length < 12) {
        console.log('❌ Password must be at least 12 characters');
        continue;
      }
      confirmPassword = await prompt('Confirm password: ');
      if (adminPassword !== confirmPassword) {
        console.log('❌ Passwords do not match');
      }
    } while (adminPassword !== confirmPassword || adminPassword.length < 12);
    
    const adminPasswordHash = await generatePasswordHash(adminPassword);
    console.log('✅ Generated secure password hash');
    
    // Get domain information
    console.log('\n🌐 Domain Configuration');
    const domain = await prompt('Your portfolio domain (e.g., yourname.com): ');
    const corsOrigins = domain ? `https://${domain},https://www.${domain}` : '';
    
    // Create production environment file
    const envContent = `# Portfolio Site - Production Configuration
# Generated on ${new Date().toISOString()}

# SECURITY - Keep these secret!
NODE_ENV=production
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${refreshSecret}
SESSION_SECRET=${sessionSecret}

# Admin Credentials
ADMIN_USERNAME=${adminUsername}
ADMIN_EMAIL=${adminEmail}
ADMIN_PASSWORD_HASH=${adminPasswordHash}

# Domain Configuration
${domain ? `CORS_ORIGIN=${corsOrigins}` : '# CORS_ORIGIN=https://yourdomain.com'}
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
# CONTACT_EMAIL=contact@${domain || 'yourdomain.com'}

# Monitoring (recommended)
# SENTRY_DSN=your-sentry-dsn-for-error-tracking
`;

    // Write production env file
    const prodEnvPath = path.join(process.cwd(), '.env.production');
    fs.writeFileSync(prodEnvPath, envContent);
    
    console.log('\n✅ Created .env.production file');
    console.log('\n📋 Next Steps:');
    console.log('1. Review and customize .env.production');
    console.log('2. Set up your database (if using PostgreSQL)');
    console.log('3. Configure email settings (optional)');
    console.log('4. Set up monitoring with Sentry (recommended)');
    console.log('5. Deploy to your hosting platform');
    
    console.log('\n🔒 Security Checklist:');
    console.log('✓ Secure JWT secrets generated');
    console.log('✓ Strong admin password set');
    console.log('✓ Production environment configured');
    console.log('- Configure HTTPS on your domain');
    console.log('- Set up database backups');
    console.log('- Enable monitoring and logging');
    
    console.log('\n🚀 Your portfolio is ready for production deployment!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupProduction();
}

module.exports = { generateSecret, generatePasswordHash };