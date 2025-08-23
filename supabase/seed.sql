-- Supabase Portfolio Site Seed Data
-- This script populates the database with initial data for testing and development

-- Enable RLS on all tables first (will be created by migrations)
-- INSERT default roles and permissions

-- Insert default user roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Full system administrator', ARRAY['read', 'write', 'delete', 'manage_users']),
('editor', 'Content editor and manager', ARRAY['read', 'write']),
('viewer', 'Read-only access', ARRAY['read'])
ON CONFLICT (name) DO NOTHING;

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
('site_title', 'Brandon Hancock - Portfolio', 'Main site title'),
('site_description', 'Educator, Developer, Digital Innovator', 'Site meta description'),
('contact_email', 'contact@brandonhancock.dev', 'Primary contact email'),
('enable_blog', 'true', 'Enable blog functionality'),
('enable_comments', 'false', 'Enable commenting system'),
('enable_analytics', 'true', 'Enable analytics tracking'),
('default_language', 'en', 'Default site language'),
('supported_languages', 'en,es', 'Supported languages (comma-separated)'),
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('allowed_file_types', 'jpg,jpeg,png,gif,pdf,doc,docx', 'Allowed file extensions')
ON CONFLICT (key) DO NOTHING;

-- Create admin profile (password will need to be set separately)
INSERT INTO profiles (id, email, username, full_name, role, metadata) VALUES
(gen_random_uuid(), 'admin@brandonhancock.dev', 'admin', 'System Administrator', 'admin', 
jsonb_build_object(
  'bio', 'System administrator account',
  'location', 'System',
  'website', 'https://brandonhancock.dev'
))
ON CONFLICT (email) DO NOTHING;

