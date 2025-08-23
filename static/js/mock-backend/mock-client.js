/**
 * Mock Backend Client
 * Provides the main interface for applications to interact with the mock backend
 * Handles service worker registration, authentication state, and API communication
 */

class MockBackendClient {
  constructor() {
    this.serviceWorker = null;
    this.isRegistered = false;
    this.isAuthenticated = false;
    this.currentUser = null;
    this.eventListeners = new Map();
    this.wsClient = null;
    this.syncClient = null;
    
    // Configuration
    this.config = {
      serviceWorkerPath: '/js/mock-backend/service-worker.js',
      enableWebSocket: true,
      enableSync: true,
      autoRegister: true,
      debug: false
    };

    // Initialize if auto-register is enabled
    if (this.config.autoRegister) {
      this.initialize();
    }
  }

  async initialize(options = {}) {
    this.config = { ...this.config, ...options };
    
    try {
      await this.registerServiceWorker();
      await this.initializeAuthentication();
      await this.initializeWebSocket();
      await this.initializeSync();
      
      this.log('Mock backend client initialized successfully');
      this.emit('initialized', { timestamp: new Date().toISOString() });
      
      return true;
    } catch (error) {
      console.error('[MockClient] Initialization failed:', error);
      this.emit('error', { error: error.message, type: 'initialization' });
      return false;
    }
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register(
        this.config.serviceWorkerPath,
        { scope: '/' }
      );

      this.serviceWorker = registration;
      this.isRegistered = true;

      // Listen for service worker updates
      registration.addEventListener('updatefound', () => {
        this.log('Service worker update found');
        this.emit('sw-update-found');
      });

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.log('Service worker controller changed');
        this.emit('sw-controller-changed');
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });

      this.log('Service Worker registered successfully');
      return registration;

    } catch (error) {
      throw new Error(`Service Worker registration failed: ${error.message}`);
    }
  }

  async initializeAuthentication() {
    // Check for existing authentication token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Validate token with mock auth system
        const response = await this.makeRequest('/auth/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          this.setAuthenticationState(data.user, token);
        } else {
          // Token is invalid, clear it
          this.clearAuthenticationState();
        }
      } catch (error) {
        console.warn('[MockClient] Token validation failed:', error);
        this.clearAuthenticationState();
      }
    }

    this.log('Authentication initialized');
  }

  async initializeWebSocket() {
    if (!this.config.enableWebSocket) return;

    try {
      this.wsClient = new MockWebSocketClient();
      await this.wsClient.connect();
      
      // Set up event forwarding
      this.wsClient.on('*', (eventType, data) => {
        this.emit(`ws-${eventType}`, data);
      });

      this.log('WebSocket client initialized');
    } catch (error) {
      console.warn('[MockClient] WebSocket initialization failed:', error);
    }
  }

  async initializeSync() {
    if (!this.config.enableSync) return;

    try {
      this.syncClient = new MockSyncClient();
      await this.syncClient.initialize();
      
      // Set up sync event forwarding
      this.syncClient.on('*', (eventType, data) => {
        this.emit(`sync-${eventType}`, data);
      });

      this.log('Sync client initialized');
    } catch (error) {
      console.warn('[MockClient] Sync initialization failed:', error);
    }
  }

  // Service Worker Communication
  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'network-status':
        this.emit('network-status-changed', data);
        break;
        
      case 'sync-event':
        this.emit('sync-event', data);
        break;
        
      case 'ws-broadcast':
        if (this.wsClient) {
          this.wsClient.handleServerMessage(data);
        }
        break;
        
      case 'mock-websocket-event':
        this.emit('websocket-event', data);
        break;
        
      default:
        this.emit('sw-message', { type, data });
    }
  }

  async sendMessageToServiceWorker(message) {
    if (!this.serviceWorker) {
      throw new Error('Service Worker not registered');
    }

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    } else {
      throw new Error('Service Worker not controlling this page');
    }
  }

  // API Methods
  async makeRequest(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    };

    // Add authentication header if available
    if (this.isAuthenticated && localStorage.getItem('token')) {
      config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
    }

    // Add body if provided
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    return fetch(url, config);
  }

  // Authentication Methods
  async login(email, password) {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      this.setAuthenticationState(data.user, data.accessToken);
      
      this.emit('login-success', { user: data.user });
      return data;

    } catch (error) {
      this.emit('login-error', { error: error.message });
      throw error;
    }
  }

  async logout() {
    try {
      if (this.isAuthenticated) {
        await this.makeRequest('/auth/logout', { method: 'POST' });
      }
      
      this.clearAuthenticationState();
      this.emit('logout-success');
      
    } catch (error) {
      console.warn('[MockClient] Logout request failed:', error);
      // Clear local state even if request fails
      this.clearAuthenticationState();
      this.emit('logout-success');
    }
  }

  async register(userData) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: userData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      this.setAuthenticationState(data.user, data.accessToken);
      
      this.emit('register-success', { user: data.user });
      return data;

    } catch (error) {
      this.emit('register-error', { error: error.message });
      throw error;
    }
  }

  setAuthenticationState(user, token) {
    this.isAuthenticated = true;
    this.currentUser = user;
    localStorage.setItem('token', token);
    
    this.log('User authenticated:', user.email);
    this.emit('authentication-changed', { 
      isAuthenticated: true, 
      user 
    });
  }

  clearAuthenticationState() {
    this.isAuthenticated = false;
    this.currentUser = null;
    localStorage.removeItem('token');
    
    this.log('User logged out');
    this.emit('authentication-changed', { 
      isAuthenticated: false, 
      user: null 
    });
  }

  // Content Management Methods
  async getContent(path = '') {
    const response = await this.makeRequest(`/content${path ? '/' + path : ''}`);
    if (!response.ok) {
      throw new Error(`Failed to get content: ${response.status}`);
    }
    return response.json();
  }

  async createContent(contentData) {
    const response = await this.makeRequest('/content', {
      method: 'POST',
      body: contentData
    });
    if (!response.ok) {
      throw new Error(`Failed to create content: ${response.status}`);
    }
    return response.json();
  }

  async updateContent(path, contentData) {
    const response = await this.makeRequest(`/content/${path}`, {
      method: 'PUT',
      body: contentData
    });
    if (!response.ok) {
      throw new Error(`Failed to update content: ${response.status}`);
    }
    return response.json();
  }

  async deleteContent(path) {
    const response = await this.makeRequest(`/content/${path}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`Failed to delete content: ${response.status}`);
    }
    return response.json();
  }

  async searchContent(query, options = {}) {
    const params = new URLSearchParams({ q: query, ...options });
    const response = await this.makeRequest(`/content/search?${params}`);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    return response.json();
  }

  // File Management Methods
  async uploadFile(file, path = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (path) formData.append('path', path);

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  }

  async getFiles(path = '') {
    const response = await this.makeRequest(`/files${path ? '/' + path : ''}`);
    if (!response.ok) {
      throw new Error(`Failed to get files: ${response.status}`);
    }
    return response.json();
  }

  async deleteFile(path) {
    const response = await this.makeRequest(`/files/${path}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.status}`);
    }
    return response.json();
  }

  // Dashboard Methods
  async getDashboardStats() {
    const response = await this.makeRequest('/dashboard/stats');
    if (!response.ok) {
      throw new Error(`Failed to get dashboard stats: ${response.status}`);
    }
    return response.json();
  }

  // Settings Methods
  async getSettings() {
    const response = await this.makeRequest('/settings');
    if (!response.ok) {
      throw new Error(`Failed to get settings: ${response.status}`);
    }
    return response.json();
  }

  async updateSettings(settings) {
    const response = await this.makeRequest('/settings', {
      method: 'PUT',
      body: settings
    });
    if (!response.ok) {
      throw new Error(`Failed to update settings: ${response.status}`);
    }
    return response.json();
  }

  // Sync Methods
  async manualSync() {
    if (this.syncClient) {
      return this.syncClient.manualSync();
    }
    
    // Fallback: send message to service worker
    await this.sendMessageToServiceWorker({
      type: 'sync-request'
    });
  }

  getSyncStatus() {
    if (this.syncClient) {
      return this.syncClient.getSyncStatus();
    }
    return null;
  }

  // WebSocket Methods
  async sendWebSocketMessage(message) {
    if (this.wsClient) {
      return this.wsClient.send(message);
    }
  }

  async joinRoom(roomId) {
    if (this.wsClient) {
      return this.wsClient.joinRoom(roomId);
    }
  }

  async leaveRoom(roomId) {
    if (this.wsClient) {
      return this.wsClient.leaveRoom(roomId);
    }
  }

  // Event Management
  on(eventType, handler) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(handler);
    return () => this.off(eventType, handler); // Return unsubscribe function
  }

  off(eventType, handler) {
    const handlers = this.eventListeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  emit(eventType, data) {
    const handlers = this.eventListeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[MockClient] Event handler error for ${eventType}:`, error);
        }
      });
    }
  }

  // Utility Methods
  isOnline() {
    return navigator.onLine;
  }

  async checkBackendHealth() {
    try {
      const response = await this.makeRequest('/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getStatus() {
    return {
      isRegistered: this.isRegistered,
      isAuthenticated: this.isAuthenticated,
      currentUser: this.currentUser,
      isOnline: this.isOnline(),
      serviceWorker: !!this.serviceWorker,
      webSocket: !!this.wsClient,
      sync: !!this.syncClient
    };
  }

  log(message, ...args) {
    if (this.config.debug) {
      console.log('[MockClient]', message, ...args);
    }
  }

  // Cleanup
  async destroy() {
    if (this.wsClient) {
      await this.wsClient.disconnect();
    }
    
    if (this.syncClient) {
      await this.syncClient.cleanup();
    }
    
    this.eventListeners.clear();
    
    if (this.serviceWorker) {
      // Can't unregister from here, but clear reference
      this.serviceWorker = null;
      this.isRegistered = false;
    }
    
    this.log('Mock backend client destroyed');
  }
}

// Simple WebSocket Client for Mock Backend
class MockWebSocketClient {
  constructor() {
    this.clientId = null;
    this.connected = false;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async connect() {
    this.clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate connection by registering with the mock system
    window.addEventListener('mock-websocket-event', this.handleEvent.bind(this));
    
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Create client in mock system
    if (window.MockWebSocket) {
      window.MockWebSocket.createClient(this.clientId);
    }
    
    this.emit('open', { clientId: this.clientId });
    console.log('[MockWSClient] Connected with ID:', this.clientId);
  }

  async disconnect() {
    this.connected = false;
    
    window.removeEventListener('mock-websocket-event', this.handleEvent.bind(this));
    
    // Remove client from mock system
    if (window.MockWebSocket) {
      window.MockWebSocket.removeClient(this.clientId);
    }
    
    this.emit('close', { clientId: this.clientId });
    console.log('[MockWSClient] Disconnected');
  }

  handleEvent(event) {
    const { clientId, eventType, data } = event.detail;
    
    if (clientId === this.clientId || !clientId) {
      this.emit(eventType, data);
    }
  }

  send(message) {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }
    
    // Send to mock system
    if (window.MockWebSocket) {
      const instance = window.MockWebSocket.getInstance();
      instance.sendMessage(this.clientId, message);
    }
  }

  joinRoom(roomId) {
    return this.send({
      type: 'join-room',
      roomId
    });
  }

  leaveRoom(roomId) {
    return this.send({
      type: 'leave-room',
      roomId
    });
  }

  broadcast(message, roomId = null) {
    return this.send({
      type: 'broadcast',
      message,
      roomId
    });
  }

  // Event handling
  on(eventType, handler) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(handler);
  }

  off(eventType, handler) {
    const handlers = this.eventListeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(eventType, data) {
    const handlers = this.eventListeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[MockWSClient] Handler error for ${eventType}:`, error);
        }
      });
    }

    // Also emit to wildcard listeners
    const wildcardHandlers = this.eventListeners.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(eventType, data);
        } catch (error) {
          console.error(`[MockWSClient] Wildcard handler error:`, error);
        }
      });
    }
  }

  handleServerMessage(data) {
    this.emit('message', data);
  }
}

// Simple Sync Client for Mock Backend
class MockSyncClient {
  constructor() {
    this.initialized = false;
    this.eventListeners = new Map();
  }

  async initialize() {
    // Implementation would go here
    this.initialized = true;
  }

  async manualSync() {
    // Implementation would go here
    this.emit('sync-started', { timestamp: new Date().toISOString() });
    
    // Simulate sync completion
    setTimeout(() => {
      this.emit('sync-completed', { timestamp: new Date().toISOString() });
    }, 2000);
  }

  getSyncStatus() {
    return {
      initialized: this.initialized,
      lastSync: null,
      queueLength: 0
    };
  }

  on(eventType, handler) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(handler);
  }

  emit(eventType, data) {
    const handlers = this.eventListeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }

    const wildcardHandlers = this.eventListeners.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(eventType, data));
    }
  }

  async cleanup() {
    this.eventListeners.clear();
    this.initialized = false;
  }
}

// Create global instance
window.mockBackendClient = new MockBackendClient();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockBackendClient;
}