-- Portfolio Site Database Schema for Supabase
-- Run this migration to set up the complete database structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Contact Messages Table
CREATE TABLE contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    message TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    processed_by UUID,
    notes TEXT
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    long_description TEXT,
    category VARCHAR(100),
    technologies JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'draft', -- draft, in-progress, completed, archived
    featured BOOLEAN DEFAULT FALSE,
    images JSONB DEFAULT '{}', -- {thumbnail: "", gallery: []}
    links JSONB DEFAULT '{}', -- {demo: "", github: "", documentation: ""}
    metrics JSONB DEFAULT '{}', -- {githubStars: 0, forks: 0, downloads: 0}
    start_date DATE,
    completed_date DATE,
    expected_completion DATE,
    highlights JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Blog Posts Table
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    featured BOOLEAN DEFAULT FALSE,
    meta_description VARCHAR(500),
    featured_image VARCHAR(500),
    reading_time INTEGER, -- in minutes
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Skills Table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    description TEXT,
    icon VARCHAR(255),
    years_experience DECIMAL(3,1),
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experience Table
CREATE TABLE experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    technologies JSONB DEFAULT '[]',
    achievements JSONB DEFAULT '[]',
    company_url VARCHAR(500),
    company_logo VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Education Table
CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    location VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    gpa DECIMAL(3,2),
    description TEXT,
    achievements JSONB DEFAULT '[]',
    institution_url VARCHAR(500),
    institution_logo VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials Table
CREATE TABLE testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    company VARCHAR(255),
    content TEXT NOT NULL,
    avatar VARCHAR(500),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    featured BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Assets Table (for file uploads)
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    public_url VARCHAR(500),
    alt_text VARCHAR(500),
    caption TEXT,
    metadata JSONB DEFAULT '{}',
    folder VARCHAR(255),
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Skills Junction Table
CREATE TABLE project_skills (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, skill_id)
);

-- Categories Table (for organizing content)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color code
    icon VARCHAR(255),
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags Table (for flexible tagging)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color code
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Tags Junction Table
CREATE TABLE content_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- 'project', 'blog_post', etc.
    content_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Table (for tracking views, etc.)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL, -- 'page_view', 'contact_form', 'download', etc.
    content_type VARCHAR(50), -- 'project', 'blog_post', 'page'
    content_id UUID,
    user_id UUID,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_contact_messages_submitted_at ON contact_messages(submitted_at DESC);
CREATE INDEX idx_contact_messages_processed ON contact_messages(processed);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_featured ON projects(featured);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_featured ON blog_posts(featured);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_featured ON skills(featured);

CREATE INDEX idx_experiences_current ON experiences(is_current);
CREATE INDEX idx_experiences_start_date ON experiences(start_date DESC);

CREATE INDEX idx_education_current ON education(is_current);
CREATE INDEX idx_education_start_date ON education(start_date DESC);

CREATE INDEX idx_testimonials_featured ON testimonials(featured);
CREATE INDEX idx_testimonials_approved ON testimonials(approved);

CREATE INDEX idx_media_assets_folder ON media_assets(folder);
CREATE INDEX idx_media_assets_mime_type ON media_assets(mime_type);

