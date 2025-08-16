const express = require('express');

const router = express.Router();
const FileService = require('../services/fileService');
const HugoService = require('../services/hugoService');

const hugoService = new HugoService();
const fileService = new FileService();

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const contentStats = await hugoService.getContentStats();
    const storageStats = await fileService.getStorageStats();

    res.json({
      content: contentStats,
      storage: storageStats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent content
router.get('/recent', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const recentContent = await hugoService.getRecentContent(parseInt(limit));
    res.json(recentContent);
  } catch (error) {
    console.error('Recent content error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new content
router.post('/content', async (req, res) => {
  const { section, subsection, title, language } = req.body;

  try {
    const result = await hugoService.createContent(section, subsection, title, language);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List content
router.get('/content', async (req, res) => {
  const { section, language } = req.query;

  try {
    const files = await hugoService.listContent(section, language);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Build site
router.post('/build', async (req, res) => {
  const { draft } = req.body;

  try {
    const result = await hugoService.buildSite(draft);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload files
const upload = fileService.getUploadMiddleware();
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      path: `/uploads/${file.filename}`,
    }));

    res.json({ success: true, files: uploadedFiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List uploaded files
router.get('/files', async (req, res) => {
  const { directory = 'uploads' } = req.query;

  try {
    const files = await fileService.listFiles(directory);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/files/:path', async (req, res) => {
  const { path } = req.params;

  try {
    const result = await fileService.deleteFile(path);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
