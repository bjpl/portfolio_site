# Mock Backend System

A complete in-browser mock backend system that provides full offline CMS functionality using Service Workers, IndexedDB, and localStorage fallbacks.

## Features

- **Complete Offline Functionality**: Works entirely without internet connection
- **Service Worker Architecture**: Intercepts API calls and provides mock responses
- **Persistent Storage**: Uses IndexedDB with localStorage fallback
- **JWT Authentication**: Full authentication system with session management
- **Real-time Updates**: Mock WebSocket implementation for live features
- **Automatic Sync**: Synchronizes with real backend when available
- **CRUD Operations**: Full Create, Read, Update, Delete support
- **File Management**: Mock file upload and management system

## Architecture

### Core Components

1. **Service Worker (`service-worker.js`)**
   - Intercepts all API requests
   - Routes to appropriate mock handlers
   - Manages caching and offline functionality
   - Handles WebSocket simulation

2. **Mock Database (`mock-database.js`)**
   - IndexedDB wrapper with localStorage fallback
   - Supports complex queries and relationships
   - Automatic schema creation and migration
   - Data import/export functionality

3. **Mock Authentication (`mock-auth.js`)**
   - JWT token generation and validation
   - User registration and login
   - Session management
   - Password reset functionality

4. **API Handlers (`mock-api-handlers.js`)**
   - Comprehensive API endpoint coverage
   - Matches real backend API structure
   - Content management operations
   - Dashboard and analytics

5. **Sync System (`mock-sync.js`)**
   - Offline-first synchronization
   - Conflict resolution strategies
   - Queue management for offline operations
   - Automatic sync when online

6. **WebSocket Simulation (`mock-websocket.js`)**
   - Real-time messaging simulation
   - Room management
   - Event broadcasting
   - Client state management

7. **Client Library (`mock-client.js`)**
   - Easy-to-use API for applications
   - Event-driven architecture
   - Automatic service worker registration
   - Authentication state management

## Quick Start

### 1. Basic Setup

```html
<!-- Include the mock backend client -->
<script src="/js/mock-backend/mock-client.js"></script>

<script>
// Initialize the mock backend
window.mockBackendClient.initialize({
  debug: true,
  enableWebSocket: true,
  enableSync: true
}).then(success => {
  if (success) {
    console.log('Mock backend ready!');
  }
});
</script>
```

### 2. Authentication

```javascript
// Login
try {
  const result = await window.mockBackendClient.login('admin@portfolio.dev', 'admin123!');
  console.log('Logged in:', result.user);
} catch (error) {
  console.error('Login failed:', error.message);
}

// Check authentication status
if (window.mockBackendClient.isAuthenticated) {
  console.log('User:', window.mockBackendClient.currentUser);
}

// Listen for authentication changes
window.mockBackendClient.on('authentication-changed', (data) => {
  console.log('Auth status changed:', data);
});
```

### 3. Content Management

```javascript
// Create content
const content = await window.mockBackendClient.createContent({
  path: 'blog/my-post',
  title: 'My New Post',
  content: 'This is the content...',
  type: 'post',
  status: 'published'
});

// Get content
const blogPost = await window.mockBackendClient.getContent('blog/my-post');

// Update content
const updated = await window.mockBackendClient.updateContent('blog/my-post', {
  title: 'Updated Title'
});

// Search content
const results = await window.mockBackendClient.searchContent('javascript');
```

### 4. File Management

```javascript
// Upload file
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];

const uploadResult = await window.mockBackendClient.uploadFile(file, 'images/');
console.log('Uploaded:', uploadResult.file.url);

// Get files
const files = await window.mockBackendClient.getFiles('images/');
```

### 5. Real-time Features

```javascript
// Connect to WebSocket
await window.mockBackendClient.joinRoom('content-updates');

// Listen for real-time updates
window.mockBackendClient.on('ws-content-updated', (data) => {
  console.log('Content updated:', data);
});

// Send message
await window.mockBackendClient.sendWebSocketMessage({
  type: 'content-update',
  contentId: 'blog/my-post',
  action: 'updated'
});
```

