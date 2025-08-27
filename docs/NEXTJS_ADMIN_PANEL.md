# Next.js Admin Panel with Supabase & Auth0

A comprehensive, production-ready admin panel built with Next.js, Supabase, and Auth0 for modern content management.

## 🚀 Overview

This admin panel provides a complete CMS solution with:

- **Role-based Authentication** via Auth0
- **Real-time Database** with Supabase
- **Modern UI Components** with Radix UI & Tailwind CSS
- **WYSIWYG Content Editor** with auto-save
- **Media Management** with drag-drop uploads
- **Content Versioning** and history tracking
- **SEO Optimization** tools
- **Real-time Preview** functionality

## 📁 Project Structure

```
portfolio_site/
├── components/admin/           # Admin panel components
│   ├── Dashboard.tsx          # Main dashboard with analytics
│   ├── ContentList.tsx        # Content management interface
│   ├── ContentEditor.tsx      # WYSIWYG content editor
│   ├── MediaLibrary.tsx       # Media file management
│   ├── WYSIWYGEditor.tsx      # Rich text editor component
│   ├── SEOEditor.tsx          # SEO metadata editor
│   └── MediaPicker.tsx        # Media selection modal
├── lib/
│   ├── auth/
│   │   └── auth0-config.ts    # Auth0 configuration & roles
│   └── supabase/
│       └── config.ts          # Supabase setup & RLS policies
├── hooks/admin/               # Custom admin hooks
│   ├── useSupabaseRealtime.ts # Real-time subscriptions
│   ├── useSupabaseQuery.ts    # Database queries
│   ├── useSupabaseStorage.ts  # File storage operations
│   ├── useContentVersions.ts  # Version control
│   └── useAutoSave.ts         # Auto-save functionality
├── types/admin/               # TypeScript definitions
│   └── index.ts              # Admin-specific types
└── utils/admin/               # Utility functions
    ├── format.ts             # Data formatting helpers
    ├── debounce.ts           # Performance optimization
    └── slug.ts               # URL slug generation
```

## 🔐 Authentication & Authorization

### Auth0 Integration

#### Setup
1. Create Auth0 application
2. Configure environment variables:
```env
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_REDIRECT_URI=http://localhost:3000/api/auth/callback
AUTH0_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
AUTH0_AUDIENCE=your-api-audience
```

#### Role-Based Access Control
- **Admin**: Full access to all features
- **Editor**: Content creation and media management
- **Viewer**: Read-only access

```typescript
// Example usage
const { user } = useAuth0();
const canEdit = user?.role === 'admin' || user?.role === 'editor';
```

### Permission System
```typescript
// Check specific permissions
const hasPermission = (user: Auth0User, action: string, resource: string) => {
  return user.permissions?.some(p => 
    p.action === action && p.resource === resource
  );
};
```

## 🗄️ Database Architecture

### Supabase Configuration

#### Core Tables
```sql
-- Content table
CREATE TABLE content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  type content_type NOT NULL,
  status content_status NOT NULL,
  author_id VARCHAR(255) NOT NULL,
  featured_image TEXT,
  tags TEXT[],
  categories TEXT[],
  seo_metadata JSONB,
  publish_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media files table
CREATE TABLE media_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type media_type NOT NULL,
  size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  folder_id UUID REFERENCES media_folders(id),
  alt_text TEXT,
  description TEXT,
  uploaded_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content versions table
CREATE TABLE content_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  status content_status NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- Content policies
CREATE POLICY "Users can view published content or own drafts" ON content
FOR SELECT USING (
  status = 'published' OR 
  auth.uid()::text = author_id OR
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid()::text 
    AND role IN ('admin', 'editor')
  )
);
```

## 🎨 UI Components

### Dashboard Features
- **Analytics Overview**: Content stats, page views, user activity
- **Recent Activity**: Real-time updates on content changes
- **Quick Actions**: Fast access to common tasks
- **Role-based Navigation**: Adaptive menu based on user permissions

### Content Editor
- **WYSIWYG Editing**: Rich text editor with toolbar
- **Auto-save**: Automatic draft saving every 30 seconds
- **Version Control**: Track and restore content versions
- **SEO Tools**: Built-in SEO optimization
- **Media Integration**: Inline media insertion
- **Real-time Preview**: Live content preview

