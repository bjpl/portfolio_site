// Content Management API Routes
const express = require('express');
const router = express.Router();
const ContentManager = require('../content-manager');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const contentManager = new ContentManager();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/temp');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|pdf|md|txt|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  try {
    contentManager.requireAuth(req);
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// List all content
router.get('/content', requireAuth, async (req, res) => {
  try {
    const { section, draft, featured, search, sort, limit } = req.query;
    
    let contents = await contentManager.listContent(section);
    
    // Filter by draft status
    if (draft !== undefined) {
      contents = contents.filter(c => c.draft === (draft === 'true'));
    }
    
    // Filter by featured
    if (featured !== undefined) {
      contents = contents.filter(c => c.featured === (featured === 'true'));
    }
    
    // Search
    if (search) {
      const searchResults = await contentManager.searchContent(search, { limit: 50 });
      const searchIds = searchResults.map(r => r.id);
      contents = contents.filter(c => searchIds.includes(c.id));
    }
    
    // Sort
    if (sort === 'date') {
      contents.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sort === 'title') {
      contents.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'modified') {
      contents.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    }
    
    // Limit
    if (limit) {
      contents = contents.slice(0, parseInt(limit));
    }
    
    res.json({ contents, total: contents.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single content
router.get('/content/*', requireAuth, async (req, res) => {
  try {
    const contentPath = req.params[0];
    const content = await contentManager.getContent(contentPath);
    res.json(content);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Create new content
router.post('/content', requireAuth, async (req, res) => {
  try {
    const { section, filename, frontmatter, content } = req.body;
    
    if (!section) {
      return res.status(400).json({ error: 'Section is required' });
    }
    
    const result = await contentManager.createContent(
      section,
      filename,
      frontmatter || {},
      content || ''
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update content
router.put('/content/*', requireAuth, async (req, res) => {
  try {
    const contentPath = req.params[0];
    const { frontmatter, content } = req.body;
    
    const result = await contentManager.updateContent(
      contentPath,
      frontmatter || {},
      content || ''
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete content
router.delete('/content/*', requireAuth, async (req, res) => {
  try {
    const contentPath = req.params[0];
    const result = await contentManager.deleteContent(contentPath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Move/rename content
router.post('/content/move', requireAuth, async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Both oldPath and newPath are required' });
    }
    
    const result = await contentManager.moveContent(oldPath, newPath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Duplicate content
router.post('/content/duplicate', requireAuth, async (req, res) => {
  try {
    const { sourcePath, targetPath } = req.body;
    
    if (!sourcePath) {
      return res.status(400).json({ error: 'sourcePath is required' });
    }
    
    const result = await contentManager.duplicateContent(sourcePath, targetPath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk operations
router.post('/content/bulk', requireAuth, async (req, res) => {
  try {
    const { operations } = req.body;
    
    if (!Array.isArray(operations)) {
      return res.status(400).json({ error: 'Operations must be an array' });
    }
    
    const results = await contentManager.bulkUpdate(operations);
    res.json({ results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Search content
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    
    const results = await contentManager.searchContent(q, { 
      limit: limit ? parseInt(limit) : 20 
    });
    
    res.json({ results, query: q });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List backups
router.get('/backups', requireAuth, async (req, res) => {
  try {
    const { path } = req.query;
    const backups = await contentManager.listBackups(path);
    res.json({ backups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore from backup
router.post('/backups/restore', requireAuth, async (req, res) => {
  try {
    const { backupPath, targetPath } = req.body;
    
    if (!backupPath || !targetPath) {
      return res.status(400).json({ error: 'Both backupPath and targetPath are required' });
    }
    
    const result = await contentManager.restoreBackup(backupPath, targetPath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Export content
router.get('/export', requireAuth, async (req, res) => {
  try {
    const { section } = req.query;
    const data = await contentManager.exportContent(section);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 
      `attachment; filename="content-export-${Date.now()}.json"`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import content
router.post('/import', requireAuth, upload.single('file'), async (req, res) => {
  try {
    let data;
    
    if (req.file) {
      // Import from uploaded file
      const fileContent = await fs.readFile(req.file.path, 'utf8');
      data = JSON.parse(fileContent);
      
      // Clean up temp file
      await fs.unlink(req.file.path);
    } else if (req.body.data) {
      // Import from request body
      data = req.body.data;
    } else {
      return res.status(400).json({ error: 'No import data provided' });
    }
    
    const results = await contentManager.importContent(data);
    res.json({ results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload media/assets
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Determine destination based on file type
    const ext = path.extname(req.file.originalname).toLowerCase();
    let destDir = 'uploads';
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) {
      destDir = 'static/images/uploads';
    } else if (['.pdf', '.doc', '.docx'].includes(ext)) {
      destDir = 'static/documents';
    } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
      destDir = 'static/audio';
    } else if (['.mp4', '.webm', '.mov'].includes(ext)) {
      destDir = 'static/video';
    }
    
    const uploadPath = path.join(__dirname, '../../../', destDir);
    await fs.mkdir(uploadPath, { recursive: true });
    
    const filename = `${Date.now()}-${req.file.originalname}`;
    const destPath = path.join(uploadPath, filename);
    
    // Move file from temp to final destination
    await fs.rename(req.file.path, destPath);
    
    res.json({
      filename,
      path: `/${destDir}/${filename}`.replace(/\\/g, '/'),
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get content statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const contents = await contentManager.listContent();
    
    const stats = {
      total: contents.length,
      bySection: {},
      byStatus: {
        published: 0,
        draft: 0,
        featured: 0
      },
      recentlyModified: [],
      totalWords: 0
    };
    
    // Calculate statistics
    for (const content of contents) {
      // By section
      if (!stats.bySection[content.section]) {
        stats.bySection[content.section] = 0;
      }
      stats.bySection[content.section]++;
      
      // By status
      if (content.draft) {
        stats.byStatus.draft++;
      } else {
        stats.byStatus.published++;
      }
      
      if (content.featured) {
        stats.byStatus.featured++;
      }
      
      // Total words
      stats.totalWords += content.wordCount || 0;
    }
    
    // Recently modified (last 10)
    stats.recentlyModified = contents
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 10)
      .map(c => ({
        title: c.title,
        path: c.id,
        modified: c.lastModified
      }));
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;