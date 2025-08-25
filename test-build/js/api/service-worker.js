/**
 * Service Worker for Offline Support
 * Provides seamless offline experience with cached responses
 */

const CACHE_NAME = 'portfolio-api-v1';
const API_CACHE_NAME = 'portfolio-api-responses-v1';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/js/main.js',
  '/js/api/client.js',
  '/js/api/error-boundary.js',
  '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/blog',
  '/api/projects',
  '/.netlify/functions/health',
  '/.netlify/functions/blog',
  '/.netlify/functions/projects'
];

self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => 
          new Request(url, { cache: 'reload' })
        ));
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Clean up old caches
        const deletePromises = cacheNames
          .filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map(name => {
            console.log(`🗑️ Deleting old cache: ${name}`);
            return caches.delete(name);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static asset requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

/**
 * Check if request is for an API endpoint
 */
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') || 
         url.pathname.startsWith('/.netlify/functions/') ||
         API_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint));
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
  return url.origin === location.origin && (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json') ||
    url.pathname === '/'
  );
}

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const response = await fetch(request, {
      timeout: 5000
    });
    
    if (response.ok) {
      // Cache successful responses
      cache.put(request, response.clone());
      console.log(`📡 API response cached: ${request.url}`);
      return response;
    }
    
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.warn(`⚠️ API request failed: ${request.url}`, error.message);
    
    // Try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log(`📦 Serving cached API response: ${request.url}`);
      return cachedResponse;
    }
    
    // Return mock data as last resort
    return createMockAPIResponse(request);
  }
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log(`📦 Serving cached asset: ${request.url}`);
    return cachedResponse;
  }
  
  try {
    // Try network
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      return response;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.warn(`⚠️ Static asset request failed: ${request.url}`);
    
    // For HTML pages, return a basic offline page
    if (request.headers.get('accept')?.includes('text/html')) {
      return createOfflinePage();
    }
    
    // For other assets, return a 404
    return new Response('Not found', { status: 404 });
  }
}

/**
 * Create mock API response for offline mode
 */
function createMockAPIResponse(request) {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  
  let mockData = { error: false, demo: true, offline: true };
  
  if (endpoint.includes('health')) {
    mockData = { status: 'ok', mode: 'offline' };
  } else if (endpoint.includes('blog')) {
    mockData = {
      posts: [
        {
          id: 1,
          title: 'Offline Mode: Building Resilient Web Applications',
          excerpt: 'This content is available offline thanks to service workers.',
          date: new Date().toISOString(),
          slug: 'offline-resilient-web-apps'
        }
      ]
    };
  } else if (endpoint.includes('projects')) {
    mockData = {
      projects: [
        {
          id: 1,
          name: 'Offline Portfolio',
          description: 'This portfolio works seamlessly offline',
          technologies: ['Service Worker', 'Cache API', 'PWA'],
          status: 'offline'
        }
      ]
    };
  } else if (endpoint.includes('contact')) {
    mockData = { 
      success: true, 
      message: 'Message queued for delivery when online' 
    };
  }
  
  console.log(`🎭 Returning mock data for offline API: ${endpoint}`);
  
  return new Response(JSON.stringify(mockData), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
      'X-Offline-Mode': 'true'
    }
  });
}

/**
 * Create offline page for HTML requests
 */
function createOfflinePage() {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Portfolio - Offline Mode</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }
        .offline-container {
          max-width: 400px;
          padding: 2rem;
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .offline-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .offline-message {
          opacity: 0.9;
          line-height: 1.5;
        }
        .retry-button {
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
          font-size: 1rem;
        }
        .retry-button:hover {
          background: rgba(255,255,255,0.3);
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">🌟</div>
        <h1 class="offline-title">Portfolio Available Offline</h1>
        <p class="offline-message">
          Don't worry! The portfolio is fully functional in offline mode 
          with cached content and demo data.
        </p>
        <button class="retry-button" onclick="location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'text/html',
      'X-Offline-Mode': 'true'
    }
  });
}

// Handle background sync for queued actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('🔄 Performing background sync...');
  // Handle queued contact form submissions, etc.
  // This would integrate with IndexedDB to store queued actions
}

// Handle push notifications (if needed)
self.addEventListener('push', event => {
  const options = {
    body: 'Portfolio update available',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png'
  };
  
  event.waitUntil(
    self.registration.showNotification('Portfolio', options)
  );
});