CREATE INDEX idx_content_tags_content ON content_tags(content_type, content_id);
CREATE INDEX idx_content_tags_tag ON content_tags(tag_id);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_content ON analytics_events(content_type, content_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_education_updated_at BEFORE UPDATE ON education
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON media_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Policies
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Public read access for published content
CREATE POLICY "Public read access for published projects" ON projects
    FOR SELECT USING (status = 'completed' OR status = 'in-progress');

CREATE POLICY "Public read access for published blog posts" ON blog_posts
    FOR SELECT USING (status = 'published');

CREATE POLICY "Public read access for skills" ON skills
    FOR SELECT USING (true);

CREATE POLICY "Public read access for experiences" ON experiences
    FOR SELECT USING (true);

CREATE POLICY "Public read access for education" ON education
    FOR SELECT USING (true);

CREATE POLICY "Public read access for approved testimonials" ON testimonials
    FOR SELECT USING (approved = true);

CREATE POLICY "Public read access for categories" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Public read access for tags" ON tags
    FOR SELECT USING (true);

CREATE POLICY "Public read access for content tags" ON content_tags
    FOR SELECT USING (true);

-- Contact messages - only allow insert from public, full access for authenticated users
CREATE POLICY "Allow public contact form submissions" ON contact_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Full access for authenticated users on contact messages" ON contact_messages
    USING (auth.role() = 'authenticated');

-- Media assets - public read for public URLs
CREATE POLICY "Public read access for media assets" ON media_assets
    FOR SELECT USING (public_url IS NOT NULL);

-- Analytics - allow public inserts, authenticated reads
CREATE POLICY "Allow public analytics events" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated read access for analytics" ON analytics_events
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert sample data
INSERT INTO categories (name, slug, description, color) VALUES
    ('Web Development', 'web-development', 'Modern web applications and sites', '#3B82F6'),
    ('Mobile Development', 'mobile-development', 'iOS and Android applications', '#10B981'),
    ('Full Stack', 'full-stack', 'End-to-end application development', '#8B5CF6'),
    ('AI Technology', 'ai-technology', 'Artificial Intelligence and Machine Learning', '#F59E0B'),
    ('Design', 'design', 'UI/UX and Visual Design', '#EF4444');

INSERT INTO tags (name, slug, description) VALUES
    ('React', 'react', 'React.js framework'),
    ('JavaScript', 'javascript', 'JavaScript programming language'),
    ('Node.js', 'nodejs', 'Node.js runtime'),
    ('TypeScript', 'typescript', 'TypeScript programming language'),
    ('Python', 'python', 'Python programming language'),
    ('Supabase', 'supabase', 'Supabase backend platform'),
    ('PostgreSQL', 'postgresql', 'PostgreSQL database'),
    ('Netlify', 'netlify', 'Netlify platform'),
    ('Hugo', 'hugo', 'Hugo static site generator'),
    ('API Design', 'api-design', 'API architecture and design');

INSERT INTO skills (name, category, proficiency_level, description, featured) VALUES
    ('React', 'Frontend', 5, 'Expert in React ecosystem including hooks, context, and modern patterns', true),
    ('JavaScript', 'Programming', 5, 'Advanced JavaScript including ES6+, async/await, and modern features', true),
    ('Node.js', 'Backend', 4, 'Server-side JavaScript development with Express and frameworks', true),
    ('PostgreSQL', 'Database', 4, 'Advanced SQL, query optimization, and database design', true),
    ('TypeScript', 'Programming', 4, 'Strong typing for scalable applications', false),
    ('Supabase', 'Backend', 4, 'Full-stack development with Supabase platform', false),
    ('Hugo', 'Static Site', 4, 'Static site generation with Hugo framework', false),
    ('API Design', 'Architecture', 5, 'RESTful and GraphQL API design and implementation', true);

-- Comment explaining the schema
COMMENT ON DATABASE postgres IS 'Portfolio Site Database - Contains all tables for managing portfolio content, blog posts, projects, contact messages, and analytics';
COMMENT ON TABLE contact_messages IS 'Stores contact form submissions from website visitors';
COMMENT ON TABLE projects IS 'Portfolio projects with detailed information, images, and links';
COMMENT ON TABLE blog_posts IS 'Blog articles with full content management features';
COMMENT ON TABLE skills IS 'Technical and professional skills with proficiency levels';
COMMENT ON TABLE experiences IS 'Professional work experience and positions';
COMMENT ON TABLE education IS 'Educational background and qualifications';
COMMENT ON TABLE testimonials IS 'Client and colleague testimonials and reviews';
COMMENT ON TABLE media_assets IS 'Uploaded files and images with metadata';
COMMENT ON TABLE analytics_events IS 'Website analytics and user interaction tracking';