-- Insert sample skills
INSERT INTO skills (name, category, proficiency_level, years_experience, description) VALUES
('JavaScript', 'Programming Languages', 'expert', 8, 'Modern JavaScript ES6+, Node.js, frameworks'),
('Python', 'Programming Languages', 'advanced', 6, 'Web development, data analysis, automation'),
('React', 'Frontend Frameworks', 'expert', 5, 'Modern React with hooks, context, performance optimization'),
('Vue.js', 'Frontend Frameworks', 'intermediate', 3, 'Vue 3 with Composition API'),
('Node.js', 'Backend Technologies', 'advanced', 6, 'Server-side JavaScript, API development'),
('PostgreSQL', 'Databases', 'advanced', 4, 'Relational database design and optimization'),
('MongoDB', 'Databases', 'intermediate', 3, 'NoSQL document database'),
('Docker', 'DevOps', 'intermediate', 3, 'Containerization and deployment'),
('AWS', 'Cloud Platforms', 'intermediate', 2, 'EC2, S3, Lambda, RDS'),
('Git', 'Development Tools', 'expert', 8, 'Version control, branching strategies'),
('Spanish', 'Languages', 'native', 25, 'Native speaker - teaching and communication'),
('English', 'Languages', 'native', 35, 'Native speaker - technical writing'),
('Language Teaching', 'Education', 'expert', 10, 'Second language acquisition, curriculum design'),
('Project Management', 'Soft Skills', 'advanced', 8, 'Agile methodologies, team leadership'),
('Technical Writing', 'Communication', 'advanced', 6, 'Documentation, tutorials, technical content')
ON CONFLICT (name) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (
  title, slug, description, long_description, status, featured,
  start_date, end_date, technologies, category, github_url, demo_url,
  images, metrics, highlights
) VALUES
(
  'Universal API System',
  'universal-api-system',
  'A comprehensive API client system with intelligent environment detection and offline support',
  'This project demonstrates advanced API architecture with intelligent environment detection, retry logic with exponential backoff, comprehensive error handling, and seamless offline functionality using service workers. It includes monitoring, caching, and graceful degradation to ensure users never see connection errors.',
  'completed',
  true,
  '2024-01-01',
  '2024-01-15',
  ARRAY['JavaScript', 'Service Workers', 'PWA', 'API Design'],
  'Web Development',
  'https://github.com/username/universal-api-system',
  'https://portfolio-demo.netlify.app',
  jsonb_build_object(
    'thumbnail', '/images/projects/api-system-thumb.jpg',
    'gallery', ARRAY['/images/projects/api-system-1.jpg', '/images/projects/api-system-2.jpg']
  ),
  jsonb_build_object(
    'github_stars', 45,
    'forks', 12,
    'downloads', 1200
  ),
  ARRAY['Zero connection errors for users', 'Automatic environment detection', 'Offline-first architecture', 'Real-time monitoring dashboard']
),
(
  'Multilingual Portfolio Site',
  'multilingual-portfolio-site',
  'A responsive portfolio website built with Hugo, featuring dark mode and multiple languages',
  'A sophisticated portfolio site built with Hugo static site generator, featuring internationalization, dark/light mode switching, responsive design, and modern CSS techniques. Includes automated deployment and performance optimization.',
  'completed',
  true,
  '2023-12-15',
  '2024-01-10',
  ARRAY['Hugo', 'HTML5', 'CSS3', 'JavaScript', 'Netlify'],
  'Web Development',
  'https://github.com/username/portfolio-site',
  'https://portfolio.netlify.app',
  jsonb_build_object(
    'thumbnail', '/images/projects/portfolio-thumb.jpg',
    'gallery', ARRAY['/images/projects/portfolio-1.jpg', '/images/projects/portfolio-2.jpg']
  ),
  jsonb_build_object(
    'performance_score', 98,
    'accessibility_score', 100,
    'seo_score', 95
  ),
  ARRAY['Perfect accessibility score', 'Sub-second loading times', 'Multiple language support', 'Modern design system']
),
(
  'Language Learning Platform',
  'language-learning-platform',
  'AI-powered language learning platform with personalized curriculum',
  'A comprehensive language learning platform that uses AI to create personalized learning paths, track progress, and provide real-time feedback. Features include speech recognition, spaced repetition algorithms, gamification elements, and social learning components.',
  'in_progress',
  true,
  '2024-02-01',
  NULL,
  ARRAY['React', 'Node.js', 'PostgreSQL', 'AI/ML', 'WebRTC'],
  'Education Technology',
  'https://github.com/username/language-platform',
  NULL,
  jsonb_build_object(
    'thumbnail', '/images/projects/language-platform-thumb.jpg',
    'gallery', ARRAY['/images/projects/language-platform-1.jpg']
  ),
  jsonb_build_object(
    'beta_users', 150,
    'completion_rate', 78
  ),
  ARRAY['AI-powered personalization', 'Real-time speech analysis', 'Gamified learning experience', 'Progress tracking']
)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample blog posts
INSERT INTO blog_posts (
  title, slug, excerpt, content, status, featured,
  published_at, author_id, category, tags, reading_time,
  seo_title, seo_description
) VALUES
(
  'Building Universal API Systems',
  'building-universal-api-systems',
  'Learn how to create API systems that work seamlessly across all environments with intelligent fallbacks and error handling.',
  '# Building Universal API Systems

In modern web development, creating robust API systems that work across different environments is crucial for user experience...

## Key Principles

1. **Environment Detection**: Automatically detect the current environment
2. **Graceful Fallbacks**: Provide fallback mechanisms when APIs fail
3. **Error Handling**: Implement comprehensive error handling
4. **Offline Support**: Use service workers for offline functionality

## Implementation

```javascript
class UniversalAPI {
  constructor(config) {
    this.config = config;
    this.detectEnvironment();
  }
  
  detectEnvironment() {
    // Environment detection logic
  }
}
```

This approach ensures that users never encounter broken functionality due to API failures.',
  'published',
  true,
  '2024-01-15 10:00:00',
  (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),
  'Development',
  ARRAY['API', 'JavaScript', 'Architecture'],
  8,
  'Building Universal API Systems - Complete Guide',
  'Learn how to create robust API systems with intelligent fallbacks, error handling, and offline support for better user experience.'
),
(
  'The Future of Language Learning Technology',
  'future-language-learning-technology',
  'Exploring how AI and immersive technologies are revolutionizing language education.',
  '# The Future of Language Learning Technology

Language learning is being transformed by emerging technologies that make learning more personalized, engaging, and effective...

## Emerging Technologies

### Artificial Intelligence
AI is personalizing learning experiences by:
- Adapting to individual learning styles
- Providing real-time feedback
- Creating personalized content

### Virtual Reality
VR creates immersive environments for:
- Cultural immersion
- Real-world practice scenarios
- Confidence building

## The Path Forward

The future of language learning lies in combining these technologies to create holistic learning experiences that adapt to each learner''s needs.',
  'published',
  true,
  '2024-01-20 14:30:00',
  (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),
  'Education Technology',
  ARRAY['AI', 'VR', 'Education', 'Language Learning'],
  12,
  'The Future of Language Learning Technology - AI and VR',
  'Discover how artificial intelligence and virtual reality are revolutionizing language education with personalized and immersive experiences.'
)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample contact messages (for demo purposes)
INSERT INTO contact_messages (
  name, email, subject, message, status, 
  ip_address, user_agent, metadata
) VALUES
(
  'John Developer',
  'john@example.com',
  'Collaboration Opportunity',
  'Hi Brandon, I came across your portfolio and I''m impressed by your work on the Universal API System. I''d love to discuss a potential collaboration opportunity.',
  'unread',
  '192.168.1.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  jsonb_build_object(
    'source', 'portfolio_contact_form',
    'referrer', 'https://google.com'
  )
),
(
  'Sarah Martinez',
  'sarah.martinez@university.edu',
  'Speaking Opportunity',
  'Hello! I''m organizing a conference on EdTech innovations and would love to have you as a speaker to discuss your language learning platform work.',
  'unread',
  '192.168.1.2',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  jsonb_build_object(
    'source', 'portfolio_contact_form',
    'conference', 'EdTech Innovations 2024'
  )
)
ON CONFLICT DO NOTHING;

-- Insert sample analytics events
INSERT INTO analytics_events (
  event_type, page_path, user_agent, ip_address, 
  session_id, metadata
) VALUES
('page_view', '/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '192.168.1.1', 
 gen_random_uuid(), 
 jsonb_build_object('referrer', 'https://google.com', 'language', 'en')
),
('page_view', '/projects', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '192.168.1.2',
 gen_random_uuid(),
 jsonb_build_object('referrer', 'direct', 'language', 'en')
),
('contact_form_submit', '/contact', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15', '192.168.1.3',
 gen_random_uuid(),
 jsonb_build_object('form_type', 'contact', 'success', true)
)
ON CONFLICT DO NOTHING;

-- Insert sample tags
INSERT INTO tags (name, slug, description, category) VALUES
('JavaScript', 'javascript', 'Modern JavaScript development', 'Technology'),
('React', 'react', 'React framework and ecosystem', 'Technology'),
('Education', 'education', 'Educational technology and pedagogy', 'Category'),
('AI', 'ai', 'Artificial Intelligence and Machine Learning', 'Technology'),
('Web Development', 'web-development', 'Frontend and backend web development', 'Category'),
('Language Learning', 'language-learning', 'Second language acquisition and teaching', 'Education'),
('API Design', 'api-design', 'RESTful and GraphQL API design', 'Technology'),
('Performance', 'performance', 'Web performance optimization', 'Technology')
ON CONFLICT (slug) DO NOTHING;

COMMIT;