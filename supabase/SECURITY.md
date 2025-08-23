# Supabase Security Guide

## Row Level Security (RLS) Implementation

This document outlines the comprehensive security implementation for the portfolio site, including Row Level Security policies, storage bucket permissions, and API security best practices.

## 🔒 Security Architecture Overview

### Authentication Flow
1. **Public Access**: Anonymous users can view published content
2. **User Authentication**: JWT-based authentication via Supabase Auth
3. **Role-Based Access**: Admin, Editor, and User roles with granular permissions
4. **Service Role**: Backend services bypass RLS for administrative tasks

### Security Layers
- **Row Level Security (RLS)**: Database-level access control
- **Storage Policies**: File access and upload restrictions
- **API Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Sanitization and validation at application level
- **Audit Logging**: Security event tracking

## 🛡️ RLS Policy Structure

### Policy Categories

#### 1. Public Read Policies
```sql
-- Example: Public access to published projects
CREATE POLICY "Public project read access" ON public.projects
  FOR SELECT USING (
    auth.is_service_role() OR
    status IN ('active', 'featured')
  );
```

#### 2. User Ownership Policies
```sql
-- Example: Users can update their own content
CREATE POLICY "Author project update access" ON public.projects
  FOR UPDATE USING (
    auth.uid() = author_id OR
    auth.is_admin_or_editor()
  );
```

#### 3. Role-Based Policies
```sql
-- Example: Admin full access
CREATE POLICY "Admin project full access" ON public.projects
  FOR ALL USING (auth.is_admin());
```

#### 4. Service Role Bypass
```sql
-- Example: Service role bypass for backend operations
CREATE POLICY "Service analytics insert access" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.is_service_role());
```

## 📋 Table-Specific Security Rules

### Profiles Table
- **Public Read**: Basic profile info only (non-admin users)
- **Own Access**: Users can manage their own profiles
- **Role Protection**: Prevents role escalation attacks
- **Admin Override**: Full administrative access

### Projects Table
- **Public Read**: Published projects only (`active`, `featured`)
- **Author Control**: Authors manage their own projects
- **Editor Access**: Editors can modify all projects
- **Draft Protection**: Unpublished projects private to authors

### Blog Posts Table
- **Public Read**: Published posts with publish date validation
- **Author Control**: Authors manage their own posts
- **Schedule Protection**: Scheduled posts hidden until publish time
- **SEO Access**: Meta fields accessible for public content

### Comments Table
- **Public Read**: Approved comments only
- **Moderation**: Pending comments hidden from public
- **Edit Window**: Authors can edit for 1 hour after posting
- **Admin Moderation**: Full comment management

### Media Assets Table
- **Public Access**: Public images and media
- **Owner Control**: Users manage their uploads
- **Size Limits**: Enforced at storage policy level
- **MIME Restrictions**: Type validation for security

### Contact Messages Table
- **No Public Access**: Sensitive contact information protected
- **Admin Only**: Full access for admins and assigned users
- **Assignment**: Messages can be assigned to specific users

### Analytics Events Table
- **Admin Only**: Sensitive analytics data protected
- **Service Insert**: Backend can log events
- **Audit Trail**: Security events tracked

### Skills, Testimonials, Categories, Tags
- **Public Read**: Portfolio data accessible
- **Admin Manage**: Only admins can modify
- **Approval Flow**: Testimonials require approval

### Newsletter Subscribers
- **Privacy Protected**: No public access to subscriber list
- **Self-Service**: Users can subscribe/unsubscribe
- **Admin Management**: Full subscriber management

## 📁 Storage Security Policies

### Bucket Configuration
- **avatars**: Public read, 2MB limit, image types only
- **project-images**: Public read, 10MB limit, image types
- **blog-images**: Public read, 10MB limit, image types
- **documents**: Private access, 50MB limit, document types
- **media**: Public read, 100MB limit, all media types

### Upload Restrictions
```sql
-- Example: Avatar upload with size and user validation
CREATE POLICY "Authenticated avatar upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    octet_length(decode(encode(name, 'escape'), 'escape')) <= 2097152
  );
```

