// File Management API Routes
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth-simple');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../static/uploads', req.body.path || '');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Base directories for file management
const BASE_DIRS = {
  content: path.join(__dirname, '../../../content'),
  static: path.join(__dirname, '../../../static'),
  layouts: path.join(__dirname, '../../../layouts'),
  assets: path.join(__dirname, '../../../assets'),
  uploads: path.join(__dirname, '../../../static/uploads')
};

// Helper function to validate and resolve paths
function resolveSafePath(requestPath) {
  // Remove leading slash and normalize
  const cleanPath = requestPath.replace(/^\/+/, '').replace(/\\/g, '/');
  
  // Determine base directory
  const parts = cleanPath.split('/');
  const baseKey = parts[0];
  
  if (!BASE_DIRS[baseKey]) {
    throw new Error('Invalid base directory');
  }
  
  // Build full path
  const relativePath = parts.slice(1).join('/');
  const fullPath = path.join(BASE_DIRS[baseKey], relativePath);
  
  // Ensure path doesn't escape base directory
  if (!fullPath.startsWith(BASE_DIRS[baseKey])) {
    throw new Error('Path traversal attempt detected');
  }
  
  return fullPath;
}

// Get files and folders for a directory
router.get('/list/*', async (req, res) => {
  try {
    const requestPath = '/' + (req.params[0] || 'content');
    const dirPath = resolveSafePath(requestPath);
    
    // Check if directory exists
    const stats = await fs.stat(dirPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    // Read directory contents
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Process items
    const files = [];
    const folders = [];
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      const itemStats = await fs.stat(itemPath);
      
      const itemInfo = {
        name: item.name,
        path: requestPath + '/' + item.name,
        modified: itemStats.mtime,
        size: itemStats.size
      };
      
      if (item.isDirectory()) {
        folders.push({
          ...itemInfo,
          type: 'folder',
          icon: '📁'
        });
      } else {
        // Determine file type and icon
        const ext = path.extname(item.name).toLowerCase();
        let type = 'file';
        let icon = '📄';
        
        if (['.md', '.mdx'].includes(ext)) {
          type = 'markdown';
          icon = '📝';
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
          type = 'image';
          icon = '🖼️';
        } else if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
          type = 'code';
          icon = '📜';
        } else if (['.css', '.scss', '.sass'].includes(ext)) {
          type = 'style';
          icon = '🎨';
        } else if (['.json', '.yaml', '.yml', '.toml'].includes(ext)) {
          type = 'config';
          icon = '⚙️';
        } else if (['.pdf'].includes(ext)) {
          type = 'pdf';
          icon = '📑';
        } else if (['.zip', '.tar', '.gz'].includes(ext)) {
          type = 'archive';
          icon = '📦';
        }
        
        files.push({
          ...itemInfo,
          type,
          icon,
          extension: ext
        });
      }
    }
    
    // Sort folders first, then files
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      path: requestPath,
      folders,
      files,
      total: folders.length + files.length
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get file content
router.get('/read/*', async (req, res) => {
  try {
    const requestPath = '/' + (req.params[0] || '');
    const filePath = resolveSafePath(requestPath);
    
    // Check if file exists
    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats || !stats.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Determine if file is binary
    const ext = path.extname(filePath).toLowerCase();
    const textExtensions = ['.md', '.mdx', '.txt', '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html', '.json', '.yaml', '.yml', '.toml', '.xml'];
    
    if (textExtensions.includes(ext)) {
      // Read text file
      const content = await fs.readFile(filePath, 'utf-8');
      res.json({
        path: requestPath,
        content,
        type: 'text',
        size: stats.size,
        modified: stats.mtime
      });
    } else {
      // For binary files, just return metadata
      res.json({
        path: requestPath,
        type: 'binary',
        size: stats.size,
        modified: stats.mtime,
        url: `/static/uploads${requestPath}`
      });
    }
  } catch (error) {
    console.error('Read file error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new folder
router.post('/folder', authenticateToken, async (req, res) => {
  try {
    const { path: folderPath, name } = req.body;
    
    if (!name || !folderPath) {
      return res.status(400).json({ error: 'Path and name are required' });
    }
    
    const parentPath = resolveSafePath(folderPath);
    const newFolderPath = path.join(parentPath, name);
    
    // Check if folder already exists
    const exists = await fs.stat(newFolderPath).catch(() => null);
    if (exists) {
      return res.status(409).json({ error: 'Folder already exists' });
    }
    
    // Create folder
    await fs.mkdir(newFolderPath, { recursive: true });
    
    res.json({
      success: true,
      path: folderPath + '/' + name
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      success: true,
      file: {
        name: req.file.originalname,
        size: req.file.size,
        path: `/uploads/${req.body.path || ''}/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file or folder
router.delete('/*', authenticateToken, async (req, res) => {
  try {
    const requestPath = '/' + (req.params[0] || '');
    const targetPath = resolveSafePath(requestPath);
    
    // Check if exists
    const stats = await fs.stat(targetPath).catch(() => null);
    if (!stats) {
      return res.status(404).json({ error: 'File or folder not found' });
    }
    
    if (stats.isDirectory()) {
      // Remove directory recursively
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      // Remove file
      await fs.unlink(targetPath);
    }
    
    res.json({
      success: true,
      deleted: requestPath
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rename file or folder
router.put('/rename', authenticateToken, async (req, res) => {
  try {
    const { oldPath, newName } = req.body;
    
    if (!oldPath || !newName) {
      return res.status(400).json({ error: 'Old path and new name are required' });
    }
    
    const sourcePath = resolveSafePath(oldPath);
    const directory = path.dirname(sourcePath);
    const destPath = path.join(directory, newName);
    
    // Check if source exists
    const exists = await fs.stat(sourcePath).catch(() => null);
    if (!exists) {
      return res.status(404).json({ error: 'Source file or folder not found' });
    }
    
    // Check if destination already exists
    const destExists = await fs.stat(destPath).catch(() => null);
    if (destExists) {
      return res.status(409).json({ error: 'Destination already exists' });
    }
    
    // Rename
    await fs.rename(sourcePath, destPath);
    
    const newPath = oldPath.substring(0, oldPath.lastIndexOf('/')) + '/' + newName;
    
    res.json({
      success: true,
      oldPath,
      newPath
    });
  } catch (error) {
    console.error('Rename error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Copy file or folder
router.post('/copy', authenticateToken, async (req, res) => {
  try {
    const { sourcePath, destPath } = req.body;
    
    if (!sourcePath || !destPath) {
      return res.status(400).json({ error: 'Source and destination paths are required' });
    }
    
    const source = resolveSafePath(sourcePath);
    const dest = resolveSafePath(destPath);
    
    // Check if source exists
    const stats = await fs.stat(source).catch(() => null);
    if (!stats) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    // Check if destination already exists
    const destExists = await fs.stat(dest).catch(() => null);
    if (destExists) {
      return res.status(409).json({ error: 'Destination already exists' });
    }
    
    if (stats.isDirectory()) {
      // Copy directory recursively
      await fs.cp(source, dest, { recursive: true });
    } else {
      // Copy file
      await fs.copyFile(source, dest);
    }
    
    res.json({
      success: true,
      sourcePath,
      destPath
    });
  } catch (error) {
    console.error('Copy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move file or folder
router.post('/move', authenticateToken, async (req, res) => {
  try {
    const { sourcePath, destPath } = req.body;
    
    if (!sourcePath || !destPath) {
      return res.status(400).json({ error: 'Source and destination paths are required' });
    }
    
    const source = resolveSafePath(sourcePath);
    const dest = resolveSafePath(destPath);
    
    // Check if source exists
    const exists = await fs.stat(source).catch(() => null);
    if (!exists) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    // Check if destination already exists
    const destExists = await fs.stat(dest).catch(() => null);
    if (destExists) {
      return res.status(409).json({ error: 'Destination already exists' });
    }
    
    // Move (rename)
    await fs.rename(source, dest);
    
    res.json({
      success: true,
      sourcePath,
      destPath
    });
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search files
router.get('/search', async (req, res) => {
  try {
    const { query, path: searchPath = '/content' } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const basePath = resolveSafePath(searchPath);
    const results = [];
    
    // Recursive search function
    async function searchDir(dirPath, relativePath = '') {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;
        
        // Check if name matches query
        if (item.name.toLowerCase().includes(query.toLowerCase())) {
          const stats = await fs.stat(itemPath);
          results.push({
            name: item.name,
            path: `${searchPath}/${itemRelativePath}`,
            type: item.isDirectory() ? 'folder' : 'file',
            size: stats.size,
            modified: stats.mtime
          });
        }
        
        // Recursively search subdirectories
        if (item.isDirectory() && results.length < 100) {
          await searchDir(itemPath, itemRelativePath);
        }
      }
    }
    
    await searchDir(basePath);
    
    res.json({
      query,
      results: results.slice(0, 100), // Limit to 100 results
      total: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;