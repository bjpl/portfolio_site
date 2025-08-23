/**
 * Mock Sync System
 * Handles offline-first synchronization between mock backend and real backend
 * Provides conflict resolution, queue management, and seamless data sync
 */

class MockSync {
  static instance = null;
  static SYNC_STRATEGIES = {
    CLIENT_WINS: 'client_wins',
    SERVER_WINS: 'server_wins',
    MERGE: 'merge',
    PROMPT_USER: 'prompt_user'
  };

  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncQueue = [];
    this.conflictResolution = MockSync.SYNC_STRATEGIES.CLIENT_WINS;
    this.lastSyncTimestamp = null;
    this.realBackendUrl = null;
    this.initialized = false;
  }

  static getInstance() {
    if (!MockSync.instance) {
      MockSync.instance = new MockSync();
    }
    return MockSync.instance;
  }

  static async initialize() {
    const instance = MockSync.getInstance();
    if (!instance.initialized) {
      await instance.init();
    }
    return instance;
  }

  async init() {
    if (this.initialized) return;
    
    this.db = await MockDatabase.initialize();
    this.loadSyncSettings();
    this.setupEventListeners();
    
    // Restore sync queue from storage
    await this.loadSyncQueue();
    
    this.initialized = true;
    console.log('[MockSync] Synchronization system initialized');
  }

  setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleNetworkChange();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleNetworkChange();
    });

    // Listen for visibility changes to sync when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.scheduleSyncCheck();
      }
    });
  }

  async loadSyncSettings() {
    try {
      const settings = await this.db.findOne('settings', 'key', 'sync_strategy');
      if (settings) {
        this.conflictResolution = settings.value;
      }

      const lastSync = await this.db.findOne('settings', 'key', 'last_sync_timestamp');
      if (lastSync) {
        this.lastSyncTimestamp = new Date(lastSync.value);
      }
    } catch (error) {
      console.warn('[MockSync] Failed to load sync settings:', error);
    }
  }

  async loadSyncQueue() {
    try {
      this.syncQueue = await this.db.findAll('sync_queue', {
        where: { status: 'pending' },
        orderBy: ['createdAt', 'ASC']
      });
      
      console.log(`[MockSync] Loaded ${this.syncQueue.length} items from sync queue`);
    } catch (error) {
      console.error('[MockSync] Failed to load sync queue:', error);
    }
  }

  async saveSyncQueue() {
    try {
      // Clear existing queue
      await this.db.delete('sync_queue');
      
      // Save current queue
      for (const item of this.syncQueue) {
        await this.db.create('sync_queue', item);
      }
    } catch (error) {
      console.error('[MockSync] Failed to save sync queue:', error);
    }
  }

  handleNetworkChange() {
    if (this.isOnline) {
      console.log('[MockSync] Network online - scheduling sync');
      this.scheduleSyncCheck();
    } else {
      console.log('[MockSync] Network offline - sync paused');
    }
  }

  scheduleSyncCheck() {
    if (this.syncInProgress) return;
    
    setTimeout(async () => {
      await this.checkAndSync();
    }, 1000); // Small delay to avoid rapid sync attempts
  }

  async checkAndSync() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    try {
      // Check if real backend is available
      const isBackendAvailable = await this.checkRealBackend();
      if (!isBackendAvailable) {
        console.log('[MockSync] Real backend not available');
        return;
      }

      await this.performFullSync();
    } catch (error) {
      console.error('[MockSync] Sync check failed:', error);
    }
  }

  async checkRealBackend() {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
        timeout: 5000
      });
      
      if (response.ok) {
        this.realBackendUrl = new URL(response.url).origin;
        return true;
      }
    } catch (error) {
      console.log('[MockSync] Real backend check failed:', error.message);
    }
    
    this.realBackendUrl = null;
    return false;
  }

  async performFullSync() {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    console.log('[MockSync] Starting full synchronization');

    try {
      // Step 1: Push local changes to server
      await this.pushLocalChanges();
      
      // Step 2: Pull server changes
      await this.pullServerChanges();
      
      // Step 3: Update sync timestamp
      this.lastSyncTimestamp = new Date();
      await this.saveSyncTimestamp();
      
      // Step 4: Clear processed queue items
      await this.clearProcessedQueueItems();
      
      console.log('[MockSync] Full synchronization completed');
      
      // Notify clients
      this.notifyClients('sync-completed', {
        timestamp: this.lastSyncTimestamp,
        queueLength: this.syncQueue.length
      });
      
    } catch (error) {
      console.error('[MockSync] Sync failed:', error);
      
      this.notifyClients('sync-error', {
        error: error.message
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  async pushLocalChanges() {
    console.log('[MockSync] Pushing local changes to server');
    
    const pendingItems = this.syncQueue.filter(item => item.status === 'pending');
    
    for (const item of pendingItems) {
      try {
        await this.pushSingleItem(item);
        item.status = 'completed';
        item.completedAt = new Date().toISOString();
      } catch (error) {
        console.error('[MockSync] Failed to push item:', item, error);
        item.status = 'failed';
        item.error = error.message;
        item.retryCount = (item.retryCount || 0) + 1;
        
        // Retry up to 3 times
        if (item.retryCount < 3) {
          item.status = 'pending';
        }
      }
    }
    
    await this.saveSyncQueue();
  }

  async pushSingleItem(item) {
    const { operation, table, data, itemId } = item;
    
    let url, method, body;
    
    switch (operation) {
      case 'create':
        url = this.getAPIEndpoint(table);
        method = 'POST';
        body = JSON.stringify(data);
        break;
        
      case 'update':
        url = this.getAPIEndpoint(table, itemId);
        method = 'PUT';
        body = JSON.stringify(data);
        break;
        
      case 'delete':
        url = this.getAPIEndpoint(table, itemId);
        method = 'DELETE';
        break;
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    const response = await fetch(`${this.realBackendUrl}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader()
      },
      body
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  async pullServerChanges() {
    console.log('[MockSync] Pulling server changes');
    
    const tables = ['users', 'content', 'projects', 'skills', 'experiences', 'media', 'settings'];
    
    for (const table of tables) {
      try {
        await this.pullTableChanges(table);
      } catch (error) {
        console.error(`[MockSync] Failed to pull changes for ${table}:`, error);
      }
    }
  }

  async pullTableChanges(table) {
    const endpoint = this.getAPIEndpoint(table);
    const url = `${this.realBackendUrl}${endpoint}`;
    
    // Include timestamp for incremental sync
    const params = new URLSearchParams();
    if (this.lastSyncTimestamp) {
      params.set('since', this.lastSyncTimestamp.toISOString());
    }
    
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to pull ${table}: ${response.status}`);
    }
    
    const result = await response.json();
    const serverItems = result.data || result[table] || [];
    
    for (const serverItem of serverItems) {
      await this.mergeServerItem(table, serverItem);
    }
  }

  async mergeServerItem(table, serverItem) {
    const localItem = await this.db.read(table, serverItem.id);
    
    if (!localItem) {
      // Item doesn't exist locally, create it
      await this.db.create(table, serverItem);
      console.log(`[MockSync] Created ${table} item from server:`, serverItem.id);
      return;
    }
    
    // Check for conflicts
    const hasConflict = this.hasConflict(localItem, serverItem);
    
    if (!hasConflict) {
      // No conflict, update local item
      await this.db.update(table, serverItem.id, serverItem);
      return;
    }
    
    // Handle conflict based on resolution strategy
    const resolvedItem = await this.resolveConflict(localItem, serverItem);
    await this.db.update(table, serverItem.id, resolvedItem);
    
    console.log(`[MockSync] Resolved conflict for ${table} item:`, serverItem.id);
  }

  hasConflict(localItem, serverItem) {
    const localUpdated = new Date(localItem.updatedAt);
    const serverUpdated = new Date(serverItem.updatedAt);
    
    // If server item is newer, no conflict
    if (serverUpdated >= localUpdated) {
      return false;
    }
    
    // Check if data actually differs
    const localData = { ...localItem };
    const serverData = { ...serverItem };
    
    // Remove timestamps for comparison
    delete localData.createdAt;
    delete localData.updatedAt;
    delete serverData.createdAt;
    delete serverData.updatedAt;
    
    return JSON.stringify(localData) !== JSON.stringify(serverData);
  }

  async resolveConflict(localItem, serverItem) {
    switch (this.conflictResolution) {
      case MockSync.SYNC_STRATEGIES.CLIENT_WINS:
        return localItem;
        
      case MockSync.SYNC_STRATEGIES.SERVER_WINS:
        return serverItem;
        
      case MockSync.SYNC_STRATEGIES.MERGE:
        return this.mergeItems(localItem, serverItem);
        
      case MockSync.SYNC_STRATEGIES.PROMPT_USER:
        return await this.promptUserForResolution(localItem, serverItem);
        
      default:
        return serverItem; // Default to server wins
    }
  }

  mergeItems(localItem, serverItem) {
    // Simple merge strategy - prefer local for content fields, server for metadata
    const merged = { ...serverItem };
    
    const contentFields = ['title', 'content', 'description', 'body'];
    
    for (const field of contentFields) {
      if (localItem[field] && localItem[field] !== serverItem[field]) {
        merged[field] = localItem[field];
      }
    }
    
    merged.updatedAt = new Date().toISOString();
    
    return merged;
  }

  async promptUserForResolution(localItem, serverItem) {
    // This would show a UI dialog in a real implementation
    // For now, return merged result
    console.warn('[MockSync] User prompt not implemented, using merge strategy');
    return this.mergeItems(localItem, serverItem);
  }

  getAPIEndpoint(table, itemId = null) {
    const endpoints = {
      users: '/api/users',
      content: '/api/content',
      projects: '/api/portfolio/projects',
      skills: '/api/portfolio/skills',
      experiences: '/api/portfolio/experiences',
      media: '/api/media',
      settings: '/api/settings'
    };
    
    const base = endpoints[table] || `/api/${table}`;
    return itemId ? `${base}/${itemId}` : base;
  }

  getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? `Bearer ${token}` : '';
  }

  async saveSyncTimestamp() {
    try {
      const existing = await this.db.findOne('settings', 'key', 'last_sync_timestamp');
      
      if (existing) {
        await this.db.update('settings', existing.id, {
          value: this.lastSyncTimestamp.toISOString()
        });
      } else {
        await this.db.create('settings', {
          key: 'last_sync_timestamp',
          value: this.lastSyncTimestamp.toISOString(),
          type: 'string'
        });
      }
    } catch (error) {
      console.error('[MockSync] Failed to save sync timestamp:', error);
    }
  }

  async clearProcessedQueueItems() {
    this.syncQueue = this.syncQueue.filter(item => 
      item.status === 'pending' || 
      (item.status === 'failed' && item.retryCount < 3)
    );
    
    await this.saveSyncQueue();
  }

  // Public methods for adding items to sync queue
  async queueCreate(table, data) {
    const item = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation: 'create',
      table,
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };
    
    this.syncQueue.push(item);
    await this.saveSyncQueue();
    
    // Try immediate sync if online
    if (this.isOnline) {
      this.scheduleSyncCheck();
    }
  }

  async queueUpdate(table, itemId, data) {
    const item = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation: 'update',
      table,
      itemId,
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };
    
    this.syncQueue.push(item);
    await this.saveSyncQueue();
    
    if (this.isOnline) {
      this.scheduleSyncCheck();
    }
  }

  async queueDelete(table, itemId) {
    const item = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation: 'delete',
      table,
      itemId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };
    
    this.syncQueue.push(item);
    await this.saveSyncQueue();
    
    if (this.isOnline) {
      this.scheduleSyncCheck();
    }
  }

  // Manual sync trigger
  async manualSync() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.performFullSync();
  }

  // Sync status methods
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSync: this.lastSyncTimestamp,
      queueLength: this.syncQueue.length,
      pendingOperations: this.syncQueue.filter(item => item.status === 'pending').length,
      failedOperations: this.syncQueue.filter(item => item.status === 'failed').length
    };
  }

  // Configuration methods
  setSyncStrategy(strategy) {
    if (Object.values(MockSync.SYNC_STRATEGIES).includes(strategy)) {
      this.conflictResolution = strategy;
      
      // Save to settings
      this.db.create('settings', {
        key: 'sync_strategy',
        value: strategy,
        type: 'string'
      }).catch(err => {
        // Update if already exists
        this.db.findOne('settings', 'key', 'sync_strategy').then(existing => {
          if (existing) {
            return this.db.update('settings', existing.id, { value: strategy });
          }
        });
      });
    }
  }

  // Utility methods
  notifyClients(event, data) {
    if (typeof self !== 'undefined' && self.clients) {
      // In service worker context
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'sync-event',
            event,
            data
          });
        });
      });
    } else {
      // In main thread context
      window.dispatchEvent(new CustomEvent('mock-sync-event', {
        detail: { event, data }
      }));
    }
  }

  // Export/import functionality for debugging
  async exportSyncData() {
    const data = {
      queue: this.syncQueue,
      settings: {
        conflictResolution: this.conflictResolution,
        lastSync: this.lastSyncTimestamp
      },
      status: this.getSyncStatus()
    };
    
    return data;
  }

  async importSyncData(data) {
    if (data.queue) {
      this.syncQueue = data.queue;
      await this.saveSyncQueue();
    }
    
    if (data.settings) {
      if (data.settings.conflictResolution) {
        this.setSyncStrategy(data.settings.conflictResolution);
      }
      if (data.settings.lastSync) {
        this.lastSyncTimestamp = new Date(data.settings.lastSync);
        await this.saveSyncTimestamp();
      }
    }
  }
}

// Export for use in service worker
if (typeof self !== 'undefined') {
  self.MockSync = MockSync;
}