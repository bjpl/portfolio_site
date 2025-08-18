// Simplified Portfolio Backend Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const matter = require('gray-matter');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Initialize logger first
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Import API routes (if available)
let contentApiRoutes;
try {
  contentApiRoutes = require('./routes/content-api');
} catch (e) {
  logger.info('Content API routes not found, using built-in routes');
}

let filesApiRoutes;
try {
  filesApiRoutes = require('./routes/files-api');
  logger.info('Files API routes loaded');
} catch (e) {
  logger.warn('Files API routes not found');
}

let imagesApiRoutes;
try {
  imagesApiRoutes = require('./routes/images-api');
  logger.info('Images API routes loaded');
} catch (e) {
  logger.warn('Images API routes not found');
}

let buildDeployApiRoutes;
try {
  buildDeployApiRoutes = require('./routes/build-deploy-api');
  logger.info('Build/Deploy API routes loaded');
} catch (e) {
  logger.warn('Build/Deploy API routes not found');
}

// Simple in-memory user store (in production, use a database)
const users = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@portfolio.com',
    password: process.env.ADMIN_PASSWORD_HASH || '$2a$10$afmPk0ks7cRHrNgSv/lf7Oor8EwILf7iOCmNjmd6X7CK3sRbjxp82', // Default hash - MUST CHANGE IN PRODUCTION
    role: 'admin'
  }
};

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'portfolio-secret-key-change-in-production';
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/admin', express.static(path.join(__dirname, '../../static/admin')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Auth endpoints for admin panel
app.post('/api/auth/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;
  
  // Find user by username or email
  const user = Object.values(users).find(u => 
    u.username === emailOrUsername || u.email === emailOrUsername
  );
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Check password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate tokens
  const accessToken = jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  const refreshToken = jwt.sign(
    { username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({
    accessToken,
    refreshToken,
    user: {
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users[decoded.username];
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  // In a real app, you might blacklist the token here
  res.json({ success: true });
});

// Get portfolio projects
app.get('/api/portfolio/projects', async (req, res) => {
  try {
    const contentDir = path.join(__dirname, '../../content/make');
    const projects = [];
    
    // Read all subdirectories in make
    const subdirs = ['sounds', 'visuals', 'words'];
    
    for (const subdir of subdirs) {
      const dirPath = path.join(contentDir, subdir);
      try {
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          if (file.endsWith('.md') && !file.startsWith('_')) {
            const filePath = path.join(dirPath, file);
            const content = await fs.readFile(filePath, 'utf8');
            const { data, content: body } = matter(content);
            
            if (!data.draft) {
              projects.push({
                title: data.title || file.replace('.md', ''),
                description: data.description || body.substring(0, 150) + '...',
                slug: file.replace('.md', ''),
                category: subdir,
                technologies: data.tags || [],
                featured: data.featured || false,
                image: data.image || null,
                date: data.date || null
              });
            }
          }
        }
      } catch (err) {
        logger.warn(`Directory ${dirPath} not found, skipping...`);
      }
    }
    
    // Sort by featured first, then by date
    projects.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.date) - new Date(a.date);
    });
    
    // Apply featured filter if requested
    if (req.query.featured === 'true') {
      const featured = projects.filter(p => p.featured).slice(0, 3);
      return res.json({ projects: featured });
    }
    
    res.json({ projects });
  } catch (error) {
    console.error('Error loading projects:', error);
    res.json({ projects: [] });
  }
});

// Get skills (static for now)
app.get('/api/portfolio/skills', (req, res) => {
  res.json({
    skills: [
      { name: 'HTML/CSS', category: 'Frontend', level: 95 },
      { name: 'JavaScript', category: 'Frontend', level: 90 },
      { name: 'React', category: 'Frontend', level: 85 },
      { name: 'Vue.js', category: 'Frontend', level: 75 },
      { name: 'Node.js', category: 'Backend', level: 85 },
      { name: 'Express', category: 'Backend', level: 90 },
      { name: 'MongoDB', category: 'Backend', level: 70 },
      { name: 'PostgreSQL', category: 'Backend', level: 75 },
      { name: 'Adobe Creative Suite', category: 'Design', level: 80 },
      { name: 'Figma', category: 'Design', level: 85 },
      { name: 'Audio Production', category: 'Audio', level: 90 },
      { name: 'Sound Design', category: 'Audio', level: 85 },
      { name: 'Docker', category: 'DevOps', level: 70 },
      { name: 'Git', category: 'DevOps', level: 95 },
      { name: 'CI/CD', category: 'DevOps', level: 75 },
      { name: 'AWS', category: 'DevOps', level: 65 }
    ]
  });
});

