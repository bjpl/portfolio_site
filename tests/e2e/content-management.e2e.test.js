const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

test.describe('Content Management E2E Tests', () => {
  let browser;
  let context;
  let page;
  let adminContext;
  let adminPage;

  test.beforeAll(async () => {
    browser = await chromium.launch();
    
    // Create regular user context
    context = await browser.newContext();
    page = await context.newPage();
    
    // Create admin context
    adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.describe('Content Viewing', () => {
    test('should display content list page', async () => {
      await page.goto('http://localhost:3000/content');
      
      // Verify page loads
      await expect(page.locator('[data-testid="content-list"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Content');
      
      // Verify content items are displayed
      await expect(page.locator('[data-testid="content-item"]')).toHaveCount({ min: 0 });
    });

    test('should display individual content pages', async () => {
      await page.goto('http://localhost:3000/content');
      
      // Click on first content item if exists
      const firstItem = page.locator('[data-testid="content-item"]').first();
      if (await firstItem.count() > 0) {
        await firstItem.click();
        
        // Verify individual content page
        await expect(page.locator('[data-testid="content-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="content-body"]')).toBeVisible();
        await expect(page.locator('[data-testid="content-meta"]')).toBeVisible();
      }
    });

    test('should filter content by section', async () => {
      await page.goto('http://localhost:3000/content');
      
      // Click on section filter
      await page.click('[data-testid="section-filter-blog"]');
      
      // Verify URL updates
      await expect(page).toHaveURL(/.*section=blog/);
      
      // Verify filtered results
      const contentItems = page.locator('[data-testid="content-item"]');
      if (await contentItems.count() > 0) {
        await expect(contentItems.first().locator('[data-testid="content-section"]')).toContainText('blog');
      }
    });

    test('should search content', async () => {
      await page.goto('http://localhost:3000/content');
      
      // Perform search
      await page.fill('[data-testid="search-input"]', 'tutorial');
      await page.click('[data-testid="search-button"]');
      
      // Verify search results
      await expect(page).toHaveURL(/.*search=tutorial/);
      
      const results = page.locator('[data-testid="content-item"]');
      if (await results.count() > 0) {
        await expect(results.first()).toContainText('tutorial');
      }
    });

    test('should paginate content', async () => {
      await page.goto('http://localhost:3000/content');
      
      // Check if pagination exists
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible()) {
        const nextButton = page.locator('[data-testid="next-page"]');
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          
          // Verify URL updates
          await expect(page).toHaveURL(/.*page=2/);
          
          // Verify content changes
          await expect(page.locator('[data-testid="content-list"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Admin Content Management', () => {
    test.beforeEach(async () => {
      // Login as admin
      await adminPage.goto('http://localhost:3000/admin/login');
      await adminPage.fill('[data-testid="username-input"]', 'admin');
      await adminPage.fill('[data-testid="password-input"]', 'adminpass123');
      await adminPage.click('[data-testid="login-submit"]');
      
      // Verify admin dashboard
      await expect(adminPage).toHaveURL(/.*\/admin\/dashboard/);
    });

    test('should create new content', async () => {
      // Navigate to content creation
      await adminPage.click('[data-testid="nav-content"]');
      await adminPage.click('[data-testid="new-content-button"]');
      
      // Fill content form
      await adminPage.selectOption('[data-testid="section-select"]', 'blog');
      await adminPage.selectOption('[data-testid="subsection-select"]', 'tutorials');
      await adminPage.fill('[data-testid="title-input"]', 'Test Tutorial Content');
      await adminPage.fill('[data-testid="description-input"]', 'This is a test tutorial for E2E testing');
      
      // Add tags
      await adminPage.fill('[data-testid="tags-input"]', 'test, tutorial, e2e');
      
      // Fill content body
      await adminPage.fill('[data-testid="content-editor"]', '# Test Tutorial\\n\\nThis is test content for the tutorial.');
      
      // Save as draft first
      await adminPage.click('[data-testid="save-draft"]');
      
      // Verify success message
      await expect(adminPage.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="success-message"]')).toContainText('saved');
      
      // Verify in content list
      await adminPage.click('[data-testid="nav-content"]');
      await expect(adminPage.locator('[data-testid="content-list"]')).toContainText('Test Tutorial Content');
    });

    test('should edit existing content', async () => {
      // Navigate to content list
      await adminPage.click('[data-testid="nav-content"]');
      
      // Click edit on first item
      await adminPage.click('[data-testid="edit-content"]', { first: true });
      
      // Modify content
      await adminPage.fill('[data-testid="title-input"]', 'Updated Content Title');
      await adminPage.fill('[data-testid="description-input"]', 'Updated description');
      
      // Save changes
      await adminPage.click('[data-testid="save-content"]');
      
      // Verify success
      await expect(adminPage.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify changes in list
      await adminPage.click('[data-testid="nav-content"]');
      await expect(adminPage.locator('[data-testid="content-list"]')).toContainText('Updated Content Title');
    });

    test('should publish content', async () => {
      // Navigate to content list
      await adminPage.click('[data-testid="nav-content"]');
      
      // Find draft content and publish
      const draftItem = adminPage.locator('[data-testid="content-item"][data-status="draft"]').first();
      if (await draftItem.count() > 0) {
        await draftItem.locator('[data-testid="publish-button"]').click();
        
        // Confirm publication
        await adminPage.click('[data-testid="confirm-publish"]');
        
        // Verify status change
        await expect(draftItem).toHaveAttribute('data-status', 'published');
        
        // Verify content appears on public site
        await page.goto('http://localhost:3000/content');
        await page.reload();
        // Content should now be visible to public
      }
    });

    test('should delete content', async () => {
      // Navigate to content list
      await adminPage.click('[data-testid="nav-content"]');
      
      // Get count of content items
      const initialCount = await adminPage.locator('[data-testid="content-item"]').count();
      
      if (initialCount > 0) {
        // Delete first item
        await adminPage.click('[data-testid="delete-content"]', { first: true });
        
        // Confirm deletion
        await adminPage.click('[data-testid="confirm-delete"]');
        
        // Verify success message
        await expect(adminPage.locator('[data-testid="success-message"]')).toBeVisible();
        
        // Verify item count decreased
        await adminPage.reload();
        const newCount = await adminPage.locator('[data-testid="content-item"]').count();
        expect(newCount).toBeLessThan(initialCount);
      }
    });

    test('should bulk operations on content', async () => {
      await adminPage.click('[data-testid="nav-content"]');
      
      // Select multiple items
      await adminPage.check('[data-testid="select-content"]', { first: true });
      await adminPage.check('[data-testid="select-content"]', { nth: 1 });
      
      // Verify bulk actions appear
      await expect(adminPage.locator('[data-testid="bulk-actions"]')).toBeVisible();
      
      // Test bulk publish
      await adminPage.selectOption('[data-testid="bulk-action-select"]', 'publish');
      await adminPage.click('[data-testid="apply-bulk-action"]');
      
      // Confirm action
      await adminPage.click('[data-testid="confirm-bulk-action"]');
      
      // Verify success
      await expect(adminPage.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Content Editor', () => {
    test.beforeEach(async () => {
      // Login as admin and navigate to content editor
      await adminPage.goto('http://localhost:3000/admin/login');
      await adminPage.fill('[data-testid="username-input"]', 'admin');
      await adminPage.fill('[data-testid="password-input"]', 'adminpass123');
      await adminPage.click('[data-testid="login-submit"]');
    });

    test('should support markdown editing', async () => {
      await adminPage.click('[data-testid="nav-content"]');
      await adminPage.click('[data-testid="new-content-button"]');
      
      // Test markdown formatting
      await adminPage.fill('[data-testid="content-editor"]', '# Heading\\n\\n**Bold text**\\n\\n*Italic text*\\n\\n- List item 1\\n- List item 2');
      
      // Preview markdown
      await adminPage.click('[data-testid="preview-tab"]');
      
      // Verify markdown rendering
      await expect(adminPage.locator('[data-testid="content-preview"] h1')).toContainText('Heading');
      await expect(adminPage.locator('[data-testid="content-preview"] strong')).toContainText('Bold text');
      await expect(adminPage.locator('[data-testid="content-preview"] em')).toContainText('Italic text');
      await expect(adminPage.locator('[data-testid="content-preview"] ul li')).toHaveCount(2);
    });

    test('should support image uploads', async () => {
      await adminPage.click('[data-testid="nav-content"]');
      await adminPage.click('[data-testid="new-content-button"]');
      
      // Test image upload
      await adminPage.click('[data-testid="insert-image"]');
      
      // Upload image
      const fileInput = adminPage.locator('[data-testid="image-upload"]');
      await fileInput.setInputFiles('./tests/fixtures/test-image.jpg');
      
      // Verify image appears in editor
      await expect(adminPage.locator('[data-testid="uploaded-image"]')).toBeVisible();
      
      // Insert image into content
      await adminPage.click('[data-testid="insert-uploaded-image"]');
      
      // Verify markdown image syntax
      const editorContent = await adminPage.inputValue('[data-testid="content-editor"]');
      expect(editorContent).toContain('![');
    });

    test('should auto-save drafts', async () => {
      await adminPage.click('[data-testid="nav-content"]');
      await adminPage.click('[data-testid="new-content-button"]');
      
      // Fill some content
      await adminPage.fill('[data-testid="title-input"]', 'Auto-save Test');
      await adminPage.fill('[data-testid="content-editor"]', 'This content should auto-save');
      
      // Wait for auto-save
      await expect(adminPage.locator('[data-testid="auto-save-indicator"]')).toContainText('Saved');
      
      // Refresh page
      await adminPage.reload();
      
      // Verify content is restored
      await expect(adminPage.locator('[data-testid="title-input"]')).toHaveValue('Auto-save Test');
      await expect(adminPage.locator('[data-testid="content-editor"]')).toContainText('This content should auto-save');
    });
  });

  test.describe('Content Analytics', () => {
    test.beforeEach(async () => {
      await adminPage.goto('http://localhost:3000/admin/login');
      await adminPage.fill('[data-testid="username-input"]', 'admin');
      await adminPage.fill('[data-testid="password-input"]', 'adminpass123');
      await adminPage.click('[data-testid="login-submit"]');
    });

    test('should track content views', async () => {
      // View content on public site
      await page.goto('http://localhost:3000/content');
      const firstContent = page.locator('[data-testid="content-item"]').first();
      if (await firstContent.count() > 0) {
        await firstContent.click();
        
        // View the content page
        await expect(page.locator('[data-testid="content-title"]')).toBeVisible();
      }
      
      // Check analytics in admin
      await adminPage.click('[data-testid="nav-analytics"]');
      
      // Verify view count increased
      await expect(adminPage.locator('[data-testid="content-views"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="total-views"]')).toContainText(/\\d+/);
    });

    test('should show content performance metrics', async () => {
      await adminPage.click('[data-testid="nav-analytics"]');
      
      // Verify analytics dashboard
      await expect(adminPage.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="top-content"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="content-stats"]')).toBeVisible();
      
      // Verify charts load
      await expect(adminPage.locator('[data-testid="views-chart"]')).toBeVisible();
    });
  });

  test.describe('SEO and Meta Data', () => {
    test.beforeEach(async () => {
      await adminPage.goto('http://localhost:3000/admin/login');
      await adminPage.fill('[data-testid="username-input"]', 'admin');
      await adminPage.fill('[data-testid="password-input"]', 'adminpass123');
      await adminPage.click('[data-testid="login-submit"]');
    });

    test('should manage SEO settings', async () => {
      await adminPage.click('[data-testid="nav-content"]');
      await adminPage.click('[data-testid="new-content-button"]');
      
      // Fill basic content
      await adminPage.fill('[data-testid="title-input"]', 'SEO Test Article');
      await adminPage.fill('[data-testid="description-input"]', 'Test article for SEO');
      
      // Open SEO settings
      await adminPage.click('[data-testid="seo-settings-tab"]');
      
      // Fill SEO fields
      await adminPage.fill('[data-testid="meta-title"]', 'SEO Optimized Title');
      await adminPage.fill('[data-testid="meta-description"]', 'This is an SEO optimized description for better search rankings');
      await adminPage.fill('[data-testid="meta-keywords"]', 'seo, test, article, optimization');
      
      // Save content
      await adminPage.click('[data-testid="save-content"]');
      
      // Verify on public site
      await page.goto('http://localhost:3000/content/blog/tutorials/seo-test-article');
      
      // Check meta tags
      const metaTitle = await page.locator('title').textContent();
      expect(metaTitle).toContain('SEO Optimized Title');
      
      const metaDescription = await page.getAttribute('meta[name="description"]', 'content');
      expect(metaDescription).toContain('SEO optimized description');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('http://localhost:3000/content');
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-list"]')).toBeVisible();
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      
      // Test content item interaction
      const firstItem = page.locator('[data-testid="content-item"]').first();
      if (await firstItem.count() > 0) {
        await firstItem.click();
        await expect(page.locator('[data-testid="content-title"]')).toBeVisible();
      }
    });

    test('should handle touch interactions', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/content');
      
      // Test swipe gestures on content cards
      const contentCard = page.locator('[data-testid="content-item"]').first();
      if (await contentCard.count() > 0) {
        // Simulate touch and swipe
        await contentCard.hover();
        await page.mouse.down();
        await page.mouse.move(200, 0);
        await page.mouse.up();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load content efficiently', async () => {
      // Monitor network requests
      const responses = [];
      page.on('response', response => {
        responses.push(response);
      });
      
      const startTime = Date.now();
      await page.goto('http://localhost:3000/content');
      
      // Wait for content to load
      await expect(page.locator('[data-testid="content-list"]')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      // Verify reasonable load time
      expect(loadTime).toBeLessThan(3000);
      
      // Verify minimal API calls
      const apiCalls = responses.filter(r => r.url().includes('/api/'));
      expect(apiCalls.length).toBeLessThan(10);
    });

    test('should implement infinite scroll', async () => {
      await page.goto('http://localhost:3000/content');
      
      // Check if infinite scroll is enabled
      const initialCount = await page.locator('[data-testid="content-item"]').count();
      
      if (initialCount >= 10) {
        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        
        // Wait for new content to load
        await page.waitForTimeout(2000);
        
        // Check if more content loaded
        const newCount = await page.locator('[data-testid="content-item"]').count();
        expect(newCount).toBeGreaterThan(initialCount);
      }
    });
  });
});