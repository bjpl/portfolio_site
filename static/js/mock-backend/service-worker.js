/**
 * Mock Backend Service Worker
 * Provides complete offline CMS functionality using IndexedDB and localStorage
 */

const CACHE_NAME = 'portfolio-cms-mock-v1.0.0';
const SW_VERSION = '1.0.0';
const API_BASE = '/api';

// Import required modules
importScripts('/js/mock-backend/mock-database.js');
importScripts('/js/mock-backend/mock-auth.js');
importScripts('/js/mock-backend/mock-api-handlers.js');
importScripts('/js/mock-backend/mock-sync.js');

class MockBackendServiceWorker {
  constructor() {
    this.isOnline = navigator.onLine;
    this.realBackendUrl = null;
    this.syncQueue = [];
    this.wsClients = new Map();
    
    this.initializeEventListeners();
    this.checkRealBackend();
  }

  initializeEventListeners() {
    // Install event
    self.addEventListener('install', (event) => {
      console.log('[MockSW] Installing service worker v' + SW_VERSION);
      event.waitUntil(
        this.handleInstall()
      );
    });

    // Activate event
    self.addEventListener('activate', (event) => {
      console.log('[MockSW] Activating service worker v' + SW_VERSION);
      event.waitUntil(
        this.handleActivate()
      );
    });

    // Fetch interceptor
    self.addEventListener('fetch', (event) => {
      event.respondWith(
        this.handleFetch(event.request)
      );
    });

    // Message handler for WebSocket simulation
    self.addEventListener('message', (event) => {
      this.handleMessage(event);
    });

    // Online/offline detection
    self.addEventListener('online', () => {
      this.isOnline = true;
      this.handleNetworkChange();
    });

    self.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleNetworkChange();
    });

    // Sync background sync
    self.addEventListener('sync', (event) => {
      if (event.tag === 'backend-sync') {
        event.waitUntil(this.syncWithRealBackend());
      }
    });
  }

  async handleInstall() {
    // Initialize mock database and auth system
    await MockDatabase.initialize();
    await MockAuth.initialize();
    
    // Cache essential files
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      '/js/mock-backend/mock-database.js',
      '/js/mock-backend/mock-auth.js',
      '/js/mock-backend/mock-api-handlers.js',
      '/js/mock-backend/mock-sync.js'
    ]);
    
    console.log('[MockSW] Installation complete');
  }

  async handleActivate() {
    // Clean up old caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.startsWith('portfolio-cms-mock-') && cacheName !== CACHE_NAME) {
          return caches.delete(cacheName);
        }
      })
    );

    // Take control of all clients
    await self.clients.claim();
    
    console.log('[MockSW] Activation complete');
  }

  async handleFetch(request) {
    const url = new URL(request.url);
    
    // Handle API requests
    if (url.pathname.startsWith(API_BASE)) {
      return this.handleAPIRequest(request);
    }
    
    // Handle WebSocket upgrade requests
    if (request.headers.get('upgrade') === 'websocket') {
      return this.handleWebSocketRequest(request);
    }
    
    // Pass through other requests
    return fetch(request).catch(() => {
      // Return cached version if offline
      return caches.match(request);
    });
  }

  async handleAPIRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(API_BASE, '');
    const method = request.method.toUpperCase();
    
    console.log(`[MockSW] API Request: ${method} ${path}`);

    try {
      // Try real backend first if online
      if (this.isOnline && this.realBackendUrl) {
        try {
          const realResponse = await this.forwardToRealBackend(request);
          // Cache successful response
          if (realResponse.ok) {
            await this.cacheAPIResponse(request, realResponse.clone());
          }
          return realResponse;
        } catch (error) {
          console.log('[MockSW] Real backend failed, using mock:', error.message);
        }
      }

      // Use mock backend
      const mockResponse = await this.handleMockAPIRequest(request, path, method);
      
      // Queue for sync if it's a write operation
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        this.queueForSync(request, mockResponse);
      }
      
      return mockResponse;
      
    } catch (error) {
      console.error('[MockSW] API request failed:', error);
      return new Response(
        JSON.stringify({ 
          error: 'API request failed', 
          message: error.message 
        }), 
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  async handleMockAPIRequest(request, path, method) {
    const handlers = MockAPIHandlers.getHandlers();
    
    // Find matching handler
    for (const pattern in handlers) {
      const regex = this.pathToRegex(pattern);
      const match = path.match(regex);
      
      if (match && handlers[pattern][method.toLowerCase()]) {
        const handler = handlers[pattern][method.toLowerCase()];
        const params = this.extractParams(pattern, path);
        const body = await this.getRequestBody(request);
        
        const result = await handler({
          params,
          query: this.getQueryParams(request.url),
          body,
          headers: this.getRequestHeaders(request),
          method
        });
        
        return this.createAPIResponse(result);
      }
    }
    
    // No handler found
    return new Response(
      JSON.stringify({ error: 'Not found' }), 
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  async handleWebSocketRequest(request) {
    // Simulate WebSocket connection
    const clientId = this.generateClientId();
    
    // Store client info
    this.wsClients.set(clientId, {
      url: request.url,
      protocols: request.headers.get('sec-websocket-protocol'),
      connected: true,
      lastActivity: Date.now()
    });
    
    // Notify client about WebSocket simulation
    setTimeout(() => {
      this.broadcastToClient(clientId, {
        type: 'ws-connected',
        clientId
      });
    }, 100);
    
    return new Response('WebSocket simulation active', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }

  async handleMessage(event) {
    const { data } = event;
    
    if (data.type === 'ws-send') {
      // Handle WebSocket message simulation
      this.handleWebSocketMessage(data.clientId, data.message);
    } else if (data.type === 'sync-request') {
      // Handle manual sync request
      await this.syncWithRealBackend();
    } else if (data.type === 'check-backend') {
      // Check if real backend is available
      await this.checkRealBackend();
    }
  }

  async handleNetworkChange() {
    if (this.isOnline) {
      console.log('[MockSW] Network online - attempting sync');
      await this.syncWithRealBackend();
    } else {
      console.log('[MockSW] Network offline - using mock backend only');
    }
    
    // Notify all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'network-status',
        isOnline: this.isOnline
      });
    });
  }

  async checkRealBackend() {
    try {
      const healthResponse = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (healthResponse.ok) {
        this.realBackendUrl = new URL(healthResponse.url).origin;
        console.log('[MockSW] Real backend available at:', this.realBackendUrl);
        return true;
      }
    } catch (error) {
      console.log('[MockSW] Real backend not available:', error.message);
    }
    
    this.realBackendUrl = null;
    return false;
  }

  async forwardToRealBackend(request) {
    const realUrl = request.url.replace(self.location.origin, this.realBackendUrl);
    const realRequest = new Request(realUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      credentials: 'include'
    });
    
    return fetch(realRequest);
  }

  async cacheAPIResponse(request, response) {
    if (request.method === 'GET' && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response);
    }
  }

  queueForSync(request, response) {
    this.syncQueue.push({
      request: {
        url: request.url,
        method: request.method,
        headers: this.getRequestHeaders(request),
        body: request.body
      },
      response: response,
      timestamp: Date.now()
    });
    
    // Trigger background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register('backend-sync');
    }
  }

  async syncWithRealBackend() {
    if (!this.isOnline || !this.realBackendUrl || this.syncQueue.length === 0) {
      return;
    }
    
    console.log(`[MockSW] Syncing ${this.syncQueue.length} operations with real backend`);
    
    const failedSyncs = [];
    
    for (const syncItem of this.syncQueue) {
      try {
        const realRequest = new Request(
          syncItem.request.url.replace(self.location.origin, this.realBackendUrl),
          {
            method: syncItem.request.method,
            headers: syncItem.request.headers,
            body: syncItem.request.body
          }
        );
        
        const response = await fetch(realRequest);
        
        if (!response.ok) {
          failedSyncs.push(syncItem);
        }
      } catch (error) {
        console.error('[MockSW] Sync failed for item:', syncItem, error);
        failedSyncs.push(syncItem);
      }
    }
    
    // Keep failed syncs for retry
    this.syncQueue = failedSyncs;
    
    console.log(`[MockSW] Sync complete. ${failedSyncs.length} operations failed.`);
  }

  // Utility methods
  pathToRegex(path) {
    return new RegExp('^' + path.replace(/:\w+/g, '([^/]+)') + '$');
  }

  extractParams(pattern, path) {
    const paramNames = (pattern.match(/:\w+/g) || []).map(p => p.substring(1));
    const regex = this.pathToRegex(pattern);
    const match = path.match(regex);
    
    const params = {};
    if (match) {
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
    }
    
    return params;
  }

  getQueryParams(url) {
    const urlObj = new URL(url);
    const params = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  getRequestHeaders(request) {
    const headers = {};
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }
    return headers;
  }

  async getRequestBody(request) {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return null;
    }
    
    try {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        return await request.json();
      } else if (contentType.includes('multipart/form-data')) {
        return await request.formData();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        return await request.formData();
      } else {
        return await request.text();
      }
    } catch (error) {
      return null;
    }
  }

  createAPIResponse(result) {
    const { status = 200, data, error, headers = {} } = result;
    
    const responseHeaders = {
      'Content-Type': 'application/json',
      'X-Mock-Backend': 'true',
      ...headers
    };
    
    const body = error ? { error } : data;
    
    return new Response(JSON.stringify(body), {
      status,
      headers: responseHeaders
    });
  }

  generateClientId() {
    return 'client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  handleWebSocketMessage(clientId, message) {
    // Process WebSocket message and respond
    const client = this.wsClients.get(clientId);
    if (!client) return;
    
    client.lastActivity = Date.now();
    
    // Echo message back for now (can be extended for specific protocols)
    setTimeout(() => {
      this.broadcastToClient(clientId, {
        type: 'ws-message',
        data: message
      });
    }, 10);
  }

  broadcastToClient(clientId, message) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'ws-broadcast',
          clientId,
          message
        });
      });
    });
  }
}

// Initialize the mock backend service worker
const mockBackend = new MockBackendServiceWorker();

console.log('[MockSW] Mock Backend Service Worker initialized v' + SW_VERSION);