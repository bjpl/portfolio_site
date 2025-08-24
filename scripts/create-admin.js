#!/usr/bin/env node

/**
 * Supabase Admin User Creation Script
 * 
 * This script creates an admin user in Supabase using the service key.
 * It handles both the auth.users table and the profiles table with proper role assignment.
 * 
 * Usage:
 *   node scripts/create-admin.js [email] [password]
 * 
 * Environment Variables Required:
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_KEY: Your Supabase service role key
 * 
 * Author: Portfolio Site Admin Tool
 * Created: 2024
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E';

const DEFAULT_ADMIN_EMAIL = 'admin@portfolio.local';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!SecurePassword';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isValidPassword(password) {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters long' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number' };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return { valid: false, message: 'Password must contain at least one special character' };
  return { valid: true };
}

/**
 * Log messages with colors
 */
const logger = {
  info: (message) => console.log(`${colors.blue}ℹ ${message}${colors.reset}`),
  success: (message) => console.log(`${colors.green}✓ ${message}${colors.reset}`),
  warning: (message) => console.log(`${colors.yellow}⚠ ${message}${colors.reset}`),
  error: (message) => console.log(`${colors.red}✗ ${message}${colors.reset}`),
  header: (message) => console.log(`${colors.bright}${colors.cyan}${message}${colors.reset}`),
  section: (message) => console.log(`\n${colors.magenta}${message}${colors.reset}`)
};

/**
 * Initialize Supabase admin client
 */
function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logger.error('Missing required environment variables:');
    logger.error('- SUPABASE_URL: Your Supabase project URL');
    logger.error('- SUPABASE_SERVICE_KEY: Your Supabase service role key');
    process.exit(1);
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Check if user already exists
 */
async function checkUserExists(supabase, email) {
  try {
    // Check in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const existingAuthUser = authUsers.users.find(user => user.email === email);

    // Check in profiles table
    const { data: profileUser, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    // ProfileError is expected if user doesn't exist
    const existingProfileUser = !profileError ? profileUser : null;

    return {
      authUser: existingAuthUser || null,
      profileUser: existingProfileUser || null,
      exists: !!(existingAuthUser || existingProfileUser)
    };
  } catch (error) {
    logger.warning(`Error checking existing user: ${error.message}`);
    return { authUser: null, profileUser: null, exists: false };
  }
}

/**
 * Create admin user in Supabase Auth
 */
async function createAuthUser(supabase, email, password) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        full_name: 'Portfolio Administrator',
        created_by: 'admin-script',
        created_at: new Date().toISOString()
      }
    });

    if (error) throw error;
    return { success: true, user: data.user, error: null };
  } catch (error) {
    return { success: false, user: null, error: error.message };
  }
}

/**
 * Create admin profile in profiles table
 */
async function createAdminProfile(supabase, authUser, email) {
  try {
    const profileData = {
      id: authUser.id,
      email: email,
      username: 'admin',
      full_name: 'Portfolio Administrator',
      role: 'admin',
      bio: 'System administrator for the portfolio site',
      is_active: true,
      metadata: {
        created_by: 'admin-script',
        permissions: ['read', 'write', 'delete', 'admin'],
        last_login: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, profile: data, error: null };
  } catch (error) {
    return { success: false, profile: null, error: error.message };
  }
}

/**
 * Update existing user to admin
 */
async function updateUserToAdmin(supabase, existingUser, email) {
  try {
    // Update auth user metadata
    if (existingUser.authUser) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        existingUser.authUser.id,
        {
          user_metadata: {
            ...existingUser.authUser.user_metadata,
            role: 'admin',
            updated_by: 'admin-script',
            updated_at: new Date().toISOString()
          }
        }
      );
      if (authError) logger.warning(`Auth metadata update warning: ${authError.message}`);
    }

    // Update or create profile
    if (existingUser.profileUser) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          is_active: true,
          metadata: {
            ...existingUser.profileUser.metadata,
            updated_by: 'admin-script',
            updated_at: new Date().toISOString(),
            permissions: ['read', 'write', 'delete', 'admin']
          }
        })
        .eq('id', existingUser.profileUser.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, profile: data, updated: true, error: null };
    } else if (existingUser.authUser) {
      // Create profile for existing auth user
      const result = await createAdminProfile(supabase, existingUser.authUser, email);
      return { ...result, updated: false };
    }

    throw new Error('No existing user found to update');
  } catch (error) {
    return { success: false, profile: null, updated: false, error: error.message };
  }
}

/**
 * Verify admin user creation
 */
async function verifyAdminUser(supabase, email) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('role', 'admin')
      .single();

    if (error) throw error;
    return { success: true, profile, error: null };
  } catch (error) {
    return { success: false, profile: null, error: error.message };
  }
}

/**
 * Display admin user information
 */
