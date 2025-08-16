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

const app = express();
const PORT = process.env.PORT || 3335;

// Import content API routes
const contentApiRoutes = require('./routes/content-api');

// Simple in-memory user store (in production, use a database)
const users = {
  admin: {
    username: 'admin',
    email: 'admin@portfolio.com',
    password: '$2a$10$afmPk0ks7cRHrNgSv/lf7Oor8EwILf7iOCmNjmd6X7CK3sRbjxp82', // password123
    role: 'admin'
  }
};

const JWT_SECRET = process.env.JWT_SECRET || 'portfolio-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

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
        console.log(`Directory ${dirPath} not found, skipping...`);
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

// Contact form handler
app.post('/api/portfolio/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  // Validate input
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
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

// Mount content management API routes
app.use('/api/editor', contentApiRoutes);

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
        console.log(`Directory ${dir.path} not found, skipping...`);
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

// Serve Hugo site for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Simplified portfolio backend running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  - GET  /api/health`);
  console.log(`  - POST /api/auth/login`);
  console.log(`  - GET  /api/auth/me`);
  console.log(`  - POST /api/auth/logout`);
  console.log(`  - GET  /api/dashboard/stats (protected)`);
  console.log(`  - GET  /api/portfolio/projects`);
  console.log(`  - GET  /api/portfolio/skills`);
  console.log(`  - POST /api/portfolio/contact`);
  console.log(`  - GET  /api/blog/recent`);
  console.log(`\nAdmin login: admin / password123`);
});