/**
 * Mock Database System using IndexedDB with localStorage fallback
 * Provides persistent storage for CMS data with automatic sync capabilities
 */

class MockDatabase {
  static instance = null;
  static DB_NAME = 'PortfolioCMSMockDB';
  static DB_VERSION = 1;
  static STORES = {
    users: { keyPath: 'id', autoIncrement: true },
    content: { keyPath: 'id', autoIncrement: true },
    media: { keyPath: 'id', autoIncrement: true },
    projects: { keyPath: 'id', autoIncrement: true },
    skills: { keyPath: 'id', autoIncrement: true },
    experiences: { keyPath: 'id', autoIncrement: true },
    education: { keyPath: 'id', autoIncrement: true },
    testimonials: { keyPath: 'id', autoIncrement: true },
    tags: { keyPath: 'id', autoIncrement: true },
    settings: { keyPath: 'key' },
    sessions: { keyPath: 'id', autoIncrement: true },
    logs: { keyPath: 'id', autoIncrement: true },
    backups: { keyPath: 'id', autoIncrement: true },
    sync_queue: { keyPath: 'id', autoIncrement: true }
  };

  constructor() {
    this.db = null;
    this.isIndexedDBSupported = this.checkIndexedDBSupport();
    this.fallbackStorage = new Map();
    this.initialized = false;
  }

