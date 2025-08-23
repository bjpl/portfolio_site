/**
 * Simple CMS Server for Hugo Static Site
 * Direct file editing with Git integration
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Import authentication addon
const { addAuthEndpoints } = require('./auth-addon');

// Root directory for Hugo content
const HUGO_ROOT = path.join(__dirname, '../../');
const CONTENT_DIR = path.join(HUGO_ROOT, 'content');
const STATIC_DIR = path.join(HUGO_ROOT, 'static');
const PUBLIC_DIR = path.join(HUGO_ROOT, 'public');

// Middleware
app.use(cors({
    origin: ['http://localhost:1313', 'http://localhost:3334', 'https://vocal-pony-24e3de.netlify.app'],
    credentials: true
}));
app.use(express.json());
app.use('/admin', express.static(path.join(HUGO_ROOT, 'static/admin')));
app.use('/api/uploads', express.static(path.join(STATIC_DIR, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(STATIC_DIR, 'uploads', new Date().getFullYear().toString());
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.toLowerCase().replace(/\s+/g, '-');
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============= CONTENT MANAGEMENT API =============

// Get all content files
app.get('/api/content', async (req, res) => {
    try {
        const files = await getContentFiles(CONTENT_DIR);
        res.json({ success: true, files });
    } catch (error) {
        console.error('Error getting content files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single content file
app.get('/api/content/*', async (req, res) => {
    try {
        const filePath = path.join(CONTENT_DIR, req.params[0]);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(content);
        
        res.json({
            success: true,
            path: req.params[0],
            frontmatter: parsed.data,
            content: parsed.content
        });
    } catch (error) {
        console.error('Error reading content file:', error);
        res.status(404).json({ success: false, error: 'File not found' });
    }
});

// Save content file
app.post('/api/content/*', async (req, res) => {
    try {
        const filePath = path.join(CONTENT_DIR, req.params[0]);
        const { frontmatter, content } = req.body;
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Create file content with frontmatter
        const fileContent = matter.stringify(content, frontmatter);
        
        // Write file
        await fs.writeFile(filePath, fileContent, 'utf-8');
        
        // Auto-commit to Git
        await gitCommit(`Update content: ${req.params[0]}`);
        
        res.json({ success: true, message: 'Content saved and committed' });
    } catch (error) {
        console.error('Error saving content:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete content file
app.delete('/api/content/*', async (req, res) => {
    try {
        const filePath = path.join(CONTENT_DIR, req.params[0]);
        await fs.unlink(filePath);
        
        // Auto-commit to Git
        await gitCommit(`Delete content: ${req.params[0]}`);
        
        res.json({ success: true, message: 'Content deleted and committed' });
    } catch (error) {
        console.error('Error deleting content:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= IMAGE UPLOAD & OPTIMIZATION =============

// Get uploaded files/media library
app.get('/api/media', async (req, res) => {
    try {
        const uploadsDir = path.join(STATIC_DIR, 'uploads');
        const files = await getMediaFiles(uploadsDir);
        res.json({ success: true, files });
    } catch (error) {
        console.error('Error getting media files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function getMediaFiles(dir) {
    const files = [];
    
    try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                // Recursively get files from subdirectories
                const subFiles = await getMediaFiles(fullPath);
                files.push(...subFiles);
            } else {
                const stat = await fs.stat(fullPath);
                const relativePath = path.relative(STATIC_DIR, fullPath);
                const urlPath = '/' + relativePath.replace(/\\/g, '/');
                
                files.push({
                    name: item.name,
                    path: relativePath,
                    url: urlPath,
                    size: stat.size,
                    modified: stat.mtime,
                    type: path.extname(item.name).toLowerCase()
                });
            }
        }
    } catch (error) {
        // Directory doesn't exist yet
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    
    return files.sort((a, b) => b.modified - a.modified);
}

// Upload and optimize image
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        // Optimize image if it's an image file
        if (req.file.mimetype.startsWith('image/') && req.file.mimetype !== 'image/svg+xml') {
            const optimizedPath = req.file.path.replace(/\.[^.]+$/, '-optimized.webp');
            
            await sharp(req.file.path)
                .resize(1920, 1080, { 
                    fit: 'inside', 
                    withoutEnlargement: true 
                })
                .webp({ quality: 85 })
                .toFile(optimizedPath);
            
            // Return URL path relative to static directory
            const urlPath = '/uploads/' + path.relative(path.join(STATIC_DIR, 'uploads'), optimizedPath);
            
            res.json({
                success: true,
                url: urlPath,
                originalUrl: '/uploads/' + path.relative(path.join(STATIC_DIR, 'uploads'), req.file.path)
            });
        } else {
            // Non-image file, just return the URL
            const urlPath = '/uploads/' + path.relative(path.join(STATIC_DIR, 'uploads'), req.file.path);
            res.json({ success: true, url: urlPath });
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= BUILD & DEPLOY =============

// Build Hugo site
app.post('/api/build', async (req, res) => {
    try {
        const { stdout, stderr } = await execPromise('hugo --minify', { cwd: HUGO_ROOT });
        
        if (stderr && !stderr.includes('WARN')) {
            throw new Error(stderr);
        }
        
        res.json({ 
            success: true, 
            message: 'Site built successfully',
            output: stdout
        });
    } catch (error) {
        console.error('Error building site:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Deploy to Netlify (via Git push)
app.post('/api/deploy', async (req, res) => {
    try {
        // Push to Git (Netlify will auto-deploy)
        await gitPush();
        
        res.json({ 
            success: true, 
            message: 'Changes pushed to Git. Netlify will auto-deploy shortly.'
        });
    } catch (error) {
        console.error('Error deploying:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= ANALYTICS (REAL) =============

// Simple analytics endpoint
app.post('/api/analytics', async (req, res) => {
    try {
        const { type, data } = req.body;
        const logDir = path.join(HUGO_ROOT, 'logs', 'analytics');
        await fs.mkdir(logDir, { recursive: true });
        
        const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.json`);
        
        // Append to daily log file
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            data,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };
        
        let logs = [];
        try {
            const existingLogs = await fs.readFile(logFile, 'utf-8');
            logs = JSON.parse(existingLogs);
        } catch (e) {
            // File doesn't exist yet
        }
        
        logs.push(logEntry);
        await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error logging analytics:', error);
        res.status(500).json({ success: false });
    }
});

// Get analytics data
app.get('/api/analytics/summary', async (req, res) => {
    try {
        const logDir = path.join(HUGO_ROOT, 'logs', 'analytics');
        const files = await fs.readdir(logDir);
        
        let pageViews = 0;
        let uniqueVisitors = new Set();
        let topPages = {};
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const logs = JSON.parse(await fs.readFile(path.join(logDir, file), 'utf-8'));
                
                logs.forEach(log => {
                    if (log.type === 'pageview') {
                        pageViews++;
                        if (log.data.sessionId) {
                            uniqueVisitors.add(log.data.sessionId);
                        }
                        if (log.data.path) {
                            topPages[log.data.path] = (topPages[log.data.path] || 0) + 1;
                        }
                    }
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                pageViews,
                uniqueVisitors: uniqueVisitors.size,
                topPages: Object.entries(topPages)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([path, views]) => ({ path, views }))
            }
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= CONTACT FORM =============

// Handle contact form submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        // Validate input
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }
        
        // Save to file
        const contactsDir = path.join(HUGO_ROOT, 'data', 'contacts');
        await fs.mkdir(contactsDir, { recursive: true });
        
        const contactData = {
            name,
            email,
            message,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };
        
        const contactFile = path.join(contactsDir, `${Date.now()}-${email.replace('@', '-at-')}.json`);
        await fs.writeFile(contactFile, JSON.stringify(contactData, null, 2));
        
        // Send email notification (if configured)
        try {
            await sendContactNotification(contactData);
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError.message);
            // Don't fail the request if email fails
        }
        
        console.log('New contact form submission:', { name, email });
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error handling contact form:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Email notification function
async function sendContactNotification(contactData) {
    const emailConfig = {
        to: process.env.CONTACT_EMAIL || 'brandon.lambert87@gmail.com',
        from: process.env.FROM_EMAIL || 'noreply@portfolio.com',
        subject: `Portfolio Contact: ${contactData.name}`,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${contactData.name}</p>
            <p><strong>Email:</strong> ${contactData.email}</p>
            <p><strong>Message:</strong></p>
            <p>${contactData.message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>Submitted: ${contactData.timestamp}</small></p>
        `
    };
    
    // For local development, just log the email
    if (process.env.NODE_ENV === 'development') {
        console.log('\n📧 EMAIL WOULD BE SENT:');
        console.log(`To: ${emailConfig.to}`);
        console.log(`Subject: ${emailConfig.subject}`);
        console.log(`Message: ${contactData.message}`);
        console.log('---\n');
        return;
    }
    
    // In production, use a service like SendGrid, AWS SES, or similar
    // For now, just log to indicate where email integration would go
    console.log('Email notification ready for production integration');
}

// ============= GIT INTEGRATION =============

async function gitCommit(message) {
    try {
        await execPromise('git add -A', { cwd: HUGO_ROOT });
        await execPromise(`git commit -m "${message}"`, { cwd: HUGO_ROOT });
        console.log(`Git commit: ${message}`);
    } catch (error) {
        if (error.message.includes('nothing to commit')) {
            console.log('No changes to commit');
        } else {
            console.error('Git commit error:', error.message);
        }
    }
}

async function gitPush() {
    const { stdout, stderr } = await execPromise('git push origin main', { cwd: HUGO_ROOT });
    console.log('Git push completed:', stdout);
    if (stderr) console.error('Git push stderr:', stderr);
}

// ============= HELPER FUNCTIONS =============

async function getContentFiles(dir, baseDir = dir) {
    const files = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...await getContentFiles(fullPath, baseDir));
        } else if (item.endsWith('.md') || item.endsWith('.markdown')) {
            const relativePath = path.relative(baseDir, fullPath);
            const content = await fs.readFile(fullPath, 'utf-8');
            const parsed = matter(content);
            
            files.push({
                path: relativePath.replace(/\\/g, '/'),
                title: parsed.data.title || item,
                date: parsed.data.date,
                draft: parsed.data.draft || false,
                type: relativePath.split('/')[0] || 'page'
            });
        }
    }
    
    return files;
}

// ============= SERVER START =============

// Add authentication endpoints
addAuthEndpoints(app);

app.listen(PORT, () => {
    console.log(`
    ========================================
    Simple CMS Server for Hugo
    ========================================
    Server running on port ${PORT}
    Admin panel: http://localhost:${PORT}/admin
    
    Features:
    ✓ Direct Markdown editing
    ✓ Git auto-commit on save
    ✓ Image upload & optimization
    ✓ Real analytics tracking
    ✓ Contact form handling
    ✓ Hugo build & deploy
    ========================================
    `);
});