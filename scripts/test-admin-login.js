#!/usr/bin/env node

/**
 * Test Admin Login Script
 * Verifies that the admin user can authenticate with Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Supabase configuration
const SUPABASE_URL = 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function testAdminLogin() {
  console.log('\n🔐 ADMIN LOGIN TEST\n');
  
  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Get credentials
    const email = await question('Enter admin email: ') || 'brandon.lambert87@gmail.com';
    const password = await question('Enter admin password: ');
    
    if (!password) {
      console.error('❌ Password is required');
      process.exit(1);
    }
    
    console.log('\n📡 Testing login...');
    
    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Login failed:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n💡 Tip: Make sure you entered the correct password');
        console.log('   If you forgot it, you can reset it in the Supabase dashboard');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Login successful!');
    console.log('\n👤 User Details:');
    console.log('   Email:', data.user.email);
    console.log('   ID:', data.user.id);
    console.log('   Role:', data.user.role);
    console.log('   Created:', new Date(data.user.created_at).toLocaleString());
    
    // Check for admin profile
    console.log('\n🔍 Checking admin profile...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('⚠️  No profile found - run the SQL script to create the profiles table');
      } else {
        console.log('⚠️  Profile check error:', profileError.message);
      }
    } else if (profile) {
      console.log('✅ Admin profile found!');
      console.log('   Username:', profile.username);
      console.log('   Role:', profile.role);
      console.log('   Full Name:', profile.full_name || 'Not set');
      
      if (profile.role === 'admin') {
        console.log('\n🎉 Admin access confirmed! You can now:');
        console.log('   • Access the admin panel at /admin');
        console.log('   • Manage content and users');
        console.log('   • View analytics and messages');
      } else {
        console.log('\n⚠️  User exists but not set as admin');
        console.log('   Run the SQL update query to grant admin role');
      }
    }
    
    // Test session
    console.log('\n🔒 Session Details:');
    console.log('   Access Token:', data.session.access_token.substring(0, 20) + '...');
    console.log('   Expires:', new Date(data.session.expires_at * 1000).toLocaleString());
    
    // Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Test complete - signed out successfully');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the test
console.log('🚀 Starting Admin Login Test');
console.log('   Supabase URL:', SUPABASE_URL);

testAdminLogin().catch(console.error);