### Folder Structure
- Users can only upload to their own folders
- Admin override for all buckets
- Automatic cleanup of unused files

## 🔐 Service Key Security

### Environment Configuration
```bash
# Required environment variables
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key # Server-side only!

# Security headers
SUPABASE_JWT_SECRET=your_jwt_secret
```

### Service Key Usage
- **Server-side only**: Never expose service key to client
- **Bypass RLS**: Use for administrative backend operations
- **Rate Limiting**: Implement proper rate limiting
- **Audit Logging**: Log all service key operations

### API Security Best Practices

#### 1. Authentication Validation
```javascript
// Validate JWT token
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) {
  throw new Error('Unauthorized');
}
```

#### 2. Role Verification
```javascript
// Check user role before sensitive operations
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (profile.role !== 'admin') {
  throw new Error('Insufficient permissions');
}
```

#### 3. Input Sanitization
```javascript
// Sanitize user input
const sanitizedInput = DOMPurify.sanitize(userInput);
const validatedData = schema.parse(sanitizedInput);
```

#### 4. Rate Limiting
```javascript
// Implement rate limiting per user
const rateLimiter = new RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per windowMs
  keyGenerator: (req) => req.user.id
});
```

## 🔍 Security Monitoring

### Audit Logging
```sql
-- Log security events
SELECT public.log_security_event(
  'unauthorized_access',
  'projects',
  '123e4567-e89b-12d3-a456-426614174000',
  '{"attempted_action": "delete", "user_role": "user"}'::jsonb
);
```

### Monitoring Queries
```sql
-- Failed authentication attempts
SELECT * FROM public.analytics_events 
WHERE event_type LIKE 'security_%' 
AND created_at > NOW() - INTERVAL '24 hours';

-- Role escalation attempts
SELECT * FROM public.analytics_events 
WHERE metadata->>'details'->>'attempted_action' = 'role_change'
AND created_at > NOW() - INTERVAL '7 days';
```

## 🚨 Security Checklist

### Database Security
- [ ] RLS enabled on all tables
- [ ] Comprehensive policies for all operations
- [ ] Service role bypass properly implemented
- [ ] Helper functions for role checking
- [ ] Audit logging in place

### Storage Security
- [ ] Bucket policies configured
- [ ] File size limits enforced
- [ ] MIME type restrictions in place
- [ ] User folder isolation implemented
- [ ] Admin override policies set

### API Security
- [ ] JWT validation on all protected endpoints
- [ ] Role-based access control implemented
- [ ] Input validation and sanitization
- [ ] Rate limiting configured
- [ ] Error handling doesn't leak information

### Environment Security
- [ ] Service keys properly secured
- [ ] Environment variables not exposed to client
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Security headers implemented

### Monitoring
- [ ] Security event logging
- [ ] Failed attempt monitoring
- [ ] Performance monitoring for RLS
- [ ] Regular security audits scheduled
- [ ] Incident response plan in place

## 🔧 Troubleshooting Common Issues

### RLS Policy Not Working
1. Check if RLS is enabled on the table
2. Verify policy logic with test queries
3. Ensure helper functions are properly defined
4. Check for conflicting policies

### Storage Access Denied
1. Verify bucket name and policy configuration
2. Check file size and MIME type restrictions
3. Ensure user has proper folder permissions
4. Validate authentication token

### Performance Issues
1. Monitor RLS policy execution time
2. Add indexes for frequently queried columns
3. Optimize helper functions
4. Consider caching for public content

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)

## 🆘 Emergency Procedures

### Security Incident Response
1. **Immediate**: Revoke compromised tokens
2. **Assessment**: Identify scope of breach
3. **Containment**: Disable affected accounts
4. **Investigation**: Analyze logs and patterns
5. **Recovery**: Restore secure state
6. **Post-Incident**: Update security measures

### Emergency Contacts
- Database Admin: [admin@portfolio.com]
- Security Team: [security@portfolio.com]
- Infrastructure: [devops@portfolio.com]