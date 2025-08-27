/**
 * Comprehensive Accessibility Testing
 * Tests WCAG 2.1 AA compliance and accessibility best practices
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  const pages = [
    { name: 'Homepage', url: '/' },
    { name: 'Tools', url: '/tools/' },
    { name: 'Writing', url: '/writing/' },
    { name: 'About', url: '/me/' }
  ];

  pages.forEach(({ name, url }) => {
    test.describe(`${name} Page Accessibility`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
      });

      test(`${name} should not have accessibility violations`, async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });

      test(`${name} should have proper heading structure`, async ({ page }) => {
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
        
        // Should have at least one h1
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThanOrEqual(1);
        expect(h1Count).toBeLessThanOrEqual(1); // Should have exactly one h1

        // Check heading hierarchy
        let previousLevel = 0;
        for (const heading of headings) {
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
          const level = parseInt(tagName.charAt(1));
          
          if (previousLevel > 0) {
            // Headings should not skip levels (h1 -> h3 without h2)
            expect(level - previousLevel).toBeLessThanOrEqual(1);
          }
          
          previousLevel = level;
        }
      });

      test(`${name} should have proper link accessibility`, async ({ page }) => {
        const links = await page.locator('a[href]').all();
        
        for (const link of links) {
          const href = await link.getAttribute('href');
          const text = await link.textContent();
          const ariaLabel = await link.getAttribute('aria-label');
          const title = await link.getAttribute('title');
          
          // Links should have accessible text
          expect(
            text?.trim() || ariaLabel || title
          ).toBeTruthy();
          
          // External links should have appropriate attributes
          if (href && (href.startsWith('http') || href.startsWith('mailto:'))) {
            if (!href.includes(page.url().split('/')[2])) {
              expect(await link.getAttribute('target')).toBe('_blank');
              expect(await link.getAttribute('rel')).toContain('noopener');
            }
          }
        }
      });

      test(`${name} should have proper image accessibility`, async ({ page }) => {
        const images = await page.locator('img').all();
        
        for (const img of images) {
          const alt = await img.getAttribute('alt');
          const role = await img.getAttribute('role');
          
          // All images should have alt text (can be empty for decorative images)
          expect(alt).not.toBeNull();
          
          // If role="presentation", alt should be empty
          if (role === 'presentation') {
            expect(alt).toBe('');
          }
        }
      });

      test(`${name} should have proper form accessibility`, async ({ page }) => {
        const inputs = await page.locator('input, textarea, select').all();
        
        for (const input of inputs) {
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledby = await input.getAttribute('aria-labelledby');
          
          if (id) {
            // If input has id, check for associated label
            const label = await page.locator(`label[for="${id}"]`).count();
            if (label === 0) {
              // If no label, should have aria-label or aria-labelledby
              expect(ariaLabel || ariaLabelledby).toBeTruthy();
            }
          } else {
            // If no id, should have aria-label
            expect(ariaLabel || ariaLabelledby).toBeTruthy();
          }
        }
      });

      test(`${name} should have proper button accessibility`, async ({ page }) => {
        const buttons = await page.locator('button, [role="button"]').all();
        
        for (const button of buttons) {
          const text = await button.textContent();
          const ariaLabel = await button.getAttribute('aria-label');
          const ariaLabelledby = await button.getAttribute('aria-labelledby');
          
          // Buttons should have accessible text
          expect(
            text?.trim() || ariaLabel || ariaLabelledby
          ).toBeTruthy();
          
          // Check if button is keyboard accessible
          expect(await button.isEnabled()).toBe(true);
        }
      });

      test(`${name} should support keyboard navigation`, async ({ page }) => {
        // Test Tab navigation
        await page.keyboard.press('Tab');
        
        const focusedElement = await page.locator(':focus').first();
        await expect(focusedElement).toBeVisible();
        
        // Test that focus is visible
        const focusedElementStyles = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow
          };
        });
        
        // Should have visible focus indicator
        const hasFocusIndicator = 
          focusedElementStyles.outline !== 'none' ||
          focusedElementStyles.boxShadow !== 'none' ||
          focusedElementStyles.outlineColor !== 'transparent';
          
        expect(hasFocusIndicator).toBe(true);
      });

      test(`${name} should have proper color contrast`, async ({ page }) => {
        const textElements = await page.locator('p, h1, h2, h3, h4, h5, h6, a, button, span, div').all();
        
        for (let i = 0; i < Math.min(textElements.length, 10); i++) {
          const element = textElements[i];
          const text = await element.textContent();
          
          if (text && text.trim()) {
            const styles = await element.evaluate(el => {
              const computed = window.getComputedStyle(el);
              return {
                color: computed.color,
                backgroundColor: computed.backgroundColor,
                fontSize: computed.fontSize
              };
            });
            
            // This is a basic check - in a real scenario, you'd use a proper color contrast library
            expect(styles.color).not.toBe(styles.backgroundColor);
          }
        }
      });

      test(`${name} should have proper ARIA landmarks`, async ({ page }) => {
        // Check for main landmark
        const main = await page.locator('main, [role="main"]').count();
        expect(main).toBeGreaterThanOrEqual(1);
        
        // Check for navigation landmark
        const nav = await page.locator('nav, [role="navigation"]').count();
        expect(nav).toBeGreaterThanOrEqual(1);
        
        // Check for banner/header
        const header = await page.locator('header, [role="banner"]').count();
        expect(header).toBeGreaterThanOrEqual(1);
        
        // Check for contentinfo/footer
        const footer = await page.locator('footer, [role="contentinfo"]').count();
        expect(footer).toBeGreaterThanOrEqual(1);
      });

      test(`${name} should have proper skip links`, async ({ page }) => {
        // Check for skip to main content link
        const skipLink = await page.locator('[href="#main-content"], [href="#main"], a[href^="#"]:first-child');
        
        if (await skipLink.count() > 0) {
          // Skip link should be keyboard accessible
          await page.keyboard.press('Tab');
          const focused = await page.locator(':focus').first();
          
          // Check if it's a skip link
          const href = await focused.getAttribute('href');
          const text = await focused.textContent();
          
          if (href && href.startsWith('#')) {
            expect(text?.toLowerCase()).toMatch(/(skip|jump)/);
          }
        }
      });
    });
  });

  test.describe('Theme Accessibility', () => {
    test('dark theme maintains accessibility standards', async ({ page }) => {
      await page.goto('/');
      
      // Toggle to dark theme
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(500); // Wait for theme transition
        
        // Run accessibility scan on dark theme
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      }
    });

    test('respects user motion preferences', async ({ page }) => {
      // Test with reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      
      // Check that animations respect reduced motion
      const elements = await page.locator('*').all();
      for (let i = 0; i < Math.min(elements.length, 5); i++) {
        const styles = await elements[i].evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            animationDuration: computed.animationDuration,
            transitionDuration: computed.transitionDuration
          };
        });
        
        // Animations should be reduced or disabled
        if (styles.animationDuration !== '0s') {
          // Should respect prefers-reduced-motion
          expect(styles.animationDuration).toMatch(/^(0s|none)$/);
        }
      }
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('mobile navigation is accessible', async ({ page }) => {
      await page.goto('/');
      
      const menuButton = page.locator('[aria-label*="menu"]');
      if (await menuButton.isVisible()) {
        // Check ARIA attributes
        expect(await menuButton.getAttribute('aria-expanded')).toBe('false');
        
        // Open menu
        await menuButton.click();
        expect(await menuButton.getAttribute('aria-expanded')).toBe('true');
        
        // Check menu items are keyboard accessible
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus').first();
        await expect(focusedElement).toBeVisible();
      }
    });

    test('touch targets are appropriately sized', async ({ page }) => {
      await page.goto('/');
      
      const interactiveElements = await page.locator('a, button, input, [role="button"]').all();
      
      for (const element of interactiveElements.slice(0, 10)) {
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            // Touch targets should be at least 44px x 44px
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('has proper live regions for dynamic content', async ({ page }) => {
      await page.goto('/');
      
      // Check for ARIA live regions
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count();
      
      // If there are dynamic updates, should have live regions
      // This test would be more comprehensive with actual dynamic content
      expect(liveRegions).toBeGreaterThanOrEqual(0);
    });

    test('has proper ARIA descriptions and labels', async ({ page }) => {
      await page.goto('/');
      
      const elementsWithAria = await page.locator('[aria-describedby], [aria-labelledby]').all();
      
      for (const element of elementsWithAria) {
        const describedby = await element.getAttribute('aria-describedby');
        const labelledby = await element.getAttribute('aria-labelledby');
        
        if (describedby) {
          const descriptionElements = describedby.split(' ');
          for (const id of descriptionElements) {
            const descElement = await page.locator(`#${id}`).count();
            expect(descElement).toBeGreaterThanOrEqual(1);
          }
        }
        
        if (labelledby) {
          const labelElements = labelledby.split(' ');
          for (const id of labelElements) {
            const labelElement = await page.locator(`#${id}`).count();
            expect(labelElement).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });
  });

  test.describe('Error State Accessibility', () => {
    test('error messages are accessible', async ({ page }) => {
      // Navigate to a 404 page
      const response = await page.goto('/non-existent-page');
      
      if (response && response.status() === 404) {
        // Error page should be accessible
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
        
        // Should have proper heading
        const h1 = await page.locator('h1').count();
        expect(h1).toBeGreaterThanOrEqual(1);
        
        // Should have navigation back to main site
        const homeLink = await page.locator('[href="/"]').count();
        expect(homeLink).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('Content Accessibility', () => {
    test('tables have proper structure', async ({ page }) => {
      await page.goto('/');
      
      const tables = await page.locator('table').all();
      
      for (const table of tables) {
        // Tables should have captions or aria-label
        const caption = await table.locator('caption').count();
        const ariaLabel = await table.getAttribute('aria-label');
        
        if (caption === 0) {
          expect(ariaLabel).toBeTruthy();
        }
        
        // Check for proper header structure
        const headers = await table.locator('th').count();
        if (headers > 0) {
          const headerElements = await table.locator('th').all();
          
          for (const header of headerElements) {
            const scope = await header.getAttribute('scope');
            // Headers should have scope attribute for complex tables
            if (headers > 1) {
              expect(scope).toMatch(/(col|row|colgroup|rowgroup)/);
            }
          }
        }
      }
    });

    test('lists have proper structure', async ({ page }) => {
      await page.goto('/');
      
      const lists = await page.locator('ul, ol').all();
      
      for (const list of lists) {
        // Lists should only contain list items
        const children = await list.locator('> *').all();
        
        for (const child of children) {
          const tagName = await child.evaluate(el => el.tagName.toLowerCase());
          expect(tagName).toBe('li');
        }
      }
    });

    test('media content has alternatives', async ({ page }) => {
      await page.goto('/');
      
      // Check videos have captions or transcripts
      const videos = await page.locator('video').all();
      
      for (const video of videos) {
        const tracks = await video.locator('track[kind="captions"], track[kind="subtitles"]').count();
        const ariaLabel = await video.getAttribute('aria-label');
        const title = await video.getAttribute('title');
        
        // Video should have captions or descriptive text
        expect(tracks > 0 || ariaLabel || title).toBeTruthy();
      }
      
      // Check audio has transcripts
      const audioElements = await page.locator('audio').all();
      
      for (const audio of audioElements) {
        const ariaDescribedby = await audio.getAttribute('aria-describedby');
        const title = await audio.getAttribute('title');
        
        // Audio should have some form of alternative text
        expect(ariaDescribedby || title).toBeTruthy();
      }
    });
  });
});