### Media Library
- **Drag-drop Upload**: Easy file uploading
- **Grid/List View**: Flexible viewing options
- **Search & Filter**: Find media quickly
- **Bulk Operations**: Multi-select actions
- **Storage Management**: Monitor usage and quotas

## 🔧 Advanced Features

### Real-time Functionality
```typescript
// Real-time content updates
const { data: content } = useSupabaseRealtime('content', {
  onUpdate: (updatedContent) => {
    console.log('Content updated:', updatedContent);
  }
});
```

### Auto-save System
```typescript
// Auto-save implementation
const { saveStatus } = useAutoSave(formData, {
  enabled: true,
  interval: 30000, // 30 seconds
  onSave: async (data) => {
    await saveContentDraft(data);
  }
});
```

### Content Versioning
```typescript
// Version management
const { versions, createVersion, restoreVersion } = useContentVersions(contentId);

// Create version before major changes
await createVersion(currentContent, 'Before SEO updates');
```

### SEO Optimization
- **Meta Tags**: Title, description, keywords
- **Open Graph**: Social media previews
- **Structured Data**: JSON-LD schema markup
- **Canonical URLs**: Duplicate content prevention
- **SEO Score**: Real-time optimization scoring

## 📱 Responsive Design

The admin panel is fully responsive with:
- **Mobile-first** approach
- **Collapsible sidebar** on mobile
- **Touch-friendly** controls
- **Adaptive layouts** for different screen sizes

## 🚀 Performance Optimization

### Database Queries
- **Pagination**: Efficient data loading
- **Indexing**: Optimized database performance
- **Caching**: Client-side query caching
- **Real-time Subscriptions**: Minimal data transfer

### File Management
- **Chunked Uploads**: Large file support
- **Image Optimization**: Automatic compression
- **CDN Integration**: Fast global delivery
- **Storage Quotas**: Usage monitoring

### Code Splitting
- **Lazy Loading**: Components loaded on demand
- **Route-based Splitting**: Reduced bundle sizes
- **Tree Shaking**: Eliminate unused code

## 🔒 Security Features

### Data Protection
- **Row Level Security**: Database-level permissions
- **Input Validation**: XSS prevention
- **CSRF Protection**: Request authenticity
- **File Type Validation**: Safe uploads

### Authentication Security
- **JWT Tokens**: Secure session management
- **Role-based Access**: Granular permissions
- **Session Timeout**: Automatic logout
- **Audit Logging**: Track user actions

## 📊 Analytics & Monitoring

### Built-in Analytics
- **Content Performance**: Views, engagement
- **User Activity**: Login patterns, actions
- **Storage Usage**: File sizes, quotas
- **Error Tracking**: System health

### Reporting
- **Export Functions**: CSV, JSON formats
- **Scheduled Reports**: Automated delivery
- **Custom Dashboards**: Tailored views
- **Performance Metrics**: System statistics

## 🛠️ Deployment

### Environment Setup
```env
# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Next.js
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
```

### Database Migration
```sql
-- Run initialization
SELECT create_admin_schema();

-- Enable RLS
SELECT enable_rls('content');
SELECT enable_rls('media_files');
SELECT enable_rls('content_versions');

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', false);
```

### Vercel Deployment
1. Connect GitHub repository
2. Set environment variables
3. Configure build settings
4. Deploy with automatic CI/CD

## 📚 API Reference

### Content API
```typescript
// Create content
POST /api/admin/content
{
  title: string;
  content: string;
  type: 'post' | 'page' | 'project';
  status: 'draft' | 'published';
}

// Update content
PUT /api/admin/content/:id
{
  title?: string;
  content?: string;
  status?: 'draft' | 'published';
}

// Get content list
GET /api/admin/content?status=published&type=post&page=1&limit=10
```

### Media API
```typescript
// Upload media
POST /api/admin/media/upload
FormData: file, folder?, metadata?

// Get media list
GET /api/admin/media?type=image&folder=uploads

// Delete media
DELETE /api/admin/media/:id
```

## 🧪 Testing

### Unit Tests
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### E2E Tests
```bash
npm run test:e2e          # Playwright tests
npm run test:e2e:ui       # UI mode
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a service
- [Auth0](https://auth0.com/) - Authentication platform
- [Radix UI](https://radix-ui.com/) - UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

**Built with ❤️ for modern web development**