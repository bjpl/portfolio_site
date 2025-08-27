# Next.js + Supabase + Auth0 POC

This is a proof of concept demonstrating the integration of:
- **Next.js 14** (App Router)
- **Supabase** (Database & Real-time features)
- **Auth0** (Authentication & Authorization)

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.local` and fill in your actual values:
   ```bash
   cp .env.local .env.local.example
   ```

3. **Set up Auth0:**
   - Create an Auth0 application
   - Set callback URL to `http://localhost:3000/api/auth/callback`
   - Set logout URL to `http://localhost:3000`

4. **Set up Supabase:**
   - Create a Supabase project
   - Create a `posts` table with columns: `id`, `title`, `content`, `author`, `created_at`, `updated_at`

5. **Run the development server:**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
nextjs-poc/
├── app/                    # Next.js App Router
│   ├── admin/             # Protected admin routes
│   ├── page.tsx           # Home page with Supabase data
│   └── layout.tsx         # Root layout with Auth0 provider
├── pages/api/auth/        # Auth0 API routes
├── lib/                   # Utilities
│   └── supabase.ts        # Supabase client configuration
├── middleware.ts          # Auth0 route protection
└── next.config.js         # Next.js configuration
```

## ✨ Features Demonstrated

### 🔐 Authentication (Auth0)
- Login/logout functionality
- Protected routes via middleware
- User session management
- Profile information display

### 🗄️ Database (Supabase)
- Real-time database queries
- Server-side data fetching
- Type-safe database operations
- Error handling

### 🌐 Next.js Integration
- App Router with TypeScript
- Server-side rendering
- Middleware-based route protection
- Modern React patterns

## 🧪 Testing the Integration

1. **Visit the home page** (`/`) - Shows public Supabase data
2. **Try accessing `/admin`** - Redirects to Auth0 login
3. **Log in** - Redirected to protected admin dashboard
4. **Check admin features** - Shows user info and Supabase admin data

## 📊 Expected Database Schema

### Posts Table
```sql
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sample Data
```sql
INSERT INTO posts (title, content, author) VALUES
('Welcome to the POC', 'This is a test post from Supabase', 'Admin'),
('Integration Success', 'Auth0 and Supabase working together!', 'System');
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH0_SECRET` | Auth0 secret key | ✅ |
| `AUTH0_BASE_URL` | Your app base URL | ✅ |
| `AUTH0_ISSUER_BASE_URL` | Auth0 domain | ✅ |
| `AUTH0_CLIENT_ID` | Auth0 client ID | ✅ |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (optional) | ❌ |

## 🎯 POC Validation

This POC proves:

✅ **Auth0 Integration Works**
- Users can log in and log out
- Protected routes are secured
- User sessions are maintained

✅ **Supabase Integration Works**
- Database queries execute successfully
- Real-time data is accessible
- Server-side rendering with data

✅ **Next.js App Router Works**
- TypeScript support is functional
- Middleware protection is active
- Modern React patterns implemented

✅ **Full Stack Integration**
- All three technologies work together
- Authentication flows properly
- Data persistence is reliable

## 🚀 Next Steps

After validating this POC:
1. Implement row-level security in Supabase
2. Add more complex Auth0 roles/permissions
3. Implement real-time features
4. Add comprehensive error handling
5. Scale to production configuration