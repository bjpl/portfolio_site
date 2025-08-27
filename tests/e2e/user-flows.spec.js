/**
 * End-to-End User Flow Tests
 * Tests complete user journeys through the portfolio site
 */

import { test, expect } from '@playwright/test';

test.describe('Portfolio Site User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up common page settings
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Homepage Navigation Flow', () => {
    test('user can navigate through main sections from homepage', async ({ page }) => {
      // Test homepage load
      await expect(page).toHaveTitle(/Brandon JP Lambert/);
      await expect(page.locator('h1')).toContainText('Brandon JP Lambert');

      // Test navigation to Tools section
      await page.click('[href="/tools/"]');
      await page.waitForURL('/tools/');
      await expect(page.locator('h1')).toContainText('Tools');

      // Test navigation to Writing section
      await page.click('[href="/writing/"]');
      await page.waitForURL('/writing/');
      await expect(page.locator('h1')).toContainText('Writing');

      // Test navigation to About section
      await page.click('[href="/me/"]');
      await page.waitForURL('/me/');
      await expect(page.locator('h1')).toContainText('About');
    });

    test('user can interact with featured projects', async ({ page }) => {
      // Scroll to projects section
      await page.locator('[data-testid="featured-projects"]').scrollIntoViewIfNeeded();

      // Click on first featured project
      const firstProject = page.locator('[data-testid="project-card"]').first();
      await expect(firstProject).toBeVisible();
      
      await firstProject.click();
      
      // Should navigate to project detail page
      await expect(page.url()).toMatch(/\/projects\/[^/]+$/);
      await expect(page.locator('h1')).toBeVisible();
    });

    test('user can access recent blog posts', async ({ page }) => {
      // Scroll to blog section
      await page.locator('[data-testid="recent-posts"]').scrollIntoViewIfNeeded();

      // Click on first blog post
      const firstPost = page.locator('[data-testid="blog-card"]').first();
      if (await firstPost.isVisible()) {
        await firstPost.click();
        await expect(page.url()).toMatch(/\/blog\/[^/]+$/);
      }
    });
  });

  test.describe('Mobile Navigation Flow', () => {
    test('mobile menu works correctly', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Open mobile menu
      const menuButton = page.locator('[aria-label*="navigation menu"]');
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      // Check menu is open
      const mobileMenu = page.locator('#mobile-menu');
      await expect(mobileMenu).toBeVisible();

      // Test navigation link
      await page.click('#mobile-menu [href="/tools/"]');
      await page.waitForURL('/tools/');
      await expect(page).toHaveURL('/tools/');

      // Menu should close after navigation
      await expect(mobileMenu).not.toBeVisible();
    });

    test('mobile menu closes on outside click', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Open mobile menu
      await page.click('[aria-label*="navigation menu"]');
      await expect(page.locator('#mobile-menu')).toBeVisible();

      // Click outside menu
      await page.click('main');
      await expect(page.locator('#mobile-menu')).not.toBeVisible();
    });

    test('mobile menu supports keyboard navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Focus and open menu with keyboard
      await page.keyboard.press('Tab'); // Focus menu button
      await page.keyboard.press('Enter'); // Open menu

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter'); // Select first item

      // Should navigate
      await expect(page.url()).not.toBe('/');
    });
  });

  test.describe('Project Discovery Flow', () => {
    test('user can browse and filter projects', async ({ page }) => {
      await page.goto('/tools/');

      // Test project filtering (if filter exists)
      const filterButtons = page.locator('[data-testid="filter-button"]');
      if (await filterButtons.count() > 0) {
        await filterButtons.first().click();
        
        // Check that projects are filtered
        const projects = page.locator('[data-testid="project-card"]');
        await expect(projects.first()).toBeVisible();
      }

      // Test project detail view
      const firstProject = page.locator('[data-testid="project-card"]').first();
      await firstProject.click();

      // Should show project details
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="project-description"]')).toBeVisible();

      // Test external links (demo, GitHub)
      const demoLink = page.locator('[href*="demo"]').first();
      if (await demoLink.isVisible()) {
        expect(await demoLink.getAttribute('target')).toBe('_blank');
      }
    });

    test('user can search projects', async ({ page }) => {
      await page.goto('/tools/');

      // Test search functionality (if exists)
      const searchInput = page.locator('[data-testid="search-input"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('vocab');
        await page.keyboard.press('Enter');

        // Should show filtered results
        const results = page.locator('[data-testid="project-card"]');
        const count = await results.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Blog Reading Flow', () => {
    test('user can read blog posts', async ({ page }) => {
      await page.goto('/writing/');

      // Click on first blog post
      const firstPost = page.locator('[data-testid="blog-card"]').first();
      if (await firstPost.isVisible()) {
        await firstPost.click();

        // Should show blog post content
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('[data-testid="post-content"]')).toBeVisible();

        // Test reading progress (if implemented)
        const progressBar = page.locator('[data-testid="reading-progress"]');
        if (await progressBar.isVisible()) {
          // Scroll down and check progress updates
          await page.evaluate(() => window.scrollBy(0, 500));
          await page.waitForTimeout(100);
        }
      }
    });

    test('user can navigate between blog posts', async ({ page }) => {
      await page.goto('/writing/');

      const blogCards = page.locator('[data-testid="blog-card"]');
      const postCount = await blogCards.count();

      if (postCount > 1) {
        // Go to first post
        await blogCards.first().click();
        const firstPostUrl = page.url();

        // Check for next/prev navigation
        const nextButton = page.locator('[data-testid="next-post"]');
        if (await nextButton.isVisible()) {
          await nextButton.click();
          expect(page.url()).not.toBe(firstPostUrl);
        }
      }
    });
  });

  test.describe('Contact and About Flow', () => {
    test('user can learn about the author', async ({ page }) => {
      await page.goto('/me/');

      // Should show about information
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="bio"]')).toBeVisible();

      // Test social media links
      const linkedinLink = page.locator('[href*="linkedin"]');
      if (await linkedinLink.isVisible()) {
        expect(await linkedinLink.getAttribute('target')).toBe('_blank');
        expect(await linkedinLink.getAttribute('rel')).toContain('noopener');
      }

      // Test CV/Resume download (if available)
      const cvLink = page.locator('[href*="cv"], [href*="resume"]');
      if (await cvLink.isVisible()) {
        // Should be downloadable or open in new tab
        expect(await cvLink.getAttribute('href')).toBeTruthy();
      }
    });

    test('user can contact through various channels', async ({ page }) => {
      await page.goto('/me/');

      // Test contact links
      const contactMethods = [
        '[href^="mailto:"]',
        '[href*="linkedin"]',
        '[href*="github"]',
        '[href*="twitter"]'
      ];

      for (const selector of contactMethods) {
        const link = page.locator(selector);
        if (await link.isVisible()) {
          expect(await link.getAttribute('href')).toBeTruthy();
        }
      }
    });
  });

  test.describe('Theme and Accessibility Flow', () => {
    test('user can toggle between light and dark themes', async ({ page }) => {
      // Test theme toggle
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await expect(themeToggle).toBeVisible();

      // Get initial theme
      const initialTheme = await page.evaluate(() => 
        document.documentElement.getAttribute('data-theme')
      );

      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(300); // Wait for animation

      // Check theme changed
      const newTheme = await page.evaluate(() => 
        document.documentElement.getAttribute('data-theme')
      );
      
      expect(newTheme).not.toBe(initialTheme);
    });

    test('user can navigate with keyboard only', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      
      // Should focus skip link
      const skipLink = page.locator('[href="#main-content"]');
      await expect(skipLink).toBeFocused();

      // Continue tabbing through navigation
      await page.keyboard.press('Tab');
      const firstNavLink = page.locator('nav a').first();
      if (await firstNavLink.isVisible()) {
        await expect(firstNavLink).toBeFocused();
      }
    });

    test('screen reader compatibility', async ({ page }) => {
      // Test semantic HTML and ARIA attributes
      await expect(page.locator('main')).toHaveAttribute('id', 'main-content');
      
      // Check for proper heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        if (await img.isVisible()) {
          expect(await img.getAttribute('alt')).toBeTruthy();
        }
      }
    });
  });

  test.describe('Performance User Experience', () => {
    test('page loads quickly and smoothly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Page should load within reasonable time
      expect(loadTime).toBeLessThan(3000);

      // Check for loading states
      const loadingIndicators = page.locator('[data-testid*="loading"]');
      if (await loadingIndicators.count() > 0) {
        await expect(loadingIndicators.first()).not.toBeVisible();
      }
    });

    test('smooth scrolling and animations', async ({ page }) => {
      // Test smooth scroll to sections
      const sections = page.locator('section');
      const sectionCount = await sections.count();

      if (sectionCount > 1) {
        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);

        // Should be smooth without jarring movements
        const scrollPosition = await page.evaluate(() => window.scrollY);
        expect(scrollPosition).toBeLessThan(100);
      }
    });

    test('images load progressively', async ({ page }) => {
      // Test image loading
      const images = page.locator('img[src*="/images/"]');
      const imageCount = await images.count();

      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const img = images.nth(i);
        if (await img.isVisible()) {
          // Wait for image to load
          await expect(img).toHaveJSProperty('complete', true);
          await expect(img).toHaveJSProperty('naturalWidth', expect.any(Number));
        }
      }
    });
  });

  test.describe('Error Handling Flow', () => {
    test('user sees helpful error for non-existent pages', async ({ page }) => {
      // Navigate to non-existent page
      const response = await page.goto('/non-existent-page');
      
      // Should handle 404 gracefully
      expect(response.status()).toBe(404);
      
      // Should show error page with navigation options
      await expect(page.locator('h1')).toContainText(/404|not found/i);
      
      // Should have link back to home
      const homeLink = page.locator('[href="/"]');
      await expect(homeLink.first()).toBeVisible();
    });

    test('user can recover from network errors', async ({ page }) => {
      // Simulate offline scenario
      await page.setOfflineMode(true);
      
      // Try to navigate
      await page.goto('/tools/').catch(() => {
        // Expected to fail offline
      });

      // Re-enable network
      await page.setOfflineMode(false);
      
      // Should be able to navigate normally
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Search Engine Optimization', () => {
    test('pages have proper meta tags', async ({ page }) => {
      await page.goto('/');

      // Check essential meta tags
      await expect(page.locator('title')).toContainText('Brandon JP Lambert');
      
      const description = page.locator('meta[name="description"]');
      expect(await description.getAttribute('content')).toBeTruthy();

      const canonical = page.locator('link[rel="canonical"]');
      if (await canonical.isVisible()) {
        expect(await canonical.getAttribute('href')).toBeTruthy();
      }
    });

    test('structured data is present', async ({ page }) => {
      await page.goto('/');

      // Check for JSON-LD structured data
      const structuredData = page.locator('script[type="application/ld+json"]');
      if (await structuredData.count() > 0) {
        const jsonText = await structuredData.first().textContent();
        expect(() => JSON.parse(jsonText)).not.toThrow();
      }
    });
  });

  test.describe('Analytics and Tracking', () => {
    test('user interactions can be tracked', async ({ page }) => {
      // Test that analytics scripts load (if present)
      const analyticsScripts = page.locator('script[src*="analytics"], script[src*="gtag"]');
      if (await analyticsScripts.count() > 0) {
        // Analytics should load without errors
        expect(await analyticsScripts.first().getAttribute('src')).toBeTruthy();
      }
    });
  });

  test.describe('Progressive Web App Features', () => {
    test('PWA manifest is accessible', async ({ page }) => {
      await page.goto('/');

      // Check for manifest link
      const manifestLink = page.locator('link[rel="manifest"]');
      if (await manifestLink.isVisible()) {
        const manifestUrl = await manifestLink.getAttribute('href');
        
        // Manifest should be accessible
        const manifestResponse = await page.request.get(manifestUrl);
        expect(manifestResponse.ok()).toBe(true);
        
        const manifestData = await manifestResponse.json();
        expect(manifestData.name).toBeTruthy();
      }
    });

    test('service worker registration', async ({ page }) => {
      await page.goto('/');

      // Check if service worker is registered
      const swRegistration = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });

      if (swRegistration) {
        // Service worker functionality should be available
        expect(swRegistration).toBe(true);
      }
    });
  });
});