#!/usr/bin/env node

/**
 * Supabase Setup Helper Script
 * Guides you through setting up your Supabase project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function setupSupabase() {
  console.log('\n🚀 SUPABASE SETUP WIZARD\n');
  console.log('This will help you configure your Supabase project.\n');
  
  // Check if .env exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from template\n');
  }

  console.log('📝 Please have these ready from your Supabase dashboard:');
  console.log('   1. Project URL (https://xxxxx.supabase.co)');
  console.log('   2. Anon/Public Key');
  console.log('   3. Service Role Key (Settings > API)\n');

  const proceed = await question('Ready to continue? (y/n): ');
  if (proceed.toLowerCase() !== 'y') {
    console.log('\n👋 Setup cancelled. Run this script again when ready.');
    process.exit(0);
  }

  // Collect Supabase credentials
  console.log('\n🔑 SUPABASE CREDENTIALS\n');
  
  const supabaseUrl = await question('Supabase Project URL: ');
  const supabaseAnonKey = await question('Supabase Anon Key: ');
  const supabaseServiceKey = await question('Supabase Service Role Key: ');
  
  // Site configuration
  console.log('\n🌐 SITE CONFIGURATION\n');
  
  const siteUrl = await question('Your Netlify site URL (or press Enter for default): ') || 'https://your-site.netlify.app';
  const adminEmail = await question('Admin email address: ');
  
  // Update .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace Supabase values
  envContent = envContent.replace(/SUPABASE_URL=.*/g, `SUPABASE_URL=${supabaseUrl}`);
  envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
  envContent = envContent.replace(/SUPABASE_ANON_KEY=.*/g, `SUPABASE_ANON_KEY=${supabaseAnonKey}`);
  envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`);
  envContent = envContent.replace(/SUPABASE_SERVICE_KEY=.*/g, `SUPABASE_SERVICE_KEY=${supabaseServiceKey}`);
  
  // Replace site values
  envContent = envContent.replace(/VITE_SITE_URL=.*/g, `VITE_SITE_URL=${siteUrl}`);
  envContent = envContent.replace(/SITE_URL=.*/g, `SITE_URL=${siteUrl}`);
  envContent = envContent.replace(/ADMIN_EMAIL=.*/g, `ADMIN_EMAIL=${adminEmail}`);
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Environment variables updated!\n');

  // Show next steps
  console.log('📋 NEXT STEPS:\n');
  console.log('1. Run database migrations:');
  console.log('   npx supabase db push --linked\n');
  console.log('2. Test local development:');
  console.log('   npm run dev\n');
  console.log('3. Deploy to Netlify:');
  console.log('   - Push to GitHub');
  console.log('   - Import project in Netlify');
  console.log('   - Add environment variables from .env\n');
  console.log('4. Test your live site!');
  
  console.log('\n🎉 Setup complete! Your portfolio is ready to launch.\n');
  
  rl.close();
}

// Run the setup
setupSupabase().catch(console.error);