// Rate limiting for contact form
const contactRateLimit = {};
const CONTACT_LIMIT = 3; // 3 submissions per hour per IP
const CONTACT_WINDOW = 60 * 60 * 1000; // 1 hour

// Contact form handler with spam protection
app.post('/api/portfolio/contact', async (req, res) => {
  const { name, email, subject, message, honeypot } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Honeypot spam protection
  if (honeypot) {
    return res.status(400).json({ error: 'Invalid submission' });
  }
  
  // Rate limiting
  const now = Date.now();
  if (!contactRateLimit[clientIP]) {
    contactRateLimit[clientIP] = [];
  }
  
  // Clean old submissions
  contactRateLimit[clientIP] = contactRateLimit[clientIP].filter(
    time => now - time < CONTACT_WINDOW
  );
  
  if (contactRateLimit[clientIP].length >= CONTACT_LIMIT) {
    return res.status(429).json({ 
      error: 'Too many contact submissions. Please try again later.' 
    });
  }
  
  // Validate input
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  
  // Content length validation
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
  }
  
  // Record submission
  contactRateLimit[clientIP].push(now);
  
  // Save to file for now (in production, use email service)
  const contactDir = path.join(__dirname, '../data/contacts');
  try {
    await fs.mkdir(contactDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `contact-${timestamp}.json`;
    
    await fs.writeFile(
      path.join(contactDir, filename),
      JSON.stringify({ name, email, subject, message, timestamp }, null, 2)
    );
    
    // In production, send email notification
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@portfolio.com',
          to: process.env.CONTACT_EMAIL || 'admin@portfolio.com',
          subject: `Portfolio Contact: ${subject}`,
          text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ success: true, message: 'Message received successfully' });
  } catch (error) {
    console.error('Error saving contact:', error);
    res.status(500).json({ error: 'Failed to process contact form' });
  }
});

// Mount files API routes if available
if (filesApiRoutes) {
  app.use('/api/files', filesApiRoutes);
}

// Mount images API routes if available
if (imagesApiRoutes) {
  app.use('/api/images', imagesApiRoutes);
}

// Mount build/deploy API routes if available
if (buildDeployApiRoutes) {
  app.use('/api/build', buildDeployApiRoutes);
}

// Dashboard stats endpoint (protected)
app.get('/api/dashboard/stats', async (req, res) => {
  // Simple auth check
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Get content stats
  const stats = {
    content: {
      total: 0,
      drafts: 0,
      published: 0
    },
    projects: 0,
    messages: 0,
    lastUpdate: new Date().toISOString()
  };
  
  // Count content files
  try {
    const contentDirs = ['make', 'learn', 'think', 'meet'];
    for (const dir of contentDirs) {
      const dirPath = path.join(__dirname, '../../content', dir);
      try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
          if (file.isDirectory()) {
            const subFiles = await fs.readdir(path.join(dirPath, file.name));
            stats.content.total += subFiles.filter(f => f.endsWith('.md')).length;
          }
        }
      } catch (err) {
        // Directory doesn't exist
      }
    }
    stats.content.published = stats.content.total; // Simplified - all are published
    
    // Count projects
    const makeDir = path.join(__dirname, '../../content/make');
    const subdirs = ['sounds', 'visuals', 'words'];
    for (const subdir of subdirs) {
      try {
        const files = await fs.readdir(path.join(makeDir, subdir));
        stats.projects += files.filter(f => f.endsWith('.md') && !f.startsWith('_')).length;
      } catch (err) {
        // Directory doesn't exist
      }
    }
    
    // Count contact messages
    const contactsDir = path.join(__dirname, '../data/contacts');
    try {
      const messages = await fs.readdir(contactsDir);
      stats.messages = messages.filter(f => f.endsWith('.json')).length;
    } catch (err) {
      // No messages yet
    }
  } catch (error) {
    console.error('Error getting stats:', error);
  }
  
  res.json(stats);
});

