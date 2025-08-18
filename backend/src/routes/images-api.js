// Image Optimization API Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth-simple');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Ensure upload directories exist
const UPLOAD_DIR = path.join(__dirname, '../../../static/uploads');
const OPTIMIZED_DIR = path.join(__dirname, '../../../static/uploads/optimized');
const THUMBNAILS_DIR = path.join(__dirname, '../../../static/uploads/thumbnails');

async function ensureDirectories() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(OPTIMIZED_DIR, { recursive: true });
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
}

ensureDirectories();

// Optimize single image
router.post('/optimize', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { 
      quality = 85,
      width,
      height,
      format,
      generateThumbnail = false,
      thumbnailSize = 200
    } = req.body;
    
    // Generate unique filename
    const timestamp = Date.now();
    const originalName = path.parse(req.file.originalname).name;
    const outputFormat = format || 'jpeg';
    const optimizedFilename = `${originalName}-${timestamp}.${outputFormat}`;
    const optimizedPath = path.join(OPTIMIZED_DIR, optimizedFilename);
    
    // Create sharp instance
    let sharpInstance = sharp(req.file.buffer);
    
    // Get metadata
    const metadata = await sharpInstance.metadata();
    
    // Resize if dimensions provided
    if (width || height) {
      sharpInstance = sharpInstance.resize(
        width ? parseInt(width) : null,
        height ? parseInt(height) : null,
        {
          fit: 'inside',
          withoutEnlargement: true
        }
      );
    }
    
    // Apply format and quality
    switch (outputFormat) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ quality: parseInt(quality) });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality: parseInt(quality) });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality: parseInt(quality) });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ quality: parseInt(quality) });
    }
    
    // Save optimized image
    const optimizedBuffer = await sharpInstance.toBuffer();
    await fs.writeFile(optimizedPath, optimizedBuffer);
    
    // Generate thumbnail if requested
    let thumbnailUrl = null;
    if (generateThumbnail) {
      const thumbnailFilename = `thumb-${optimizedFilename}`;
      const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);
      
      await sharp(req.file.buffer)
        .resize(parseInt(thumbnailSize), parseInt(thumbnailSize), {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
    }
    
    // Calculate size reduction
    const originalSize = req.file.size;
    const optimizedSize = optimizedBuffer.length;
    const savedBytes = originalSize - optimizedSize;
    const savedPercent = Math.round((savedBytes / originalSize) * 100);
    
    res.json({
      success: true,
      original: {
        filename: req.file.originalname,
        size: originalSize,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height
      },
      optimized: {
        filename: optimizedFilename,
        url: `/uploads/optimized/${optimizedFilename}`,
        size: optimizedSize,
        format: outputFormat,
        width: width || metadata.width,
        height: height || metadata.height,
        quality: parseInt(quality)
      },
      thumbnail: thumbnailUrl ? {
        url: thumbnailUrl,
        size: thumbnailSize
      } : null,
      savings: {
        bytes: savedBytes,
        percent: savedPercent
      }
    });
  } catch (error) {
    console.error('Image optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch optimize images
router.post('/batch-optimize', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }
    
    const { quality = 85, maxWidth = 1920, format = 'jpeg' } = req.body;
    const results = [];
    
    for (const file of req.files) {
      try {
        const timestamp = Date.now();
        const originalName = path.parse(file.originalname).name;
        const optimizedFilename = `${originalName}-${timestamp}.${format}`;
        const optimizedPath = path.join(OPTIMIZED_DIR, optimizedFilename);
        
        // Optimize image
        const optimizedBuffer = await sharp(file.buffer)
          .resize(parseInt(maxWidth), null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: parseInt(quality) })
          .toBuffer();
        
        await fs.writeFile(optimizedPath, optimizedBuffer);
        
        results.push({
          original: file.originalname,
          optimized: optimizedFilename,
          url: `/uploads/optimized/${optimizedFilename}`,
          originalSize: file.size,
          optimizedSize: optimizedBuffer.length,
          saved: file.size - optimizedBuffer.length
        });
      } catch (error) {
        results.push({
          original: file.originalname,
          error: error.message
        });
      }
    }
    
    const totalOriginal = results.reduce((sum, r) => sum + (r.originalSize || 0), 0);
    const totalOptimized = results.reduce((sum, r) => sum + (r.optimizedSize || 0), 0);
    const totalSaved = totalOriginal - totalOptimized;
    
    res.json({
      success: true,
      processed: results.length,
      results,
      summary: {
        totalOriginal,
        totalOptimized,
        totalSaved,
        savedPercent: Math.round((totalSaved / totalOriginal) * 100)
      }
    });
  } catch (error) {
    console.error('Batch optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Convert image format
router.post('/convert', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { toFormat = 'webp', quality = 85 } = req.body;
    
    const timestamp = Date.now();
    const originalName = path.parse(req.file.originalname).name;
    const convertedFilename = `${originalName}-${timestamp}.${toFormat}`;
    const convertedPath = path.join(OPTIMIZED_DIR, convertedFilename);
    
    let sharpInstance = sharp(req.file.buffer);
    
    // Apply format conversion
    switch (toFormat) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ quality: parseInt(quality) });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality: parseInt(quality) });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality: parseInt(quality) });
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ quality: parseInt(quality) });
        break;
      default:
        return res.status(400).json({ error: 'Unsupported format' });
    }
    
    const convertedBuffer = await sharpInstance.toBuffer();
    await fs.writeFile(convertedPath, convertedBuffer);
    
    res.json({
      success: true,
      original: {
        filename: req.file.originalname,
        size: req.file.size,
        format: path.extname(req.file.originalname).slice(1)
      },
      converted: {
        filename: convertedFilename,
        url: `/uploads/optimized/${convertedFilename}`,
        size: convertedBuffer.length,
        format: toFormat
      }
    });
  } catch (error) {
    console.error('Image conversion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resize image
router.post('/resize', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { width, height, fit = 'cover', position = 'center' } = req.body;
    
    if (!width && !height) {
      return res.status(400).json({ error: 'Width or height must be specified' });
    }
    
    const timestamp = Date.now();
    const originalName = path.parse(req.file.originalname).name;
    const ext = path.extname(req.file.originalname).slice(1) || 'jpg';
    const resizedFilename = `${originalName}-${width || 'auto'}x${height || 'auto'}-${timestamp}.${ext}`;
    const resizedPath = path.join(OPTIMIZED_DIR, resizedFilename);
    
    const resizedBuffer = await sharp(req.file.buffer)
      .resize(
        width ? parseInt(width) : null,
        height ? parseInt(height) : null,
        { fit, position }
      )
      .toBuffer();
    
    await fs.writeFile(resizedPath, resizedBuffer);
    
    const metadata = await sharp(resizedBuffer).metadata();
    
    res.json({
      success: true,
      original: {
        filename: req.file.originalname,
        size: req.file.size
      },
      resized: {
        filename: resizedFilename,
        url: `/uploads/optimized/${resizedFilename}`,
        size: resizedBuffer.length,
        width: metadata.width,
        height: metadata.height
      }
    });
  } catch (error) {
    console.error('Image resize error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crop image
router.post('/crop', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { left = 0, top = 0, width, height } = req.body;
    
    if (!width || !height) {
      return res.status(400).json({ error: 'Width and height must be specified' });
    }
    
    const timestamp = Date.now();
    const originalName = path.parse(req.file.originalname).name;
    const ext = path.extname(req.file.originalname).slice(1) || 'jpg';
    const croppedFilename = `${originalName}-crop-${timestamp}.${ext}`;
    const croppedPath = path.join(OPTIMIZED_DIR, croppedFilename);
    
    const croppedBuffer = await sharp(req.file.buffer)
      .extract({
        left: parseInt(left),
        top: parseInt(top),
        width: parseInt(width),
        height: parseInt(height)
      })
      .toBuffer();
    
    await fs.writeFile(croppedPath, croppedBuffer);
    
    res.json({
      success: true,
      original: {
        filename: req.file.originalname,
        size: req.file.size
      },
      cropped: {
        filename: croppedFilename,
        url: `/uploads/optimized/${croppedFilename}`,
        size: croppedBuffer.length,
        width: parseInt(width),
        height: parseInt(height)
      }
    });
  } catch (error) {
    console.error('Image crop error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get list of optimized images
router.get('/list', async (req, res) => {
  try {
    const optimizedFiles = await fs.readdir(OPTIMIZED_DIR);
    const thumbnailFiles = await fs.readdir(THUMBNAILS_DIR);
    
    const images = [];
    
    for (const file of optimizedFiles) {
      const filePath = path.join(OPTIMIZED_DIR, file);
      const stats = await fs.stat(filePath);
      
      // Check if thumbnail exists
      const hasThumbnail = thumbnailFiles.includes(`thumb-${file}`);
      
      images.push({
        filename: file,
        url: `/uploads/optimized/${file}`,
        thumbnail: hasThumbnail ? `/uploads/thumbnails/thumb-${file}` : null,
        size: stats.size,
        modified: stats.mtime
      });
    }
    
    // Sort by modified date (newest first)
    images.sort((a, b) => b.modified - a.modified);
    
    res.json({
      images,
      total: images.length
    });
  } catch (error) {
    console.error('List images error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete optimized image
router.delete('/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const imagePath = path.join(OPTIMIZED_DIR, filename);
    const thumbnailPath = path.join(THUMBNAILS_DIR, `thumb-${filename}`);
    
    // Delete main image
    await fs.unlink(imagePath).catch(() => {});
    
    // Delete thumbnail if exists
    await fs.unlink(thumbnailPath).catch(() => {});
    
    res.json({
      success: true,
      deleted: filename
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;