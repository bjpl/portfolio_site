const fs = require('fs').promises;
const path = require('path');

const multer = require('multer');

class FileService {
  constructor() {
    this.projectRoot = path.join(__dirname, '../../../..');
    this.uploadsPath = path.join(this.projectRoot, 'static', 'uploads');
    this.mediaPath = path.join(this.projectRoot, 'static', 'media');
  }

  // Configure multer for file uploads
  getUploadMiddleware() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        let uploadPath = this.uploadsPath;

        if (file.mimetype.startsWith('image/')) {
          uploadPath = path.join(this.uploadsPath, 'images');
        } else if (file.mimetype === 'application/pdf') {
          uploadPath = path.join(this.uploadsPath, 'pdfs');
        } else if (file.mimetype.startsWith('video/')) {
          uploadPath = path.join(this.uploadsPath, 'videos');
        }

        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${this.slugify(name)}-${uniqueSuffix}${ext}`);
      },
    });

    return multer({
      storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'application/pdf',
          'video/mp4',
          'video/webm',
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'));
        }
      },
    });
  }

  async listFiles(directory = 'uploads') {
    const basePath = path.join(this.projectRoot, 'static', directory);
    const files = [];

    try {
      const items = await this.walkDir(basePath);
      for (const item of items) {
        const stats = await fs.stat(item);
        const relativePath = path.relative(basePath, item);
        files.push({
          path: relativePath,
          name: path.basename(item),
          size: stats.size,
          modified: stats.mtime,
          url: `/static/${directory}/${relativePath.replace(/\\/g, '/')}`,
        });
      }
    } catch (error) {
      console.error('Error listing files:', error);
    }

    return files;
  }

  async deleteFile(filePath) {
    const fullPath = path.join(this.projectRoot, 'static', filePath);
    try {
      await fs.unlink(fullPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async walkDir(dir) {
    let files = [];
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files = files.concat(await this.walkDir(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error walking directory ${dir}:`, error);
    }
    return files;
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async getStorageStats() {
    const stats = {
      images: { count: 0, size: 0 },
      pdfs: { count: 0, size: 0 },
      videos: { count: 0, size: 0 },
      total: { count: 0, size: 0 },
    };

    const files = await this.listFiles('uploads');

    for (const file of files) {
      stats.total.count++;
      stats.total.size += file.size;

      const ext = path.extname(file.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        stats.images.count++;
        stats.images.size += file.size;
      } else if (ext === '.pdf') {
        stats.pdfs.count++;
        stats.pdfs.size += file.size;
      } else if (['.mp4', '.webm'].includes(ext)) {
        stats.videos.count++;
        stats.videos.size += file.size;
      }
    }

    return stats;
  }
}

module.exports = FileService;
