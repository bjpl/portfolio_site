#!/usr/bin/env node

/**
 * Reset Admin Password Script
 * Updates the admin password in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const crypto = require('crypto');

// Supabase configuration
const SUPABASE_URL = 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

// Function to mask password input
function maskPassword(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(query);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    stdin.on('data', (char) => {
      char = char.toString();
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f':
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.clearLine();
            stdout.cursorTo(0);
            stdout.write(query + '*'.repeat(password.length));
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function resetPassword() {
  console.log('\n🔐 ADMIN PASSWORD RESET TOOL');
  console.log('================================\n');
  
  const email = 'brandon.lambert87@gmail.com';
  console.log(`📧 Resetting password for: ${email}\n`);
  
  // Initialize Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Get new password
    const newPassword = await maskPassword('Enter new password (min 8 characters): ');
    
    if (newPassword.length < 8) {
      console.error('\n❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    
    const confirmPassword = await maskPassword('Confirm new password: ');
    
    if (newPassword !== confirmPassword) {
      console.error('\n❌ Passwords do not match');
      process.exit(1);
    }
    
    console.log('\n🔄 Updating password...');
    
    // Update password using admin API
    const { data: user, error } = await supabase.auth.admin.updateUserById(
      // First, get the user ID
      (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id,
      { password: newPassword }
    );
    
    if (error) {
      // Alternative method: Direct update
      const { data: users } = await supabase.auth.admin.listUsers();
      const adminUser = users.users.find(u => u.email === email);
      
      if (!adminUser) {
        console.error('\n❌ User not found. Please create the admin user first.');
        process.exit(1);
      }
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { password: newPassword }
      );
      
      if (updateError) {
        console.error('\n❌ Failed to update password:', updateError.message);
        process.exit(1);
      }
    }
    
    console.log('\n✅ Password successfully updated!');
    console.log('\n📝 Next Steps:');
    console.log('1. Go to: https://vocal-pony-24e3de.netlify.app/admin');
    console.log('2. Login with:');
    console.log(`   Email: ${email}`);
    console.log('   Password: [your new password]');
    console.log('\n💡 Remember to save your password in a secure password manager!');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    
    console.log('\n💡 Alternative: Reset via Supabase Dashboard');
    console.log('1. Go to: https://supabase.com/dashboard/project/tdmzayzkqyegvfgxlolj/auth/users');
    console.log(`2. Find user: ${email}`);
    console.log('3. Click menu → "Send password reset"');
    console.log('4. Check your email for reset link');
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the reset
console.log('🚀 Starting Password Reset Process');
resetPassword().catch(console.error);