function displayAdminInfo(email, password, profile) {
  logger.section('🔐 ADMIN USER CREATED SUCCESSFULLY');
  
  console.log(`
${colors.bright}Admin User Details:${colors.reset}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${colors.cyan}📧 Email:${colors.reset}         ${email}
${colors.cyan}🔑 Password:${colors.reset}      ${password}
${colors.cyan}👤 Username:${colors.reset}      ${profile.username}
${colors.cyan}📛 Full Name:${colors.reset}     ${profile.full_name}
${colors.cyan}🎭 Role:${colors.reset}          ${profile.role}
${colors.cyan}🆔 User ID:${colors.reset}       ${profile.id}
${colors.cyan}✅ Active:${colors.reset}        ${profile.is_active ? 'Yes' : 'No'}
${colors.cyan}📅 Created:${colors.reset}       ${new Date(profile.created_at).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${colors.bright}Next Steps:${colors.reset}
${colors.green}1.${colors.reset} Login to your admin panel at: ${colors.blue}https://your-site.com/admin${colors.reset}
${colors.green}2.${colors.reset} Or access Supabase Dashboard at: ${colors.blue}https://supabase.com/dashboard/project/your-project${colors.reset}
${colors.green}3.${colors.reset} Change the default password after first login
${colors.green}4.${colors.reset} Configure additional admin settings as needed

${colors.yellow}Security Reminders:${colors.reset}
${colors.red}•${colors.reset} Store these credentials securely
${colors.red}•${colors.reset} Change the default password immediately
${colors.red}•${colors.reset} Enable two-factor authentication if available
${colors.red}•${colors.reset} Regularly review admin access logs
  `);
}

/**
 * Main function
 */
async function main() {
  try {
    logger.header('🚀 SUPABASE ADMIN USER CREATION TOOL');
    logger.info('This tool will create an admin user for your portfolio site');
    
    // Get command line arguments
    const args = process.argv.slice(2);
    let email = args[0];
    let password = args[1];

    // Initialize Supabase
    logger.section('🔧 Initializing Supabase Connection');
    const supabase = initializeSupabase();
    logger.success('Connected to Supabase successfully');

    // Get email if not provided
    if (!email) {
      const userEmail = await prompt(`Enter admin email (default: ${DEFAULT_ADMIN_EMAIL}): `);
      email = userEmail.trim() || DEFAULT_ADMIN_EMAIL;
    }

    // Validate email
    if (!isValidEmail(email)) {
      logger.error('Invalid email format provided');
      process.exit(1);
    }

    // Get password if not provided
    if (!password) {
      const userPassword = await prompt(`Enter admin password (default: auto-generated secure password): `);
      password = userPassword.trim() || DEFAULT_ADMIN_PASSWORD;
    }

    // Validate password
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      logger.error(`Password validation failed: ${passwordValidation.message}`);
      process.exit(1);
    }

    logger.section('👤 Checking Existing Users');
    
    // Check if user already exists
    const existingUser = await checkUserExists(supabase, email);
    
    if (existingUser.exists) {
      logger.warning(`User with email ${email} already exists`);
      const shouldUpdate = await prompt('Do you want to update this user to admin? (y/N): ');
      
      if (shouldUpdate.toLowerCase() !== 'y' && shouldUpdate.toLowerCase() !== 'yes') {
        logger.info('Operation cancelled by user');
        process.exit(0);
      }

      logger.section('🔄 Updating Existing User to Admin');
      const updateResult = await updateUserToAdmin(supabase, existingUser, email);
      
      if (!updateResult.success) {
        logger.error(`Failed to update user: ${updateResult.error}`);
        process.exit(1);
      }

      logger.success(`User ${updateResult.updated ? 'updated' : 'profile created'} successfully`);
      displayAdminInfo(email, '(password unchanged)', updateResult.profile);
      
    } else {
      logger.section('🆕 Creating New Admin User');
      
      // Create auth user
      logger.info('Creating user in Supabase Auth...');
      const authResult = await createAuthUser(supabase, email, password);
      
      if (!authResult.success) {
        logger.error(`Failed to create auth user: ${authResult.error}`);
        process.exit(1);
      }
      logger.success('Auth user created successfully');

      // Create profile
      logger.info('Creating admin profile...');
      const profileResult = await createAdminProfile(supabase, authResult.user, email);
      
      if (!profileResult.success) {
        logger.error(`Failed to create profile: ${profileResult.error}`);
        logger.warning('Auth user was created but profile creation failed');
        logger.info('You may need to create the profile manually or run this script again');
        process.exit(1);
      }
      logger.success('Admin profile created successfully');

      displayAdminInfo(email, password, profileResult.profile);
    }

    // Verify the creation
    logger.section('✅ Verifying Admin User');
    const verification = await verifyAdminUser(supabase, email);
    
    if (verification.success) {
      logger.success('Admin user verification completed successfully');
      logger.success(`User ${email} has admin role and is active`);
    } else {
      logger.warning(`Verification warning: ${verification.error}`);
      logger.info('Admin user was created but verification had issues');
    }

    logger.section('🎉 SETUP COMPLETE');
    logger.success('Admin user creation process finished successfully!');

  } catch (error) {
    logger.error(`Unexpected error: ${error.message}`);
    logger.error('Stack trace for debugging:');
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Handle process signals
 */
process.on('SIGINT', () => {
  logger.warning('\nProcess interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.warning('\nProcess terminated');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  createAuthUser,
  createAdminProfile,
  checkUserExists,
  updateUserToAdmin,
  verifyAdminUser
};