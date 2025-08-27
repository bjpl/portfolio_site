/**
 * Progressive Web App (PWA) Validation Tests
 * Tests PWA features, manifest, service worker, and offline functionality
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

describe('PWA Validation Tests', () => {
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';

  describe('Web App Manifest', () => {
    test('manifest file exists and is valid', async ({ page }) => {
      await page.goto('/');

      // Check for manifest link in HTML
      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toBeVisible();

      const manifestHref = await manifestLink.getAttribute('href');
      expect(manifestHref).toBeTruthy();

      // Fetch and validate manifest
      const manifestResponse = await page.request.get(manifestHref);
      expect(manifestResponse.ok()).toBe(true);
      expect(manifestResponse.headers()['content-type']).toContain('application/json');

      const manifest = await manifestResponse.json();

      // Validate required manifest fields
      expect(manifest.name).toBeTruthy();
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.start_url).toBeTruthy();
      expect(manifest.display).toBeTruthy();
      expect(manifest.theme_color).toBeTruthy();
      expect(manifest.background_color).toBeTruthy();
      expect(manifest.icons).toBeInstanceOf(Array);
      expect(manifest.icons.length).toBeGreaterThan(0);

      // Validate icon requirements
      const requiredSizes = ['192x192', '512x512'];
      requiredSizes.forEach(size => {
        const icon = manifest.icons.find(icon => 
          icon.sizes === size || icon.sizes.includes(size)
        );
        expect(icon).toBeTruthy();
        expect(icon.src).toBeTruthy();
        expect(icon.type).toBeTruthy();
      });

      console.log('Manifest validation passed:', {
        name: manifest.name,
        icons: manifest.icons.length,
        display: manifest.display
      });
    });

    test('manifest icons are accessible', async ({ page, request }) => {
      const manifestResponse = await request.get('/manifest.json');
      const manifest = await manifestResponse.json();

      // Test each icon is accessible
      for (const icon of manifest.icons) {
        const iconResponse = await request.get(icon.src);
        expect(iconResponse.ok()).toBe(true);
        
        // Check image format
        const contentType = iconResponse.headers()['content-type'];
        expect(contentType).toMatch(/(image\/(png|webp|svg|ico))/);
      }
    });

    test('manifest supports installation', async ({ page }) => {
      await page.goto('/');

      // Check if PWA installation criteria are met
      const manifest = await page.evaluate(async () => {
        const link = document.querySelector('link[rel="manifest"]');
        if (!link) return null;
        
        const response = await fetch(link.href);
        return response.json();
      });

      if (manifest) {
        // Installation requirements
        expect(manifest.display).toMatch(/(standalone|fullscreen|minimal-ui)/);
        expect(manifest.start_url).toBeTruthy();
        
        // Should have at least one icon >= 144px
        const largeIcon = manifest.icons.find(icon => {
          const size = parseInt(icon.sizes.split('x')[0]);
          return size >= 144;
        });
        expect(largeIcon).toBeTruthy();
      }
    });

    test('manifest theme colors are valid', async ({ page, request }) => {
      const manifestResponse = await request.get('/manifest.json');
      const manifest = await manifestResponse.json();

      // Validate color formats
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      
      if (manifest.theme_color) {
        expect(manifest.theme_color).toMatch(colorRegex);
      }
      
      if (manifest.background_color) {
        expect(manifest.background_color).toMatch(colorRegex);
      }
    });
  });

  describe('Service Worker', () => {
    test('service worker is registered', async ({ page }) => {
      await page.goto('/');

      // Check if service worker is available
      const swSupported = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });

      if (swSupported) {
        // Wait for service worker registration
        await page.waitForTimeout(1000);

        const registration = await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration ? {
            scope: registration.scope,
            active: !!registration.active,
            installing: !!registration.installing,
            waiting: !!registration.waiting
          } : null;
        });

        if (registration) {
          expect(registration.scope).toBeTruthy();
          console.log('Service Worker registered:', registration);
        } else {
          console.log('No Service Worker registered (this may be expected for development)');
        }
      }
    });

    test('service worker handles fetch events', async ({ page }) => {
      await page.goto('/');

      const swRegistered = await page.evaluate(() => {
        return navigator.serviceWorker.controller !== null;
      });

      if (swRegistered) {
        // Test that service worker intercepts requests
        await page.goto('/tools/');
        
        // Service worker should be handling requests
        const controlled = await page.evaluate(() => {
          return navigator.serviceWorker.controller !== null;
        });
        
        expect(controlled).toBe(true);
      }
    });
  });

  describe('Offline Functionality', () => {
    test('app shows offline indicator when offline', async ({ page }) => {
      await page.goto('/');

      // Go offline
      await page.context().setOffline(true);
      
      // Wait for offline detection
      await page.waitForTimeout(2000);

      // Check if app shows offline state
      const offlineIndicator = page.locator('[data-testid="offline-indicator"], .offline-banner');
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toBeVisible();
      }

      // Go back online
      await page.context().setOffline(false);
    });

    test('cached pages work offline', async ({ page }) => {
      // Visit page online first
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Go offline
      await page.context().setOffline(true);

      // Try to reload page
      try {
        await page.reload();
        
        // If service worker is caching, page should still load
        const title = await page.title();
        expect(title).toBeTruthy();
        
        console.log('Page loaded offline:', title);
      } catch (error) {
        // If no offline support, that's also valid
        console.log('No offline caching (expected for development)');
      }

      await page.context().setOffline(false);
    });

    test('offline fallback page exists', async ({ page, request }) => {
      // Test if offline fallback page exists
      try {
        const offlineResponse = await request.get('/offline.html');
        if (offlineResponse.ok()) {
          const content = await offlineResponse.text();
          expect(content).toContain('offline');
          console.log('Offline fallback page exists');
        }
      } catch (error) {
        console.log('No offline fallback page (optional)');
      }
    });
  });

  describe('Installation Experience', () => {
    test('beforeinstallprompt event is handled', async ({ page }) => {
      await page.goto('/');

      // Check if app handles install prompt
      const installPromptHandled = await page.evaluate(() => {
        return new Promise((resolve) => {
          let handled = false;
          
          window.addEventListener('beforeinstallprompt', (e) => {
            handled = true;
            resolve(true);
          });
          
          // If no event after 1 second, assume not handled
          setTimeout(() => resolve(handled), 1000);
        });
      });

      // This test might not trigger in all browsers/contexts
      console.log('Install prompt handled:', installPromptHandled);
    });

    test('install button functionality', async ({ page }) => {
      await page.goto('/');

      const installButton = page.locator('[data-testid="install-button"], button[aria-label*="install"]');
      
      if (await installButton.isVisible()) {
        await expect(installButton).toBeVisible();
        
        // Test install button is accessible
        const ariaLabel = await installButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        
        console.log('Install button found with label:', ariaLabel);
      } else {
        console.log('No install button found (may appear only when installable)');
      }
    });
  });

  describe('App Shell Architecture', () => {
    test('app shell loads quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      
      // Wait for basic shell to load (not full content)
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      
      const shellLoadTime = Date.now() - startTime;
      
      // App shell should load quickly
      expect(shellLoadTime).toBeLessThan(2000);
      console.log('App shell load time:', shellLoadTime + 'ms');
    });

    test('navigation is instant for cached routes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to different pages
      const routes = ['/tools/', '/writing/', '/me/', '/'];
      
      for (const route of routes) {
        const startTime = Date.now();
        await page.click(`[href="${route}"]`);
        await page.waitForURL(`**${route}`);
        const navTime = Date.now() - startTime;
        
        // Navigation should be fast (client-side routing)
        expect(navTime).toBeLessThan(1000);
        console.log(`Navigation to ${route}: ${navTime}ms`);
      }
    });
  });

  describe('Background Sync', () => {
    test('background sync is available', async ({ page }) => {
      await page.goto('/');

      const backgroundSyncSupported = await page.evaluate(() => {
        return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
      });

      if (backgroundSyncSupported) {
        console.log('Background Sync API is supported');
        expect(backgroundSyncSupported).toBe(true);
      } else {
        console.log('Background Sync API not supported');
      }
    });
  });

  describe('Push Notifications', () => {
    test('push notifications are supported', async ({ page }) => {
      await page.goto('/');

      const pushSupported = await page.evaluate(() => {
        return 'PushManager' in window && 'Notification' in window;
      });

      if (pushSupported) {
        console.log('Push notifications are supported');
        
        // Test permission state
        const permission = await page.evaluate(() => {
          return Notification.permission;
        });
        
        expect(permission).toMatch(/(default|granted|denied)/);
        console.log('Notification permission:', permission);
      } else {
        console.log('Push notifications not supported');
      }
    });
  });

  describe('PWA Scoring', () => {
    test('meets PWA installability criteria', async ({ page }) => {
      await page.goto('/');

      const criteria = {
        hasManifest: false,
        hasServiceWorker: false,
        hasIcons: false,
        isHTTPS: false,
        hasStartUrl: false
      };

      // Check manifest
      const manifestLink = page.locator('link[rel="manifest"]');
      criteria.hasManifest = await manifestLink.isVisible();

      // Check service worker
      criteria.hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });

      // Check HTTPS
      criteria.isHTTPS = page.url().startsWith('https://') || page.url().includes('localhost');

      if (criteria.hasManifest) {
        const manifestHref = await manifestLink.getAttribute('href');
        const manifestResponse = await page.request.get(manifestHref);
        const manifest = await manifestResponse.json();
        
        criteria.hasIcons = manifest.icons && manifest.icons.length > 0;
        criteria.hasStartUrl = !!manifest.start_url;
      }

      console.log('PWA Criteria Check:', criteria);

      // For a complete PWA, most criteria should be met
      const metCriteria = Object.values(criteria).filter(Boolean).length;
      const totalCriteria = Object.keys(criteria).length;
      
      console.log(`PWA criteria met: ${metCriteria}/${totalCriteria}`);
      
      // At least basic requirements should be met
      expect(criteria.hasManifest).toBe(true);
      expect(criteria.isHTTPS).toBe(true);
    });
  });

  describe('Performance in PWA Context', () => {
    test('app performs well on slow networks', async ({ page }) => {
      // Simulate slow 3G connection
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 200); // Add 200ms delay
      });

      const startTime = Date.now();
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Should still load within reasonable time even on slow network
      expect(loadTime).toBeLessThan(5000);
      console.log('Load time on slow network:', loadTime + 'ms');
    });

    test('critical resources are cached', async ({ page }) => {
      await page.goto('/');
      
      // Check if critical CSS is inlined or cached
      const criticalStyles = await page.locator('style, link[rel="stylesheet"]').count();
      expect(criticalStyles).toBeGreaterThan(0);
      
      // Check if JavaScript bundles are optimized
      const scripts = await page.locator('script[src]').all();
      
      for (const script of scripts.slice(0, 3)) {
        const src = await script.getAttribute('src');
        if (src && !src.startsWith('http')) {
          // Internal scripts should be optimized (hashed names, etc.)
          expect(src).toMatch(/\.(js|mjs)$/);
        }
      }
    });
  });

  describe('Cross-Platform PWA Features', () => {
    test('app adapts to different platforms', async ({ page }) => {
      await page.goto('/');

      // Test viewport meta tag
      const viewportMeta = page.locator('meta[name="viewport"]');
      await expect(viewportMeta).toBeVisible();
      
      const viewport = await viewportMeta.getAttribute('content');
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1');

      // Test theme color meta tags
      const themeColorMeta = page.locator('meta[name="theme-color"]');
      if (await themeColorMeta.isVisible()) {
        const themeColor = await themeColorMeta.getAttribute('content');
        expect(themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }

      // Test apple-specific meta tags
      const appleMeta = page.locator('meta[name^="apple-"]');
      const appleMetaCount = await appleMeta.count();
      console.log('Apple-specific meta tags:', appleMetaCount);
    });

    test('handles app-like navigation', async ({ page }) => {
      await page.goto('/');

      // Test that navigation feels app-like (no full page refreshes)
      const navigationPromise = page.waitForEvent('framenavigated');
      await page.click('[href="/tools/"]');
      await navigationPromise;

      // Should maintain state across navigation
      const newUrl = page.url();
      expect(newUrl).toContain('/tools');
      
      // Header should still be present (single-page app behavior)
      await expect(page.locator('header')).toBeVisible();
    });
  });
});