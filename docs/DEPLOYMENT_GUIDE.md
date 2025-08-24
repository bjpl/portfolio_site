# Portfolio Site Deployment Guide

This comprehensive guide will walk you through deploying your Hugo portfolio site to Netlify with Supabase backend integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure Overview](#project-structure-overview)
3. [Supabase Setup](#supabase-setup)
4. [Netlify Deployment](#netlify-deployment)
5. [Environment Variables Configuration](#environment-variables-configuration)
6. [Testing Procedures](#testing-procedures)
7. [Admin User Creation](#admin-user-creation)
8. [Troubleshooting](#troubleshooting)
9. [Post-Deployment Checklist](#post-deployment-checklist)

## Prerequisites

Before deploying, ensure you have:

- A GitHub account with your repository pushed
- A Netlify account (free tier is sufficient)
- A Supabase account (free tier is sufficient)
- Node.js 18+ installed locally for testing
- Hugo 0.121.0+ installed locally

## Project Structure Overview

```
portfolio_site/
├── content/           # Hugo content files
├── netlify/
│   ├── edge-functions/   # Edge functions for auth
│   └── functions/        # Serverless functions
├── public/              # Hugo build output (auto-generated)
├── static/              # Static assets
├── themes/              # Hugo themes
├── .env.example         # Environment variables template
├── netlify.toml         # Netlify configuration
└── package.json         # Node dependencies
```

## Supabase Setup

### Step 1: Create Supabase Project

Your Supabase project is already created at:
- **Project URL**: `https://tdmzayzkqyegvfgxlolj.supabase.co`

### Step 2: Database Schema Setup

1. Navigate to your Supabase Dashboard
2. Go to the SQL Editor
3. Run the following schema creation scripts:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    bio TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    featured_image TEXT,
    technologies JSONB DEFAULT '[]'::jsonb,
    github_url TEXT,
    live_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    author_id UUID REFERENCES auth.users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    featured_image TEXT,
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT FALSE,
    author_id UUID REFERENCES auth.users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'spam')),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create media_library table
CREATE TABLE IF NOT EXISTS public.media_library (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    caption TEXT,
    uploaded_by UUID REFERENCES auth.users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    session_id TEXT,
    user_id UUID REFERENCES auth.users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_projects_slug ON public.projects(slug);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_featured ON public.projects(featured);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions(created_at);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.media_library
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
```

### Step 3: Row Level Security (RLS) Policies

Run these RLS policies to secure your data:

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Published projects are viewable by everyone" 
    ON public.projects FOR SELECT 
    USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "Admins can manage projects" 
    ON public.projects FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Blog posts policies
CREATE POLICY "Published blog posts are viewable by everyone" 
    ON public.blog_posts FOR SELECT 
    USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "Admins can manage blog posts" 
    ON public.blog_posts FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Contact submissions policies
CREATE POLICY "Anyone can create contact submissions" 
    ON public.contact_submissions FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Admins can view contact submissions" 
    ON public.contact_submissions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Media library policies
CREATE POLICY "Authenticated users can view media" 
    ON public.media_library FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage media" 
    ON public.media_library FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Analytics events policies
CREATE POLICY "Anyone can create analytics events" 
    ON public.analytics_events FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Admins can view analytics" 
    ON public.analytics_events FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );
```

### Step 4: Storage Buckets Setup

1. Go to Storage in your Supabase dashboard
2. Create the following buckets:

```sql
-- Run in SQL Editor to create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('media', 'media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']),
    ('projects', 'projects', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    ('blog', 'blog', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
```

### Step 5: Get Your Supabase Keys

1. Go to Settings > API in your Supabase dashboard
2. Copy the following values:
   - **Project URL**: `https://tdmzayzkqyegvfgxlolj.supabase.co`
   - **Anon/Public Key**: (starts with `eyJ...`)
   - **Service Role Key**: (starts with `eyJ...`) - Keep this secret!
   - **JWT Secret**: Found in Settings > API > JWT Settings

## Netlify Deployment

### Step 1: Connect GitHub Repository

1. Log in to [Netlify](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Choose "Deploy with GitHub"
4. Authorize Netlify to access your GitHub account
5. Select your portfolio repository
6. Configure build settings:
   - **Base directory**: Leave empty
   - **Build command**: `npm run build:netlify`
   - **Publish directory**: `public`

### Step 2: Configure Environment Variables

In Netlify dashboard, go to Site Settings > Environment Variables and add:

#### Core Configuration
```bash
NODE_ENV=production
HUGO_ENV=production
HUGO_VERSION=0.121.0
BUILD_ID=prod-deployment-$(date +%Y%m%d)
```

#### Site URLs
```bash
VITE_API_URL=/api
VITE_SITE_URL=https://your-site-name.netlify.app
API_BASE_URL=https://your-site-name.netlify.app/api
NETLIFY_FUNCTIONS_URL=https://your-site-name.netlify.app/.netlify/functions
CORS_ORIGIN=https://your-site-name.netlify.app
```

#### Supabase Configuration (REQUIRED)
```bash
SUPABASE_URL=https://tdmzayzkqyegvfgxlolj.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://tdmzayzkqyegvfgxlolj.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

#### Authentication
```bash
JWT_SECRET=generate-a-secure-random-string-here
JWT_EXPIRY=7d
ENABLE_REGISTRATION=false
ADMIN_EMAIL=your-admin@email.com
BCRYPT_ROUNDS=12
```

#### Email Configuration (Optional but recommended)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
CONTACT_EMAIL=contact@yourdomain.com
```

### Step 3: Deploy Site

1. Click "Deploy site" button
2. Wait for the initial deployment to complete (3-5 minutes)
3. Your site will be available at `https://[your-site-name].netlify.app`

### Step 4: Configure Custom Domain (Optional)

1. Go to Domain settings in Netlify
2. Click "Add custom domain"
3. Enter your domain name
4. Follow DNS configuration instructions:
   - For apex domain: Add A record pointing to `75.2.60.5`
   - For subdomain: Add CNAME record pointing to `[your-site-name].netlify.app`
5. Enable HTTPS (automatic with Let's Encrypt)

## Testing Procedures

### 1. Basic Functionality Tests

```bash
# Test home page loads
curl https://your-site-name.netlify.app

# Test API health endpoint
curl https://your-site-name.netlify.app/api/health

# Test static assets
curl -I https://your-site-name.netlify.app/css/main.css
```

### 2. Authentication Tests

```javascript
// Test login endpoint
fetch('https://your-site-name.netlify.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'your-password'
  })
})
.then(res => res.json())
.then(console.log);
```

### 3. Database Connection Test

Navigate to `/api/health` in your browser. You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-01-21T00:00:00.000Z",
  "services": {
    "supabase": "connected",
    "database": "healthy"
  }
}
```

### 4. Content Management Tests

1. Navigate to `/admin`
2. Log in with admin credentials
3. Test creating a new project
4. Test uploading an image
5. Test publishing content
6. Verify content appears on public site

### 5. Performance Tests

```bash
# Run Lighthouse audit
npx lighthouse https://your-site-name.netlify.app \
  --output=json \
  --output-path=./lighthouse-report.json

# Check page load time
curl -w "@curl-format.txt" -o /dev/null -s https://your-site-name.netlify.app
```

Create `curl-format.txt`:
```
time_namelookup:  %{time_namelookup}s\n
time_connect:  %{time_connect}s\n
time_appconnect:  %{time_appconnect}s\n
time_pretransfer:  %{time_pretransfer}s\n
time_redirect:  %{time_redirect}s\n
time_starttransfer:  %{time_starttransfer}s\n
time_total:  %{time_total}s\n
```

## Admin User Creation

### Method 1: Using Supabase Dashboard

1. Go to Authentication > Users in Supabase dashboard
2. Click "Invite user"
3. Enter admin email address
4. After user confirms email, run this SQL to make them admin:

```sql
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'admin@example.com';
```

### Method 2: Using SQL Commands

```sql
-- Create admin user directly
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'admin@example.com',
  crypt('your-secure-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Site Admin"}'
);

-- Get the user ID
SELECT id FROM auth.users WHERE email = 'admin@example.com';

-- Create admin profile (use the ID from above)
INSERT INTO public.profiles (
  id,
  username,
  full_name,
  is_admin,
  created_at,
  updated_at
) VALUES (
  'user-id-from-above',
  'admin',
  'Site Administrator',
  true,
  NOW(),
  NOW()
);
```

### Method 3: Using the Admin Panel

1. Temporarily set `ENABLE_REGISTRATION=true` in Netlify environment variables
2. Redeploy the site
3. Navigate to `/admin/register`
4. Create your admin account
5. Set `ENABLE_REGISTRATION=false` again
6. Redeploy to disable registration

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Failures

**Issue**: Hugo build fails with "command not found"
```bash
# Solution: Ensure HUGO_VERSION is set correctly
HUGO_VERSION=0.121.0
```

**Issue**: Node modules not found
```bash
# Solution: Clear cache and rebuild
# In Netlify: Deploys > Trigger Deploy > Clear cache and deploy site
```

#### 2. Function Errors

**Issue**: 500 errors from API endpoints
```javascript
// Check function logs in Netlify:
// Functions > [function-name] > Logs

// Common fixes:
// 1. Verify environment variables are set
// 2. Check Supabase connection
// 3. Verify function syntax
```

#### 3. Authentication Issues

**Issue**: Cannot log in to admin panel
```sql
-- Verify user exists and is admin
SELECT * FROM auth.users WHERE email = 'your-email@example.com';
SELECT * FROM public.profiles WHERE id = 'user-id';

-- Reset admin status if needed
UPDATE public.profiles 
SET is_admin = true 
WHERE id = 'user-id';
```

#### 4. CORS Errors

**Issue**: CORS policy blocking requests
```javascript
// Add your domain to CORS_ORIGIN in environment variables
CORS_ORIGIN=https://your-site.netlify.app,https://www.your-domain.com

// For development, temporarily allow all origins (not for production!)
CORS_ORIGIN=*
```

#### 5. Database Connection Issues

**Issue**: Cannot connect to Supabase
```bash
# Verify Supabase keys:
# 1. Check SUPABASE_URL format (no trailing slash)
# 2. Verify SUPABASE_ANON_KEY is correct
# 3. Test connection with curl:

curl https://tdmzayzkqyegvfgxlolj.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

#### 6. Static Files Not Loading

**Issue**: CSS/JS files return 404
```toml
# Check netlify.toml redirects
# Ensure public directory is correctly built
# Verify file paths in HTML are correct
```

### Debug Mode

Enable debug mode for detailed logs:

1. Set environment variable in Netlify:
```bash
DEBUG=true
LOG_LEVEL=debug
```

2. Check function logs for detailed error messages
3. Use browser developer console for frontend issues

## Post-Deployment Checklist

### Security
- [ ] Change all default passwords
- [ ] Verify RLS policies are enabled
- [ ] Test authentication flow
- [ ] Check HTTPS is enforced
- [ ] Review CORS settings
- [ ] Disable debug mode in production

### Performance
- [ ] Run Lighthouse audit (target 90+ score)
- [ ] Test page load times (< 3 seconds)
- [ ] Verify image optimization
- [ ] Check caching headers
- [ ] Test CDN integration if enabled

### Functionality
- [ ] Test contact form submission
- [ ] Verify email notifications
- [ ] Check all navigation links
- [ ] Test responsive design on mobile
- [ ] Verify search functionality
- [ ] Test admin panel features

### SEO & Analytics
- [ ] Submit sitemap to Google Search Console
- [ ] Verify meta tags and Open Graph tags
- [ ] Set up Google Analytics (if desired)
- [ ] Test structured data markup
- [ ] Check robots.txt configuration

### Backup & Recovery
- [ ] Document Supabase backup procedure
- [ ] Test data export functionality
- [ ] Create deployment rollback plan
- [ ] Document environment variables securely

## Monitoring and Maintenance

### Regular Tasks

**Daily**:
- Monitor error logs in Netlify Functions
- Check contact form submissions
- Review analytics data

**Weekly**:
- Review Supabase usage metrics
- Check for security updates
- Backup database

**Monthly**:
- Update dependencies
- Review and optimize performance
- Audit user accounts
- Clean up unused media files

### Useful Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

## Support Resources

### Documentation
- [Hugo Documentation](https://gohugo.io/documentation/)
- [Netlify Documentation](https://docs.netlify.com/)
- [Supabase Documentation](https://supabase.com/docs)

### Community Support
- [Hugo Forums](https://discourse.gohugo.io/)
- [Netlify Community](https://answers.netlify.com/)
- [Supabase Discord](https://discord.supabase.com/)

### Project-Specific Help
- GitHub Issues: [Your Repository]/issues
- Email Support: admin@yourdomain.com

## Emergency Contacts

In case of critical issues:

1. **Netlify Status**: https://www.netlifystatus.com/
2. **Supabase Status**: https://status.supabase.com/
3. **GitHub Status**: https://www.githubstatus.com/

---

## Quick Start Commands

For quick reference, here are the essential commands:

```bash
# Clone and setup
git clone [your-repo-url]
cd portfolio_site
npm install

# Create .env file
cp .env.example .env
# Edit .env with your values

# Local development
npm run dev

# Deploy to Netlify
git add .
git commit -m "Deploy to production"
git push origin main
# Netlify auto-deploys on push

# Manual deploy from Netlify CLI
npm install -g netlify-cli
netlify deploy --prod
```

---

*Last Updated: January 2025*
*Version: 1.0.0*