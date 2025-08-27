# Next.js Starter with Supabase and Auth0

A complete Next.js 14 starter template featuring Supabase database integration, Auth0 authentication, and a modern admin dashboard with content management capabilities.

## Features

- ⚡ **Next.js 14** with App Router and TypeScript
- 🔐 **Auth0 Authentication** with user session management
- 🗃️ **Supabase Integration** for database operations
- 🎨 **Modern UI** with Tailwind CSS and Radix UI components
- 📊 **Admin Dashboard** with content management
- 🔒 **Protected Routes** and role-based access control
- 📱 **Responsive Design** optimized for all devices
- 🚀 **Production Ready** with proper error handling

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd nextjs-starter

# Install dependencies
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your keys:

```bash
cp .env.example .env.local
```

Update `.env.local` with your credentials:

```env
# Auth0 Configuration
AUTH0_SECRET='your-32-character-secret'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-domain.auth0.com'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'
NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key'
SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
```

### 3. Database Setup

Create the required tables in your Supabase database:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create content table
CREATE TABLE content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image TEXT,
  published BOOLEAN DEFAULT false,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "Published content is viewable by everyone" ON content
  FOR SELECT USING (published = true);

CREATE POLICY "All content viewable by admins" ON content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth0_id = auth.jwt() ->> 'sub'
      AND profiles.role = 'admin'
    )
  );
```

### 4. Auth0 Setup

1. Create an Auth0 application (Regular Web Application)
2. Configure your Auth0 application:
   - **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`

### 5. Run the Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## Project Structure

```
├── app/
│   ├── admin/
│   │   ├── dashboard/      # Admin dashboard
│   │   └── content/        # Content management
│   ├── api/
│   │   ├── auth/[auth0]/   # Auth0 routes
│   │   └── content/        # Content API
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   └── ui/                 # UI components
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── utils.ts            # Utility functions
├── middleware.ts           # Route protection
└── types/
    └── database.ts         # TypeScript types
```

## Key Features

### Authentication
- **Auth0 Integration**: Complete authentication flow with login/logout
- **User Sync**: Automatic user synchronization with Supabase
- **Protected Routes**: Middleware-based route protection
- **Role-based Access**: Admin vs user role management

### Content Management
- **CRUD Operations**: Full create, read, update, delete functionality
- **Draft System**: Publish/unpublish content
- **Rich Editor**: Content creation with excerpts and featured images
- **Search & Filter**: Find content by title, status, and date

### Admin Dashboard
- **Analytics**: Content statistics and metrics
- **User Management**: Profile and role management
- **System Status**: Real-time system health monitoring
- **Quick Actions**: Common administrative tasks

### Database Integration
- **Supabase Client**: Configured for both client and server-side operations
- **Type Safety**: Full TypeScript support with generated types
- **Row Level Security**: Secure data access policies
- **Real-time**: Live data updates capability

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## Deployment

### Environment Variables

Set the following environment variables in your production environment:

- Update `AUTH0_BASE_URL` to your production domain
- Ensure all Supabase and Auth0 keys are properly configured
- Update Auth0 application settings with production URLs

### Database

1. Run the SQL setup script in your Supabase production database
2. Create an admin user by manually updating a user's role to 'admin'

### Deploy

The application is ready for deployment on platforms like:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Digital Ocean**

## Customization

### Styling
- Modify `tailwind.config.ts` for design system changes
- Update `app/globals.css` for global styles
- Customize components in `components/ui/`

### Authentication
- Add custom user fields in `lib/supabase.ts`
- Modify user sync logic in `syncUserWithSupabase`
- Update profile schema as needed

### Content Types
- Extend the content table schema
- Add new fields to the content form
- Create custom content types

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for Auth0 and Supabase
- Review the example environment configuration

---

**Built with ❤️ using Next.js, Supabase, and Auth0**