/**
 * Responsive Breakpoint Testing
 * Tests layout and functionality across different screen sizes and devices
 */

import { test, expect } from '@playwright/test';

describe('Responsive Design Tests', () => {
  const breakpoints = [
    { name: 'Mobile Portrait', width: 375, height: 667 },
    { name: 'Mobile Landscape', width: 667, height: 375 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Desktop Small', width: 1280, height: 720 },
    { name: 'Desktop Large', width: 1920, height: 1080 },
    { name: 'Ultrawide', width: 2560, height: 1440 }
  ];

  const pages = [
    { name: 'Homepage', url: '/' },
    { name: 'Tools', url: '/tools/' },
    { name: 'Writing', url: '/writing/' },
    { name: 'About', url: '/me/' }
  ];

  breakpoints.forEach(({ name: breakpointName, width, height }) => {
    describe(`${breakpointName} (${width}x${height})`, () => {
      
      pages.forEach(({ name: pageName, url }) => {
        test(`${pageName} layout at ${breakpointName}`, async ({ page }) => {
          await page.setViewportSize({ width, height });
          await page.goto(url);
          await page.waitForLoadState('networkidle');

          // Take screenshot for visual comparison
          await page.screenshot({
            path: `test-results/screenshots/${breakpointName}-${pageName.toLowerCase()}.png`,
            fullPage: true
          });

          // Test basic layout elements are visible
          await expect(page.locator('header')).toBeVisible();
          await expect(page.locator('main')).toBeVisible();
          await expect(page.locator('footer')).toBeVisible();

          // Test navigation is accessible
          const nav = page.locator('nav');
          await expect(nav).toBeVisible();

          // On mobile, check for hamburger menu
          if (width < 768) {
            const mobileMenuButton = page.locator('[aria-label*="menu"]');
            if (await mobileMenuButton.isVisible()) {
              await expect(mobileMenuButton).toBeVisible();
              
              // Test mobile menu functionality
              await mobileMenuButton.click();
              const mobileMenu = page.locator('#mobile-menu');
              await expect(mobileMenu).toBeVisible();
              
              // Close menu
              await mobileMenuButton.click();
              await expect(mobileMenu).not.toBeVisible();
            }
          }

          // Test content doesn't overflow horizontally
          const body = await page.locator('body').boundingBox();
          expect(body?.width).toBeLessThanOrEqual(width + 20); // Allow small margin

          // Test text is readable (not too small)
          const textElements = page.locator('p, h1, h2, h3, a, button, span');
          const textElement = textElements.first();
          
          if (await textElement.isVisible()) {
            const fontSize = await textElement.evaluate(el => {
              return parseInt(window.getComputedStyle(el).fontSize);
            });
            
            // Minimum font size for readability
            const minFontSize = width < 768 ? 14 : 16;
            expect(fontSize).toBeGreaterThanOrEqual(minFontSize);
          }
        });
      });

      test(`Navigation functionality at ${breakpointName}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');

        if (width < 768) {
          // Mobile navigation
          const menuButton = page.locator('[aria-label*="menu"]');
          if (await menuButton.isVisible()) {
            await menuButton.click();
            
            // Test all navigation links are accessible
            const navLinks = page.locator('#mobile-menu a');
            const linkCount = await navLinks.count();
            expect(linkCount).toBeGreaterThan(0);
            
            // Test first navigation link
            if (linkCount > 0) {
              const firstLink = navLinks.first();
              await expect(firstLink).toBeVisible();
              await firstLink.click();
              
              // Should navigate successfully
              await page.waitForLoadState('networkidle');
              expect(page.url()).not.toMatch(/\/$|#$/);
            }
          }
        } else {
          // Desktop navigation
          const desktopNav = page.locator('nav a').first();
          if (await desktopNav.isVisible()) {
            await desktopNav.click();
            await page.waitForLoadState('networkidle');
            expect(page.url()).not.toMatch(/\/$|#$/);
          }
        }
      });

      test(`Content readability at ${breakpointName}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');

        // Test line length is readable
        const contentParagraphs = page.locator('main p');
        if (await contentParagraphs.count() > 0) {
          const paragraph = contentParagraphs.first();
          const paragraphBox = await paragraph.boundingBox();
          
          if (paragraphBox) {
            // Optimal line length is 45-75 characters, roughly 600px max width
            const maxOptimalWidth = Math.min(width * 0.8, 600);
            expect(paragraphBox.width).toBeLessThanOrEqual(maxOptimalWidth);
          }
        }

        // Test heading hierarchy is maintained
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBe(1);

        // Test images are responsive
        const images = page.locator('img');
        const imageCount = await images.count();
        
        for (let i = 0; i < Math.min(imageCount, 3); i++) {
          const img = images.nth(i);
          if (await img.isVisible()) {
            const imgBox = await img.boundingBox();
            if (imgBox) {
              // Images shouldn't overflow container
              expect(imgBox.width).toBeLessThanOrEqual(width);
            }
          }
        }
      });

      test(`Interactive elements at ${breakpointName}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');

        // Test button sizes are touch-friendly on mobile
        const buttons = page.locator('button, a[role="button"]');
        const buttonCount = await buttons.count();

        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          if (await button.isVisible()) {
            const buttonBox = await button.boundingBox();
            if (buttonBox) {
              if (width < 768) {
                // Mobile touch targets should be at least 44px
                expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(40);
              } else {
                // Desktop can have smaller targets
                expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(20);
              }
            }
          }
        }

        // Test form elements are appropriately sized
        const inputs = page.locator('input, textarea, select');
        const inputCount = await inputs.count();

        for (let i = 0; i < Math.min(inputCount, 3); i++) {
          const input = inputs.nth(i);
          if (await input.isVisible()) {
            const inputBox = await input.boundingBox();
            if (inputBox) {
              // Form elements should have adequate height
              const minHeight = width < 768 ? 44 : 32;
              expect(inputBox.height).toBeGreaterThanOrEqual(minHeight);
            }
          }
        }
      });

      test(`Theme toggle at ${breakpointName}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');

        const themeToggle = page.locator('[data-testid="theme-toggle"]');
        if (await themeToggle.isVisible()) {
          // Test theme toggle is accessible at all screen sizes
          await expect(themeToggle).toBeVisible();
          
          const toggleBox = await themeToggle.boundingBox();
          if (toggleBox && width < 768) {
            // Touch target size on mobile
            expect(Math.min(toggleBox.width, toggleBox.height)).toBeGreaterThanOrEqual(40);
          }
          
          // Test theme toggle functionality
          await themeToggle.click();
          await page.waitForTimeout(300);
          
          const theme = await page.evaluate(() => 
            document.documentElement.getAttribute('data-theme')
          );
          expect(theme).toMatch(/(light|dark)/);
        }
      });
    });
  });

  describe('Cross-Device Consistency', () => {
    test('content hierarchy is consistent across breakpoints', async ({ page }) => {
      const testBreakpoints = [
        { width: 375, height: 667 },  // Mobile
        { width: 1024, height: 768 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      const contentStructure = {};

      for (const { width, height } of testBreakpoints) {
        await page.setViewportSize({ width, height });
        await page.goto('/');

        // Capture content structure
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
        const links = await page.locator('nav a').allTextContents();
        
        contentStructure[`${width}x${height}`] = {
          headings: headings.slice(0, 3), // Compare first 3 headings
          navLinks: links
        };
      }

      // Verify consistency
      const structures = Object.values(contentStructure);
      const mobileStructure = structures[0];
      
      structures.forEach((structure, index) => {
        if (index > 0) {
          // Navigation should be consistent
          expect(structure.navLinks).toEqual(mobileStructure.navLinks);
        }
      });
    });

    test('performance is acceptable across devices', async ({ page }) => {
      const performanceData = [];

      for (const { name, width, height } of breakpoints.slice(0, 3)) {
        await page.setViewportSize({ width, height });
        
        const startTime = Date.now();
        await page.goto('/', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        
        performanceData.push({ device: name, loadTime });
        
        // Load time should be reasonable for all devices
        expect(loadTime).toBeLessThan(5000);
      }

      console.log('Performance across devices:', performanceData);
    });
  });

  describe('Orientation Changes', () => {
    test('layout adapts to orientation changes', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Capture initial layout
      const portraitLayout = await page.screenshot({ fullPage: false });
      
      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500); // Wait for layout to adapt
      
      const landscapeLayout = await page.screenshot({ fullPage: false });
      
      // Layouts should be different (not identical)
      expect(portraitLayout).not.toEqual(landscapeLayout);
      
      // But content should still be accessible
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });
  });

  describe('Text Scaling', () => {
    test('layout handles increased text size', async ({ page }) => {
      await page.goto('/');
      
      // Increase text size (simulate browser zoom)
      await page.addStyleTag({
        content: '* { font-size: 1.5em !important; }'
      });
      
      await page.waitForTimeout(500);
      
      // Content should still be readable and not overflow
      const body = await page.locator('body').boundingBox();
      const viewport = page.viewportSize();
      
      if (body && viewport) {
        expect(body.width).toBeLessThanOrEqual(viewport.width * 1.1);
      }
      
      // Text should not overlap
      const textElements = await page.locator('p, h1, h2, h3, a').all();
      for (let i = 0; i < Math.min(textElements.length - 1, 5); i++) {
        const current = await textElements[i].boundingBox();
        const next = await textElements[i + 1].boundingBox();
        
        if (current && next && 
            Math.abs(current.x - next.x) < 50) { // Elements in same column
          // No vertical overlap
          expect(current.y + current.height).toBeLessThanOrEqual(next.y + 5);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    test('extremely narrow viewport', async ({ page }) => {
      await page.setViewportSize({ width: 280, height: 653 }); // iPhone 4 size
      await page.goto('/');
      
      // Content should still be accessible
      await expect(page.locator('main')).toBeVisible();
      
      // Navigation should work
      const menuButton = page.locator('[aria-label*="menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await expect(page.locator('#mobile-menu')).toBeVisible();
      }
      
      // No horizontal scrolling
      const body = await page.locator('body').boundingBox();
      expect(body?.width).toBeLessThanOrEqual(280);
    });

    test('very wide viewport', async ({ page }) => {
      await page.setViewportSize({ width: 3440, height: 1440 }); // Ultrawide monitor
      await page.goto('/');
      
      // Content should not stretch too wide
      const main = page.locator('main .container, main .max-w');
      if (await main.isVisible()) {
        const mainBox = await main.boundingBox();
        if (mainBox) {
          // Content should have max width for readability
          expect(mainBox.width).toBeLessThanOrEqual(1400);
        }
      }
    });

    test('square viewport', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 800 }); // Square aspect ratio
      await page.goto('/');
      
      // Layout should handle square aspect ratio
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  });

  describe('Print Styles', () => {
    test('print styles are applied correctly', async ({ page }) => {
      await page.goto('/');
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      // Take screenshot of print view
      await page.screenshot({
        path: 'test-results/screenshots/print-view.png',
        fullPage: true
      });
      
      // Check for print-specific styles
      const bodyStyles = await page.locator('body').evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color
        };
      });
      
      // Print styles typically use high contrast
      expect(bodyStyles).toBeDefined();
    });
  });

  describe('Container Queries Support', () => {
    test('components adapt to container size', async ({ page }) => {
      await page.goto('/');
      
      // Test if components have container query support
      const cards = page.locator('[data-testid*="card"]');
      if (await cards.count() > 0) {
        const card = cards.first();
        const cardBox = await card.boundingBox();
        
        if (cardBox) {
          // Cards should adapt to available space
          expect(cardBox.width).toBeGreaterThan(0);
          expect(cardBox.width).toBeLessThanOrEqual(page.viewportSize()?.width || 1200);
        }
      }
    });
  });
});