  static getInstance() {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  static async initialize() {
    const instance = MockDatabase.getInstance();
    if (!instance.initialized) {
      await instance.init();
    }
    return instance;
  }

  checkIndexedDBSupport() {
    return 'indexedDB' in self && indexedDB !== null;
  }

  async init() {
    if (this.initialized) return;

    if (this.isIndexedDBSupported) {
      await this.initIndexedDB();
    } else {
      console.warn('[MockDB] IndexedDB not supported, using localStorage fallback');
      await this.initLocalStorageFallback();
    }

    await this.seedDefaultData();
    this.initialized = true;
    console.log('[MockDB] Database initialized successfully');
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MockDatabase.DB_NAME, MockDatabase.DB_VERSION);

      request.onerror = () => {
        console.error('[MockDB] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[MockDB] IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[MockDB] Upgrading database schema');

        // Create object stores
        Object.entries(MockDatabase.STORES).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, config);
            
            // Add indexes based on store type
            this.createIndexes(store, storeName);
            
            console.log(`[MockDB] Created store: ${storeName}`);
          }
        });
      };
    });
  }

  createIndexes(store, storeName) {
    const indexConfigs = {
      users: [
        ['email', 'email', { unique: true }],
        ['username', 'username', { unique: true }],
        ['createdAt', 'createdAt']
      ],
      content: [
        ['path', 'path', { unique: true }],
        ['type', 'type'],
        ['status', 'status'],
        ['createdAt', 'createdAt'],
        ['updatedAt', 'updatedAt']
      ],
      media: [
        ['filename', 'filename'],
        ['type', 'type'],
        ['uploadedAt', 'uploadedAt']
      ],
      projects: [
        ['slug', 'slug', { unique: true }],
        ['status', 'status'],
        ['category', 'category'],
        ['createdAt', 'createdAt']
      ],
      skills: [
        ['name', 'name', { unique: true }],
        ['category', 'category']
      ],
      experiences: [
        ['company', 'company'],
        ['position', 'position'],
        ['startDate', 'startDate']
      ],
      education: [
        ['institution', 'institution'],
        ['degree', 'degree'],
        ['startDate', 'startDate']
      ],
      testimonials: [
        ['author', 'author'],
        ['createdAt', 'createdAt']
      ],
      tags: [
        ['name', 'name', { unique: true }],
        ['category', 'category']
      ],
      sessions: [
        ['userId', 'userId'],
        ['token', 'token', { unique: true }],
        ['expiresAt', 'expiresAt']
      ],
      logs: [
        ['level', 'level'],
        ['timestamp', 'timestamp'],
        ['userId', 'userId']
      ],
      sync_queue: [
        ['status', 'status'],
        ['createdAt', 'createdAt']
      ]
    };

    const configs = indexConfigs[storeName] || [];
    configs.forEach(([indexName, keyPath, options = {}]) => {
      try {
        store.createIndex(indexName, keyPath, options);
      } catch (error) {
        console.warn(`[MockDB] Index ${indexName} already exists in ${storeName}`);
      }
    });
  }

  async initLocalStorageFallback() {
    // Initialize localStorage-based storage
    Object.keys(MockDatabase.STORES).forEach(storeName => {
      const key = `mockdb_${storeName}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // CRUD Operations
  async create(storeName, data) {
    if (!this.initialized) await this.init();

    const timestamp = new Date().toISOString();
    const record = {
      ...data,
      createdAt: data.createdAt || timestamp,
      updatedAt: data.updatedAt || timestamp
    };

    if (this.isIndexedDBSupported && this.db) {
      return this.createIndexedDB(storeName, record);
    } else {
      return this.createLocalStorage(storeName, record);
    }
  }

  async createIndexedDB(storeName, record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(record);

      request.onsuccess = () => {
        const result = { ...record, id: request.result };
        console.log(`[MockDB] Created record in ${storeName}:`, result.id);
        resolve(result);
      };

      request.onerror = () => {
        console.error(`[MockDB] Failed to create record in ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  async createLocalStorage(storeName, record) {
    const key = `mockdb_${storeName}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    
    const id = record.id || Date.now() + Math.random();
    const newRecord = { ...record, id };
    
    data.push(newRecord);
    localStorage.setItem(key, JSON.stringify(data));
    
    console.log(`[MockDB] Created record in ${storeName}:`, id);
    return newRecord;
  }

  async read(storeName, id) {
    if (!this.initialized) await this.init();

    if (this.isIndexedDBSupported && this.db) {
      return this.readIndexedDB(storeName, id);
    } else {
      return this.readLocalStorage(storeName, id);
    }
  }

  async readIndexedDB(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error(`[MockDB] Failed to read record from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  async readLocalStorage(storeName, id) {
    const key = `mockdb_${storeName}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return data.find(record => record.id == id) || null;
  }

  async update(storeName, id, updates) {
    if (!this.initialized) await this.init();

    const existing = await this.read(storeName, id);
    if (!existing) {
      throw new Error(`Record with id ${id} not found in ${storeName}`);
    }

    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    if (this.isIndexedDBSupported && this.db) {
      return this.updateIndexedDB(storeName, updated);
    } else {
      return this.updateLocalStorage(storeName, updated);
    }
  }

  async updateIndexedDB(storeName, record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(record);

      request.onsuccess = () => {
        console.log(`[MockDB] Updated record in ${storeName}:`, record.id);
        resolve(record);
      };

      request.onerror = () => {
        console.error(`[MockDB] Failed to update record in ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  async updateLocalStorage(storeName, record) {
    const key = `mockdb_${storeName}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    
    const index = data.findIndex(r => r.id == record.id);
    if (index === -1) {
      throw new Error(`Record with id ${record.id} not found in ${storeName}`);
    }
    
    data[index] = record;
    localStorage.setItem(key, JSON.stringify(data));
    
    console.log(`[MockDB] Updated record in ${storeName}:`, record.id);
    return record;
  }

  async delete(storeName, id) {
    if (!this.initialized) await this.init();

    if (this.isIndexedDBSupported && this.db) {
      return this.deleteIndexedDB(storeName, id);
    } else {
      return this.deleteLocalStorage(storeName, id);
    }
  }

  async deleteIndexedDB(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`[MockDB] Deleted record from ${storeName}:`, id);
        resolve(true);
      };

      request.onerror = () => {
        console.error(`[MockDB] Failed to delete record from ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  async deleteLocalStorage(storeName, id) {
    const key = `mockdb_${storeName}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    
    const filteredData = data.filter(record => record.id != id);
    localStorage.setItem(key, JSON.stringify(filteredData));
    
    console.log(`[MockDB] Deleted record from ${storeName}:`, id);
    return true;
  }

  // Query operations
  async findAll(storeName, options = {}) {
    if (!this.initialized) await this.init();

    let results;
    
    if (this.isIndexedDBSupported && this.db) {
      results = await this.findAllIndexedDB(storeName);
    } else {
      results = await this.findAllLocalStorage(storeName);
    }

    // Apply filters and sorting
    return this.applyQueryOptions(results, options);
  }

  async findAllIndexedDB(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error(`[MockDB] Failed to query ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  async findAllLocalStorage(storeName) {
    const key = `mockdb_${storeName}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  async findBy(storeName, field, value, options = {}) {
    const all = await this.findAll(storeName);
    const filtered = all.filter(record => record[field] === value);
    return this.applyQueryOptions(filtered, options);
  }

  async findOne(storeName, field, value) {
    const results = await this.findBy(storeName, field, value, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  applyQueryOptions(results, options) {
    let filtered = [...results];

    // Apply filters
    if (options.where) {
      filtered = filtered.filter(record => {
        return Object.entries(options.where).every(([key, value]) => {
          if (typeof value === 'object' && value.like) {
            return record[key] && record[key].toLowerCase().includes(value.like.toLowerCase());
          }
          return record[key] === value;
        });
      });
    }

    // Apply sorting
    if (options.orderBy) {
      const [field, direction = 'ASC'] = options.orderBy;
      filtered.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) return direction === 'ASC' ? -1 : 1;
        if (aVal > bVal) return direction === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    if (options.limit) {
      const start = options.offset || 0;
      filtered = filtered.slice(start, start + options.limit);
    }

    return filtered;
  }

  // Utility methods
  async count(storeName, where = {}) {
    const results = await this.findAll(storeName, { where });
    return results.length;
  }

  async exists(storeName, field, value) {
    const record = await this.findOne(storeName, field, value);
    return !!record;
  }

  async seedDefaultData() {
    try {
      // Check if admin user exists
      const adminExists = await this.exists('users', 'email', 'admin@portfolio.dev');
      
      if (!adminExists) {
        // Create default admin user
        await this.create('users', {
          email: 'admin@portfolio.dev',
          username: 'admin',
          password: '$2b$10$rQvKgQhjQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ', // hashed 'admin123!'
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: true,
          emailVerified: true
        });

        console.log('[MockDB] Default admin user created');
      }

      // Create default settings
      const settingsExist = await this.read('settings', 'site_title');
      if (!settingsExist) {
        await this.create('settings', {
          key: 'site_title',
          value: 'Portfolio CMS',
          type: 'string'
        });

        await this.create('settings', {
          key: 'site_description',
          value: 'A modern portfolio content management system',
          type: 'string'
        });

        await this.create('settings', {
          key: 'theme',
          value: 'light',
          type: 'string'
        });

        console.log('[MockDB] Default settings created');
      }

    } catch (error) {
      console.error('[MockDB] Failed to seed default data:', error);
    }
  }

  // Backup and restore
  async exportData() {
    const export_data = {};
    
    for (const storeName of Object.keys(MockDatabase.STORES)) {
      export_data[storeName] = await this.findAll(storeName);
    }
    
    return {
      version: MockDatabase.DB_VERSION,
      timestamp: new Date().toISOString(),
      data: export_data
    };
  }

  async importData(importData) {
    if (!importData.data) {
      throw new Error('Invalid import data format');
    }

    // Clear existing data
    await this.clearAllData();

    // Import new data
    for (const [storeName, records] of Object.entries(importData.data)) {
      if (MockDatabase.STORES[storeName] && Array.isArray(records)) {
        for (const record of records) {
          await this.create(storeName, record);
        }
      }
    }

    console.log('[MockDB] Data import completed');
  }

  async clearAllData() {
    for (const storeName of Object.keys(MockDatabase.STORES)) {
      if (this.isIndexedDBSupported && this.db) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise(resolve => {
          const request = store.clear();
          request.onsuccess = () => resolve();
        });
      } else {
        localStorage.removeItem(`mockdb_${storeName}`);
      }
    }
  }
}

// Export for use in service worker
if (typeof self !== 'undefined') {
  self.MockDatabase = MockDatabase;
}