// Mount admin API routes
const adminRoutes = require('./routes/admin-api');
app.use('/api/admin', adminRoutes);

// Mount content management API routes (if available)
if (contentApiRoutes) {
  app.use('/api/editor', contentApiRoutes);
}

// Get recent blog posts
app.get('/api/blog/recent', async (req, res) => {
  try {
    const contentDirs = [
      { path: path.join(__dirname, '../../content/think'), section: 'think' },
      { path: path.join(__dirname, '../../content/learn'), section: 'learn' }
    ];
    
    const posts = [];
    
    for (const dir of contentDirs) {
      try {
        const subdirs = await fs.readdir(dir.path);
        
        for (const subdir of subdirs) {
          const subdirPath = path.join(dir.path, subdir);
          const stat = await fs.stat(subdirPath);
          
          if (stat.isDirectory()) {
            const files = await fs.readdir(subdirPath);
            
            for (const file of files) {
              if (file.endsWith('.md') && !file.startsWith('_')) {
                const filePath = path.join(subdirPath, file);
                const content = await fs.readFile(filePath, 'utf8');
                const { data } = matter(content);
                
                if (!data.draft) {
                  posts.push({
                    title: data.title || file.replace('.md', ''),
                    description: data.description || '',
                    slug: `/${dir.section}/${file.replace('.md', '')}/`,
                    date: data.date || null,
                    section: dir.section
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        logger.warn(`Directory ${dir.path} not found, skipping...`);
      }
    }
    
    // Sort by date and return most recent
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ posts: posts.slice(0, 5) });
  } catch (error) {
    console.error('Error loading blog posts:', error);
    res.json({ posts: [] });
  }
});

// Content Management API Endpoints
const multer = require('multer');
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Get all content
app.get('/api/content', async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const contentDirs = type ? [type] : ['make', 'learn', 'think', 'meet'];
    const allContent = [];
    
    for (const dir of contentDirs) {
      const dirPath = path.join(__dirname, '../../content', dir);
      try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const file of files) {
          if (file.isFile() && file.name.endsWith('.md')) {
            const filePath = path.join(dirPath, file.name);
            const content = await fs.readFile(filePath, 'utf8');
            const { data, content: body } = matter(content);
            
            // Apply filters
            if (status && data.status !== status) continue;
            if (search && !body.toLowerCase().includes(search.toLowerCase()) && 
                !data.title?.toLowerCase().includes(search.toLowerCase())) continue;
            
            allContent.push({
              id: `${dir}/${file.name}`,
              type: dir,
              title: data.title || file.name.replace('.md', ''),
              status: data.draft ? 'draft' : 'published',
              date: data.date || new Date().toISOString(),
              author: data.author || 'Admin',
              description: data.description || body.substring(0, 150),
              tags: data.tags || [],
              path: `${dir}/${file.name}`
            });
          }
        }
      } catch (e) {
        logger.warn(`Directory ${dir} not found`);
      }
    }
    
    res.json(allContent);
  } catch (error) {
    console.error('Error loading content:', error);
    res.status(500).json({ error: 'Failed to load content' });
  }
});

// Get single content item
app.get('/api/content/:type/:slug', async (req, res) => {
  try {
    const { type, slug } = req.params;
    const filePath = path.join(__dirname, '../../content', type, `${slug}.md`);
    
    const content = await fs.readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    
    res.json({
      ...data,
      content: body,
      type,
      slug
    });
  } catch (error) {
    res.status(404).json({ error: 'Content not found' });
  }
});

// Create new content
app.post('/api/content', async (req, res) => {
  try {
    const { type, title, content, ...metadata } = req.body;
    
    // Generate slug from title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filename = `${slug}.md`;
    const dirPath = path.join(__dirname, '../../content', type);
    const filePath = path.join(dirPath, filename);
    
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    
    // Create frontmatter
    const frontmatter = {
      title,
      date: new Date().toISOString(),
      draft: true,
      ...metadata
    };
    
    // Create markdown file
    const fileContent = matter.stringify(content || '', frontmatter);
    await fs.writeFile(filePath, fileContent);
    
    res.json({
      success: true,
      path: `${type}/${filename}`,
      slug
    });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Update content
app.put('/api/content/:type/:slug', async (req, res) => {
  try {
    const { type, slug } = req.params;
    const { content, ...metadata } = req.body;
    const filePath = path.join(__dirname, '../../content', type, `${slug}.md`);
    
    // Read existing file
    const existingContent = await fs.readFile(filePath, 'utf8');
    const { data: existingData } = matter(existingContent);
    
    // Merge metadata
    const updatedMetadata = {
      ...existingData,
      ...metadata,
      lastModified: new Date().toISOString()
    };
    
    // Create updated file
    const fileContent = matter.stringify(content || '', updatedMetadata);
    await fs.writeFile(filePath, fileContent);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Delete content
app.delete('/api/content/:type/:slug', async (req, res) => {
  try {
    const { type, slug } = req.params;
    const filePath = path.join(__dirname, '../../content', type, `${slug}.md`);
    
    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// Upload media
app.post('/api/media/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { filename, mimetype, size } = req.file;
    const ext = path.extname(req.file.originalname);
    const newFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const targetPath = path.join(__dirname, '../../static/uploads', newFilename);
    
    // Ensure uploads directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    
    // Move file to static directory
    await fs.rename(req.file.path, targetPath);
    
    res.json({
      success: true,
      url: `/uploads/${newFilename}`,
      filename: newFilename,
      originalName: req.file.originalname,
      size,
      type: mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get media library
app.get('/api/media', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../static/uploads');
    const files = [];
    
    try {
      const dirFiles = await fs.readdir(uploadsDir);
      for (const file of dirFiles) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        files.push({
          name: file,
          url: `/uploads/${file}`,
          size: stats.size,
          modified: stats.mtime
        });
      }
    } catch (e) {
      // Uploads directory might not exist yet
    }
    
    res.json(files);
  } catch (error) {
    console.error('Error loading media:', error);
    res.status(500).json({ error: 'Failed to load media' });
  }
});

// Content templates
app.get('/api/templates', (req, res) => {
  const templates = [
    {
      id: 'blog-post',
      name: 'Blog Post',
      description: 'Standard blog post template',
      frontmatter: {
        title: '',
        date: new Date().toISOString(),
        author: 'Admin',
        tags: [],
        draft: true
      },
      content: '# Introduction\n\n## Main Content\n\n## Conclusion'
    },
    {
      id: 'project',
      name: 'Project',
      description: 'Portfolio project template',
      frontmatter: {
        title: '',
        description: '',
        date: new Date().toISOString(),
        technologies: [],
        featured: false,
        github: '',
        demo: '',
        image: ''
      },
      content: '# Project Overview\n\n## Features\n\n## Technical Details\n\n## Results'
    },
    {
      id: 'tutorial',
      name: 'Tutorial',
      description: 'Step-by-step tutorial template',
      frontmatter: {
        title: '',
        description: '',
        date: new Date().toISOString(),
        difficulty: 'beginner',
        duration: '10 minutes',
        tags: []
      },
      content: '# Tutorial: [Title]\n\n## Prerequisites\n\n## Step 1\n\n## Step 2\n\n## Conclusion'
    }
  ];
  
  res.json(templates);
});

// Content analytics
app.get('/api/analytics/content', async (req, res) => {
  try {
    // In a real app, this would pull from analytics service
    const analytics = {
      totalViews: 15234,
      uniqueVisitors: 3456,
      avgTimeOnPage: 245, // seconds
      topContent: [
        { title: 'React Hooks Guide', views: 2341 },
        { title: 'Node.js Best Practices', views: 1876 },
        { title: 'CSS Grid Tutorial', views: 1543 }
      ],
      recentActivity: [
        { action: 'published', content: 'New Blog Post', time: '2 hours ago' },
        { action: 'edited', content: 'Portfolio Project', time: '5 hours ago' },
        { action: 'created', content: 'Draft Post', time: '1 day ago' }
      ]
    };
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// SEO analysis
app.post('/api/seo/analyze', async (req, res) => {
  try {
    const { content, title, description, keywords } = req.body;
    
    // Simple SEO analysis
    const analysis = {
      score: 85,
      issues: [],
      suggestions: []
    };
    
    // Check title length
    if (!title) {
      analysis.issues.push('Missing title tag');
      analysis.score -= 20;
    } else if (title.length > 60) {
      analysis.suggestions.push('Title is too long (>60 characters)');
      analysis.score -= 5;
    } else if (title.length < 30) {
      analysis.suggestions.push('Title might be too short (<30 characters)');
      analysis.score -= 3;
    }
    
    // Check description
    if (!description) {
      analysis.issues.push('Missing meta description');
      analysis.score -= 15;
    } else if (description.length > 160) {
      analysis.suggestions.push('Description is too long (>160 characters)');
      analysis.score -= 5;
    }
    
    // Check keywords
    if (keywords && keywords.length > 0) {
      const keywordDensity = {};
      const words = content.toLowerCase().split(/\s+/);
      
      keywords.forEach(keyword => {
        const count = words.filter(w => w.includes(keyword.toLowerCase())).length;
        const density = (count / words.length) * 100;
        keywordDensity[keyword] = density.toFixed(2);
        
        if (density < 0.5) {
          analysis.suggestions.push(`Keyword "${keyword}" density is low (${density.toFixed(2)}%)`);
        } else if (density > 3) {
          analysis.issues.push(`Keyword "${keyword}" might be over-optimized (${density.toFixed(2)}%)`);
          analysis.score -= 5;
        }
      });
      
      analysis.keywordDensity = keywordDensity;
    }
    
    // Check content length
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 300) {
      analysis.suggestions.push('Content might be too short (<300 words)');
      analysis.score -= 10;
    }
    
    analysis.wordCount = wordCount;
    analysis.score = Math.max(0, analysis.score);
    
    res.json(analysis);
  } catch (error) {
    console.error('SEO analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze SEO' });
  }
});

// Serve Hugo site for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

const server = app.listen(PORT, () => {
  logger.info(`Simplified portfolio backend running on port ${PORT}`);
  logger.info(`API endpoints:`);
  logger.info(`  - GET  /api/health`);
  logger.info(`  - POST /api/auth/login`);
  logger.info(`  - GET  /api/auth/me`);
  logger.info(`  - POST /api/auth/logout`);
  logger.info(`  - GET  /api/dashboard/stats (protected)`);
  logger.info(`  - GET  /api/portfolio/projects`);
  logger.info(`  - GET  /api/portfolio/skills`);
  logger.info(`  - POST /api/portfolio/contact`);
  logger.info(`  - GET  /api/blog/recent`);
  logger.info(`  - WS   /ws (WebSocket connection)`);
  logger.info(`Admin login: Check .env file for credentials`);
});

// WebSocket support (optional - won't crash if ws not installed)
try {
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ server, path: '/ws' });
  
  // Track authenticated connections
  const authenticatedClients = new Map();
  
  wss.on('connection', (ws) => {
    logger.info('New WebSocket connection', { module: 'WebSocket' });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle authentication
        if (data.type === 'auth' && data.token) {
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET);
            authenticatedClients.set(ws, decoded);
            ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
            logger.info(`WebSocket authenticated: ${decoded.username}`, { module: 'WebSocket' });
          } catch (error) {
            ws.send(JSON.stringify({ type: 'auth', status: 'failed' }));
          }
        }
        
        // Handle other message types
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      authenticatedClients.delete(ws);
      logger.info('WebSocket connection closed', { module: 'WebSocket' });
    });
    
    // Send initial status
    ws.send(JSON.stringify({ 
      type: 'connected', 
      timestamp: new Date().toISOString() 
    }));
  });
  
  // Broadcast function for real-time updates
  global.broadcast = (data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  logger.info('WebSocket server initialized on /ws', { module: 'WebSocket' });
} catch (error) {
  logger.warn('WebSocket support not available (install ws package for real-time features)', { module: 'WebSocket' });
}