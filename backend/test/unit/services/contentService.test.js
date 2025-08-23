const contentService = require('../../../src/services/contentService');
const path = require('path');
const fs = require('fs').promises;
const cacheService = require('../../../src/services/cache');

// Mock dependencies
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

jest.mock('../../../src/services/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  client: {
    keys: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseMarkdownFile', () => {
    it('should parse markdown file correctly', async () => {
      const mockContent = `---
title: Test Post
date: 2023-01-01
draft: false
tags: [test, example]
---

This is test content.`;

      fs.readFile.mockResolvedValue(mockContent);

      const result = await contentService.parseMarkdownFile('/test/path/test-post.md');

      expect(result).toEqual({
        slug: 'test-post',
        path: expect.any(String),
        section: expect.any(String),
        subsection: expect.any(String),
        frontmatter: {
          title: 'Test Post',
          date: new Date('2023-01-01'),
          draft: false,
          tags: ['test', 'example'],
        },
        content: 'This is test content.',
        excerpt: 'This is test content.',
        readTime: 1,
      });
    });

    it('should handle parsing errors gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await contentService.parseMarkdownFile('/nonexistent/file.md');

      expect(result).toBeNull();
    });
  });

  describe('getContent', () => {
    it('should return paginated content with filtering', async () => {
      const mockFiles = ['/content/test1.md', '/content/test2.md'];
      const mockContent = [
        {
          slug: 'test1',
          frontmatter: { title: 'Test 1', date: '2023-01-01', draft: false },
          content: 'Content 1',
        },
        {
          slug: 'test2',
          frontmatter: { title: 'Test 2', date: '2023-01-02', draft: false },
          content: 'Content 2',
        },
      ];

      jest.spyOn(contentService, 'getAllMarkdownFiles').mockResolvedValue(mockFiles);
      jest.spyOn(contentService, 'parseMarkdownFile')
        .mockResolvedValueOnce(mockContent[0])
        .mockResolvedValueOnce(mockContent[1]);

      const result = await contentService.getContent({
        page: 1,
        limit: 10,
        sortBy: 'date',
        sortOrder: 'desc',
      });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.items[0].slug).toBe('test2'); // Should be sorted by date desc
    });

    it('should filter out drafts by default', async () => {
      const mockFiles = ['/content/test1.md', '/content/test2.md'];
      const mockContent = [
        {
          slug: 'test1',
          frontmatter: { title: 'Test 1', date: '2023-01-01', draft: true },
          content: 'Content 1',
        },
        {
          slug: 'test2',
          frontmatter: { title: 'Test 2', date: '2023-01-02', draft: false },
          content: 'Content 2',
        },
      ];

      jest.spyOn(contentService, 'getAllMarkdownFiles').mockResolvedValue(mockFiles);
      jest.spyOn(contentService, 'parseMarkdownFile')
        .mockResolvedValueOnce(mockContent[0])
        .mockResolvedValueOnce(mockContent[1]);

      const result = await contentService.getContent({ draft: false });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe('test2');
    });

    it('should filter content by search query', async () => {
      const mockFiles = ['/content/test1.md', '/content/test2.md'];
      const mockContent = [
        {
          slug: 'test1',
          frontmatter: { title: 'JavaScript Tutorial', draft: false },
          content: 'Learn JavaScript basics',
        },
        {
          slug: 'test2',
          frontmatter: { title: 'Python Guide', draft: false },
          content: 'Python programming guide',
        },
      ];

      jest.spyOn(contentService, 'getAllMarkdownFiles').mockResolvedValue(mockFiles);
      jest.spyOn(contentService, 'parseMarkdownFile')
        .mockResolvedValueOnce(mockContent[0])
        .mockResolvedValueOnce(mockContent[1]);

      const result = await contentService.getContent({ search: 'javascript' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe('test1');
    });
  });

  describe('createContent', () => {
    it('should create new content successfully', async () => {
      const contentData = {
        section: 'blog',
        subsection: 'tutorials',
        title: 'New Tutorial',
        content: 'Tutorial content here',
        tags: ['tutorial', 'guide'],
        authorName: 'Test Author',
      };

      fs.access.mockRejectedValue({ code: 'ENOENT' }); // File doesn't exist
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      jest.spyOn(contentService, 'generateSlug').mockReturnValue('new-tutorial');

      const result = await contentService.createContent(contentData);

      expect(result.slug).toBe('new-tutorial');
      expect(result.section).toBe('blog');
      expect(result.subsection).toBe('tutorials');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error if content already exists', async () => {
      const contentData = {
        section: 'blog',
        subsection: 'tutorials',
        title: 'Existing Tutorial',
        content: 'Content',
      };

      fs.access.mockResolvedValue(); // File exists
      jest.spyOn(contentService, 'generateSlug').mockReturnValue('existing-tutorial');

      await expect(contentService.createContent(contentData))
        .rejects.toThrow('Content with this title already exists');
    });
  });

  describe('updateContent', () => {
    it('should update existing content', async () => {
      const existingContent = `---
title: Old Title
date: 2023-01-01
---

Old content`;

      const updates = {
        frontmatter: { title: 'New Title' },
        content: 'New content',
      };

      fs.readFile.mockResolvedValue(existingContent);
      fs.writeFile.mockResolvedValue();

      const result = await contentService.updateContent(
        'blog',
        'tutorials',
        'test-post',
        updates
      );

      expect(result.frontmatter.title).toBe('New Title');
      expect(result.content).toBe('New content');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle update errors gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await contentService.updateContent(
        'blog',
        'tutorials',
        'nonexistent',
        {}
      );

      expect(result).toBeNull();
    });
  });

  describe('searchContent', () => {
    it('should search content and return relevance scores', async () => {
      const mockFiles = ['/content/test1.md', '/content/test2.md'];
      const mockContent = [
        {
          slug: 'test1',
          frontmatter: { 
            title: 'JavaScript Tutorial',
            description: 'Learn JavaScript',
            tags: ['javascript', 'tutorial']
          },
          content: 'JavaScript is a programming language',
        },
        {
          slug: 'test2',
          frontmatter: { 
            title: 'Python Guide',
            description: 'Learn Python'
          },
          content: 'Python is another programming language',
        },
      ];

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();

      jest.spyOn(contentService, 'getAllMarkdownFiles').mockResolvedValue(mockFiles);
      jest.spyOn(contentService, 'parseMarkdownFile')
        .mockResolvedValueOnce(mockContent[0])
        .mockResolvedValueOnce(mockContent[1]);

      const result = await contentService.searchContent('javascript');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('test1');
      expect(result[0].score).toBeGreaterThan(0);
    });

    it('should use cache when available', async () => {
      const cachedResults = [{ slug: 'cached-result' }];
      cacheService.get.mockResolvedValue(cachedResults);

      const result = await contentService.searchContent('test query');

      expect(result).toBe(cachedResults);
      expect(cacheService.get).toHaveBeenCalledWith('search:test query:20');
    });
  });

  describe('getContentStats', () => {
    it('should return content statistics', async () => {
      const mockFiles = ['/content/test1.md', '/content/test2.md'];
      const mockContent = [
        {
          frontmatter: { draft: false },
          section: 'blog',
        },
        {
          frontmatter: { draft: true },
          section: 'blog',
        },
      ];

      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();

      jest.spyOn(contentService, 'getAllMarkdownFiles').mockResolvedValue(mockFiles);
      jest.spyOn(contentService, 'parseMarkdownFile')
        .mockResolvedValueOnce(mockContent[0])
        .mockResolvedValueOnce(mockContent[1]);

      const result = await contentService.getContentStats();

      expect(result.total).toBe(2);
      expect(result.drafts).toBe(1);
      expect(result.published).toBe(1);
    });

    it('should include view counts for admin stats', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue();
      cacheService.client.keys.mockResolvedValue(['views:post1', 'views:post2']);

      jest.spyOn(contentService, 'getAllMarkdownFiles').mockResolvedValue([]);

      const result = await contentService.getContentStats(true);

      expect(result.totalViews).toBeDefined();
    });
  });

  describe('utility methods', () => {
    describe('generateSlug', () => {
      it('should generate valid slugs', () => {
        expect(contentService.generateSlug('Hello World!')).toBe('hello-world');
        expect(contentService.generateSlug('JavaScript & Python')).toBe('javascript-python');
        expect(contentService.generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
      });
    });

    describe('generateExcerpt', () => {
      it('should generate excerpt from content', () => {
        const content = 'This is a long piece of content that should be truncated at some point.';
        const excerpt = contentService.generateExcerpt(content, 30);

        expect(excerpt.length).toBeLessThanOrEqual(33); // 30 + '...'
        expect(excerpt).toContain('...');
      });

      it('should return full content if shorter than max length', () => {
        const content = 'Short content.';
        const excerpt = contentService.generateExcerpt(content, 100);

        expect(excerpt).toBe(content);
      });
    });

    describe('calculateReadTime', () => {
      it('should calculate read time correctly', () => {
        const content = 'word '.repeat(200); // 200 words
        const readTime = contentService.calculateReadTime(content);

        expect(readTime).toBe(1); // 200 words / 200 wpm = 1 minute
      });

      it('should round up fractional minutes', () => {
        const content = 'word '.repeat(250); // 250 words
        const readTime = contentService.calculateReadTime(content);

        expect(readTime).toBe(2); // 250 words / 200 wpm = 1.25, rounded up to 2
      });
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      jest.spyOn(contentService, 'getAllMarkdownFiles').mockRejectedValue(new Error('FS Error'));

      const result = await contentService.getContent({});

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle cache errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      cacheService.set.mockRejectedValue(new Error('Cache error'));

      const mockFiles = ['/content/test.md'];
      jest.spyOn(contentService, 'getAllMarkdownFiles').mockResolvedValue(mockFiles);
      jest.spyOn(contentService, 'parseMarkdownFile').mockResolvedValue({
        slug: 'test',
        frontmatter: { draft: false },
        content: 'test content',
      });

      const result = await contentService.getContent({});

      expect(result.items).toHaveLength(1);
    });
  });

  describe('performance tests', () => {
    it('should handle large content sets efficiently', async () => {
      const mockFiles = Array.from({ length: 1000 }, (_, i) => `/content/test${i}.md`);
      const mockContent = {
        slug: 'test',
        frontmatter: { draft: false, date: '2023-01-01' },
        content: 'test content',
      };

      jest.spyOn(contentService, 'getAllMarkdownFiles').mockResolvedValue(mockFiles);
      jest.spyOn(contentService, 'parseMarkdownFile').mockResolvedValue(mockContent);

      const startTime = Date.now();
      const result = await contentService.getContent({ limit: 10 });
      const endTime = Date.now();

      expect(result.items).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});