## Default Data

The mock backend comes with default data including:

- **Admin User**: 
  - Email: `admin@portfolio.dev`
  - Password: `admin123!`
- **Settings**: Basic site configuration
- **Sample Content**: Example blog posts and pages

## API Endpoints

The mock backend provides the following API endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token

### Content Management
- `GET /api/content` - List all content
- `POST /api/content` - Create content
- `GET /api/content/:path` - Get specific content
- `PUT /api/content/:path` - Update content
- `DELETE /api/content/:path` - Delete content
- `GET /api/content/search` - Search content

### File Management
- `GET /api/files` - List files
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/:path` - Delete file

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings

## Configuration Options

```javascript
const options = {
  // Service worker path
  serviceWorkerPath: '/js/mock-backend/service-worker.js',
  
  // Enable WebSocket simulation
  enableWebSocket: true,
  
  // Enable sync functionality  
  enableSync: true,
  
  // Auto-register service worker
  autoRegister: true,
  
  // Enable debug logging
  debug: false
};

await window.mockBackendClient.initialize(options);
```

## Events

The mock backend client emits various events:

```javascript
// System events
window.mockBackendClient.on('initialized', (data) => {});
window.mockBackendClient.on('error', (data) => {});

// Authentication events
window.mockBackendClient.on('login-success', (data) => {});
window.mockBackendClient.on('login-error', (data) => {});
window.mockBackendClient.on('logout-success', (data) => {});

// Sync events
window.mockBackendClient.on('sync-completed', (data) => {});
window.mockBackendClient.on('sync-error', (data) => {});

// Network events
window.mockBackendClient.on('network-status-changed', (data) => {});

// WebSocket events
window.mockBackendClient.on('ws-message', (data) => {});
window.mockBackendClient.on('ws-connected', (data) => {});
window.mockBackendClient.on('ws-disconnected', (data) => {});
```

## Browser Support

- **IndexedDB**: All modern browsers (IE11+)
- **Service Workers**: Chrome 40+, Firefox 44+, Safari 11.1+
- **localStorage**: All browsers (fallback for IndexedDB)

## Troubleshooting

### Service Worker Issues

```javascript
// Check if service worker is registered
if (window.mockBackendClient.isRegistered) {
  console.log('Service Worker registered');
} else {
  console.error('Service Worker registration failed');
}

// Force service worker update
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then(registration => {
    if (registration) {
      registration.update();
    }
  });
}
```

### Database Issues

```javascript
// Check database status
const status = window.mockBackendClient.getStatus();
console.log('Mock backend status:', status);

// Clear all data (use with caution)
if (window.MockDatabase) {
  const db = await MockDatabase.initialize();
  await db.clearAllData();
}
```

### Sync Issues

```javascript
// Get sync status
const syncStatus = window.mockBackendClient.getSyncStatus();
console.log('Sync status:', syncStatus);

// Force manual sync
try {
  await window.mockBackendClient.manualSync();
  console.log('Sync completed');
} catch (error) {
  console.error('Sync failed:', error);
}
```

## Advanced Usage

### Custom API Handlers

You can add custom API handlers by extending the mock system:

```javascript
// Add custom handler in service worker context
if (typeof self !== 'undefined' && self.MockAPIHandlers) {
  self.MockAPIHandlers.registerHandler('/custom/endpoint', {
    get: async (req) => {
      return {
        status: 200,
        data: { message: 'Custom response' }
      };
    }
  });
}
```

### Custom Sync Strategies

```javascript
// Set sync conflict resolution strategy
if (window.MockSync) {
  const sync = await MockSync.initialize();
  sync.setSyncStrategy('client_wins'); // or 'server_wins', 'merge'
}
```

### Development Mode

```javascript
// Enable development mode with extra logging
window.mockBackendClient.initialize({
  debug: true,
  serviceWorkerPath: '/js/mock-backend/service-worker.js?dev=true'
});
```

This mock backend system provides complete offline functionality for your CMS, ensuring users can work seamlessly whether online or offline, with automatic synchronization when connectivity is restored.