const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const contentRoutes = require('../../../src/routes/content');
const { User } = require('../../../src/models/User');
const authMiddleware = require('../../../src/middleware/auth');

// Create test app
const app = express();
app.use(express.json());
app.use('/content', contentRoutes);

// Mock file system for testing
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('Content API Integration Tests', () => {
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;

  beforeEach(async () => {
    // Clear database
    await User.destroy({ where: {} });

    // Create test users
    testUser = await User.create({
      email: 'user@example.com',
      username: 'testuser',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
    });

    adminUser = await User.create({
      email: 'admin@example.com',
      username: 'admin',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    });

    // Generate tokens
    userToken = global.generateJWT(testUser);
    adminToken = global.generateJWT(adminUser);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /content', () => {
    beforeEach(() => {
      const mockContent = `---
title: Test Post
date: 2023-01-01
draft: false
tags: [test, example]
description: Test description
---

This is test content.`;

      fs.readdir.mockResolvedValue(['test-post.md', 'draft-post.md']);
      fs.readFile
        .mockResolvedValueOnce(mockContent)
        .mockResolvedValueOnce(`---
title: Draft Post
date: 2023-01-02
draft: true
---

Draft content.`);
    });

    it('should return published content for anonymous users', async () => {
      const response = await request(app)
        .get('/content')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].frontmatter.title).toBe('Test Post');
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/content?page=1&limit=5')
        .expect(200);

      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 5,
      });
    });

    it('should support section filtering', async () => {
      const response = await request(app)
        .get('/content?section=blog')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/content?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0].frontmatter.title).toContain('Test');
    });

    it('should include drafts for admin users', async () => {
      const response = await request(app)
        .get('/content?draft=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(2);
    });

    it('should exclude drafts for non-admin users', async () => {
      const response = await request(app)
        .get('/content?draft=true')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
    });
  });

  describe('GET /content/:section', () => {
    beforeEach(() => {
      fs.readdir.mockResolvedValue(['post1.md', 'post2.md']);
      fs.readFile.mockResolvedValue(`---
title: Section Post
date: 2023-01-01
draft: false
---

Section content.`);
    });

    it('should return content for specific section', async () => {
      const response = await request(app)
        .get('/content/blog')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
    });

    it('should return 404 for invalid section', async () => {
      fs.readdir.mockRejectedValue({ code: 'ENOENT' });

      const response = await request(app)
        .get('/content/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /content/:section/:subsection/:slug', () => {
    it('should return specific content item', async () => {
      const mockContent = `---
title: Specific Post
date: 2023-01-01
draft: false
tags: [specific]
---

This is a specific post.`;

      fs.readFile.mockResolvedValue(mockContent);

      const response = await request(app)
        .get('/content/blog/tutorials/test-post')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.frontmatter.title).toBe('Specific Post');
      expect(response.body.data.content).toBe('This is a specific post.');
    });

    it('should return 404 for non-existent content', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const response = await request(app)
        .get('/content/blog/tutorials/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should track content views', async () => {
      const mockContent = `---
title: Viewed Post
date: 2023-01-01
draft: false
---

Content to view.`;

      fs.readFile.mockResolvedValue(mockContent);

      const response = await request(app)
        .get('/content/blog/tutorials/viewed-post')
        .set('X-Forwarded-For', '127.0.0.1')
        .expect(200);

      expect(response.body.success).toBe(true);
      // View tracking is tested in unit tests
    });
  });

  describe('POST /content', () => {
    const newContentData = {
      section: 'blog',
      subsection: 'tutorials',
      title: 'New Tutorial',
      content: 'Tutorial content here.',
      tags: ['tutorial', 'guide'],
      categories: ['education'],
      metadata: {
        description: 'A new tutorial post',
      },
    };

    it('should create new content for admin users', async () => {
      fs.access.mockRejectedValue({ code: 'ENOENT' }); // File doesn't exist
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .post('/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newContentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.frontmatter.title).toBe(newContentData.title);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated users', async () => {
      const response = await request(app)
        .post('/content')
        .send(newContentData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/content')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newContentData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          section: 'blog',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 409 for duplicate titles', async () => {
      fs.access.mockResolvedValue(); // File exists

      const response = await request(app)
        .post('/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newContentData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /content/:section/:subsection/:slug', () => {
    const updateData = {
      frontmatter: {
        title: 'Updated Title',
        description: 'Updated description',
      },
      content: 'Updated content here.',
    };

    it('should update existing content for admin users', async () => {
      const existingContent = `---
title: Original Title
date: 2023-01-01
draft: false
---

Original content.`;

      fs.readFile.mockResolvedValue(existingContent);
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .put('/content/blog/tutorials/test-post')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.frontmatter.title).toBe('Updated Title');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated users', async () => {
      const response = await request(app)
        .put('/content/blog/tutorials/test-post')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .put('/content/blog/tutorials/test-post')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent content', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const response = await request(app)
        .put('/content/blog/tutorials/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /content/:section/:subsection/:slug', () => {
    it('should delete content for admin users', async () => {
      fs.unlink.mockResolvedValue();

      const response = await request(app)
        .delete('/content/blog/tutorials/test-post')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Content deleted successfully');
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated users', async () => {
      const response = await request(app)
        .delete('/content/blog/tutorials/test-post')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete('/content/blog/tutorials/test-post')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /content/search', () => {
    beforeEach(() => {
      fs.readdir.mockResolvedValue(['post1.md', 'post2.md']);
      fs.readFile
        .mockResolvedValueOnce(`---
title: JavaScript Tutorial
description: Learn JavaScript basics
tags: [javascript, tutorial]
---

JavaScript programming guide.`)
        .mockResolvedValueOnce(`---
title: Python Guide
description: Learn Python
tags: [python, guide]
---

Python programming tutorial.`);
    });

    it('should search content by query', async () => {
      const response = await request(app)
        .get('/content/search?q=javascript')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].frontmatter.title).toContain('JavaScript');
      expect(response.body.data[0].score).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(app)
        .get('/content/search?q=nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should support search limit parameter', async () => {
      const response = await request(app)
        .get('/content/search?q=tutorial&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should return 400 for missing query parameter', async () => {
      const response = await request(app)
        .get('/content/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('query');
    });
  });

  describe('GET /content/stats', () => {
    beforeEach(() => {
      fs.readdir.mockResolvedValue(['post1.md', 'post2.md']);
      fs.readFile
        .mockResolvedValueOnce(`---
title: Published Post
draft: false
---

Content.`)
        .mockResolvedValueOnce(`---
title: Draft Post
draft: true
---

Draft content.`);
    });

    it('should return public statistics for anonymous users', async () => {
      const response = await request(app)
        .get('/content/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('published');
      expect(response.body.data).not.toHaveProperty('totalViews');
    });

    it('should return detailed statistics for admin users', async () => {
      const response = await request(app)
        .get('/content/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('drafts');
      expect(response.body.data).toHaveProperty('published');
    });
  });

  describe('GET /content/tags', () => {
    beforeEach(() => {
      fs.readdir.mockResolvedValue(['post1.md', 'post2.md']);
      fs.readFile
        .mockResolvedValueOnce(`---
title: Post 1
tags: [javascript, tutorial, web]
---

Content.`)
        .mockResolvedValueOnce(`---
title: Post 2
tags: [javascript, guide]
---

Content.`);
    });

    it('should return content tags with counts', async () => {
      const response = await request(app)
        .get('/content/tags')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tag: 'javascript',
            count: 2,
          }),
          expect.objectContaining({
            tag: 'tutorial',
            count: 1,
          }),
        ])
      );
    });

    it('should filter tags by section', async () => {
      const response = await request(app)
        .get('/content/tags?section=blog')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /content/:section/:subsection/:slug/publish', () => {
    it('should toggle publish status for admin users', async () => {
      const existingContent = `---
title: Draft Post
date: 2023-01-01
draft: true
---

Draft content.`;

      fs.readFile.mockResolvedValue(existingContent);
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .post('/content/blog/tutorials/draft-post/publish')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ published: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.published).toBe(true);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/content/blog/tutorials/test-post/publish')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ published: true })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle file system errors gracefully', async () => {
      fs.readdir.mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .get('/content')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('server error');
    });

    it('should handle malformed frontmatter gracefully', async () => {
      fs.readdir.mockResolvedValue(['malformed.md']);
      fs.readFile.mockResolvedValue('invalid frontmatter content');

      const response = await request(app)
        .get('/content')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should handle large content sets efficiently', async () => {
      // Mock large dataset
      const mockFiles = Array.from({ length: 100 }, (_, i) => `post${i}.md`);
      fs.readdir.mockResolvedValue(mockFiles);
      fs.readFile.mockResolvedValue(`---
title: Test Post
draft: false
---

Content.`);

      const startTime = Date.now();
      const response = await request(app)
        .get('/content?limit=10')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});