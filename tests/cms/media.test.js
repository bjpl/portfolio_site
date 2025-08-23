const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../backend/src/cms');
const { sequelize, MediaAsset, User } = require('../../backend/src/models');

describe('Media API', () => {
  let authToken;
  let userId;
  let mediaId;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create test user
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      isActive: true
    });
    userId = user.id;

    // Create auth token (simplified for testing)
    authToken = 'Bearer test-token';

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up test files
    try {
      const testFiles = await MediaAsset.findAll();
      for (const file of testFiles) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        // Clean up optimized versions
        if (file.optimizedVersions) {
          Object.values(file.optimizedVersions).forEach(version => {
            if (version.path && fs.existsSync(version.path)) {
              fs.unlinkSync(version.path);
            }
          });
        }
      }
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }

    await sequelize.close();
  });

  describe('POST /api/cms/media/upload', () => {
    it('should upload an image file', async () => {
      // Create a test image buffer (1x1 PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      const response = await request(app)
        .post('/api/cms/media/upload')
        .set('Authorization', authToken)
        .attach('file', testImageBuffer, 'test-image.png')
        .field('altText', 'Test image')
        .field('caption', 'A test image for unit testing')
        .field('tags', JSON.stringify(['test', 'image']))
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.originalName).toBe('test-image.png');
      expect(response.body.mimeType).toBe('image/png');
      expect(response.body.category).toBe('image');
      expect(response.body.altText).toBe('Test image');
      expect(response.body.caption).toBe('A test image for unit testing');
      expect(response.body.tags).toEqual(['test', 'image']);
      expect(response.body).toHaveProperty('width');
      expect(response.body).toHaveProperty('height');

      mediaId = response.body.id;
    });

    it('should reject files without authentication', async () => {
      const testBuffer = Buffer.from('test content');

      const response = await request(app)
        .post('/api/cms/media/upload')
        .attach('file', testBuffer, 'test.txt')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid file types', async () => {
      const testBuffer = Buffer.from('malicious executable content');

      const response = await request(app)
        .post('/api/cms/media/upload')
        .set('Authorization', authToken)
        .attach('file', testBuffer, 'malicious.exe')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/cms/media/upload')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.error).toBe('No file uploaded');
    });
  });

  describe('POST /api/cms/media/upload/multiple', () => {
    it('should upload multiple files', async () => {
      const testImage1 = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      const testImage2 = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x72, 0xB6, 0x0D,
        0x24, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      const response = await request(app)
        .post('/api/cms/media/upload/multiple')
        .set('Authorization', authToken)
        .attach('files', testImage1, 'test1.png')
        .attach('files', testImage2, 'test2.png')
        .expect(201);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[1]).toHaveProperty('id');
      expect(response.body[0].originalName).toBe('test1.png');
      expect(response.body[1].originalName).toBe('test2.png');
    });

    it('should handle no files uploaded', async () => {
      const response = await request(app)
        .post('/api/cms/media/upload/multiple')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.error).toBe('No files uploaded');
    });
  });

  describe('GET /api/cms/media', () => {
    it('should return paginated media assets', async () => {
      const response = await request(app)
        .get('/api/cms/media')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('media');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.media).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('totalItems');
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/cms/media?category=image')
        .set('Authorization', authToken)
        .expect(200);

      response.body.media.forEach(asset => {
        expect(asset.category).toBe('image');
      });
    });

    it('should search media assets', async () => {
      const response = await request(app)
        .get('/api/cms/media?search=test')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.media.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/cms/media?page=1&limit=1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.media).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(1);
    });
  });

  describe('GET /api/cms/media/:id', () => {
    it('should return a specific media asset', async () => {
      const response = await request(app)
        .get(`/api/cms/media/${mediaId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.id).toBe(mediaId);
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('originalName');
      expect(response.body).toHaveProperty('mimeType');
      expect(response.body).toHaveProperty('uploader');
    });

    it('should return 404 for non-existent media', async () => {
      const response = await request(app)
        .get('/api/cms/media/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.error).toBe('Media asset not found');
    });
  });

  describe('PUT /api/cms/media/:id', () => {
    it('should update media metadata', async () => {
      const updateData = {
        altText: 'Updated alt text',
        caption: 'Updated caption',
        tags: ['updated', 'tags']
      };

      const response = await request(app)
        .put(`/api/cms/media/${mediaId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.altText).toBe(updateData.altText);
      expect(response.body.caption).toBe(updateData.caption);
      expect(response.body.tags).toEqual(updateData.tags);
    });

    it('should prevent unauthorized updates', async () => {
      const response = await request(app)
        .put(`/api/cms/media/${mediaId}`)
        .send({ altText: 'Unauthorized update' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/cms/media/:id', () => {
    it('should delete media asset', async () => {
      const response = await request(app)
        .delete(`/api/cms/media/${mediaId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.message).toBe('Media asset deleted successfully');

      // Verify deletion from database
      const asset = await MediaAsset.findByPk(mediaId);
      expect(asset).toBeNull();
    });

    it('should return 404 for non-existent media', async () => {
      const response = await request(app)
        .delete('/api/cms/media/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.error).toBe('Media asset not found');
    });
  });

  describe('GET /api/cms/media/stats', () => {
    beforeEach(async () => {
      // Create some test media assets
      await MediaAsset.bulkCreate([
        {
          filename: 'test1.jpg',
          originalName: 'test1.jpg',
          path: '/uploads/images/test1.jpg',
          url: '/uploads/images/test1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          category: 'image',
          uploaderId: userId
        },
        {
          filename: 'test2.pdf',
          originalName: 'test2.pdf',
          path: '/uploads/documents/test2.pdf',
          url: '/uploads/documents/test2.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          category: 'document',
          uploaderId: userId
        }
      ]);
    });

    it('should return media statistics', async () => {
      const response = await request(app)
        .get('/api/cms/media/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('categoryCounts');
      expect(response.body).toHaveProperty('totalAssets');
      expect(response.body).toHaveProperty('totalSize');
      expect(typeof response.body.totalAssets).toBe('number');
      expect(typeof response.body.totalSize).toBe('number');
    });
  });

  describe('DELETE /api/cms/media/bulk', () => {
    let bulkMediaIds;

    beforeEach(async () => {
      // Create media assets for bulk deletion test
      const assets = await MediaAsset.bulkCreate([
        {
          filename: 'bulk1.jpg',
          originalName: 'bulk1.jpg',
          path: '/uploads/images/bulk1.jpg',
          url: '/uploads/images/bulk1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          category: 'image',
          uploaderId: userId
        },
        {
          filename: 'bulk2.jpg',
          originalName: 'bulk2.jpg',
          path: '/uploads/images/bulk2.jpg',
          url: '/uploads/images/bulk2.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          category: 'image',
          uploaderId: userId
        }
      ]);

      bulkMediaIds = assets.map(asset => asset.id);
    });

    it('should delete multiple media assets', async () => {
      const response = await request(app)
        .delete('/api/cms/media/bulk')
        .set('Authorization', authToken)
        .send({ ids: bulkMediaIds })
        .expect(200);

      expect(response.body.message).toContain('media assets deleted successfully');

      // Verify deletion
      const remainingAssets = await MediaAsset.findAll({
        where: { id: bulkMediaIds }
      });
      expect(remainingAssets).toHaveLength(0);
    });

    it('should require admin role for bulk operations', async () => {
      // This test assumes the test user doesn't have admin role
      const response = await request(app)
        .delete('/api/cms/media/bulk')
        .set('Authorization', 'Bearer non-admin-token')
        .send({ ids: bulkMediaIds })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate input for bulk delete', async () => {
      const response = await request(app)
        .delete('/api/cms/media/bulk')
        .set('Authorization', authToken)
        .send({ ids: [] })
        .expect(400);

      expect(response.body.error).toBe('No asset IDs provided');
    });
  });
});