# Realtime Features Documentation

This directory contains all the real-time functionality for the portfolio site using Supabase Realtime and WebSockets.

## 📁 File Structure

```
static/js/realtime/
├── main.js                 # Main entry point and initialization
├── realtime-init.js        # Central initialization and configuration
├── subscriptions.js        # Supabase Realtime subscriptions manager
├── websocket-manager.js    # WebSocket connection management
├── ui-updates.js           # DOM manipulation and notifications
├── events.js               # Event types, constants, and utilities
├── demo-events.js          # Demo event generation for testing
└── README.md              # This documentation file
```

## 🚀 Quick Start

### Basic Integration

The realtime features are automatically initialized when the page loads. No additional setup is required for basic functionality.

```javascript
// Realtime features are available globally
const status = window.getRealtimeStatus();
console.log('Realtime status:', status);
```

### Configuration

You can configure realtime features by updating the config in `main.js`:

```javascript
const config = {
  enableDemo: false,  // Enable demo events
  supabase: {
    url: 'your-supabase-url',
    anonKey: 'your-anon-key'
  },
  features: {
    comments: true,
    blogPosts: true,
    contactForms: true,
    presence: true,
    analytics: true
  }
};
```

## 📊 Features

### 1. Real-time Comments
- Live comment notifications
- Comment approval updates
- Comment count updates
- Optimistic UI updates

### 2. Blog Post Updates
- New post notifications
- Status change updates (draft → published)
- Live content updates

### 3. Contact Form Monitoring
- Real-time form submissions (admin only)
- Notification alerts for new contacts
- Admin dashboard integration

### 4. User Presence Tracking
- Online user count
- User join/leave notifications
- Page-specific presence
- Anonymous user support

### 5. Analytics Dashboard
- Real-time page views
- Live visitor counts
- Session tracking
- Performance metrics

## 🎛️ API Reference

### RealtimeManager

The main interface for managing realtime features:

```javascript
// Initialize with custom config
await realtimeManager.init(customConfig);

// Get current status
const status = realtimeManager.getConnectionStatus();

// Restart with new config
await realtimeManager.restart(newConfig);

// Shutdown all features
await realtimeManager.shutdown();
```

### Event System

Listen for realtime events:

```javascript
import { REALTIME_EVENTS, globalEventDispatcher } from './events.js';

// Listen for new comments
globalEventDispatcher.on(REALTIME_EVENTS.NEW_COMMENT, (data) => {
  console.log('New comment:', data.comment);
});

// Listen for presence changes
globalEventDispatcher.on(REALTIME_EVENTS.PRESENCE_SYNC, (data) => {
  console.log('Active users:', data.activeUsers);
});
```

### UI Updates

Manually trigger UI updates:

```javascript
// Show notification
uiUpdates.showNotification({
  type: 'success',
  title: 'Success!',
  message: 'Action completed successfully',
  duration: 3000
});

// Update counters
uiUpdates.updateCounter('comment-count', 42);

// Add optimistic update
uiUpdates.addOptimisticUpdate('comment-123', {
  content: 'Updated comment content'
});
```

## 🔧 Development & Testing

### Demo Mode

Demo mode generates realistic test events for development:

```javascript
// Start demo mode
realtimeDemo.start({
  commentInterval: 8000,    // New comment every 8 seconds
  presenceInterval: 12000,  // Presence change every 12 seconds
  contactInterval: 25000,   // Contact form every 25 seconds
});

// Generate single test event
realtimeDemo.generateTestEvent('comment');

// Generate burst of events
realtimeDemo.generateBurstEvents(5, ['comment', 'contact']);

// Stop demo mode
realtimeDemo.stop();
```

### Demo Controls

In development mode, demo controls are automatically added to the page:

- **New Comment**: Generate a test comment
- **Contact Form**: Generate a test contact submission
- **User Join/Leave**: Generate presence events
- **Burst Events**: Generate multiple events at once
- **Stop/Start Demo**: Toggle demo mode
- **Clear Notifications**: Clear all toast notifications

### Event Types

Available event types for testing:

```javascript
const REALTIME_EVENTS = {
  NEW_COMMENT: 'realtime:newComment',
  COMMENT_UPDATED: 'realtime:commentUpdated',
  NEW_BLOG_POST: 'realtime:newBlogPost',
  BLOG_POST_UPDATED: 'realtime:blogPostUpdated',
  NEW_CONTACT_FORM: 'realtime:newContactForm',
  USER_JOINED: 'realtime:userJoined',
  USER_LEFT: 'realtime:userLeft',
  PRESENCE_SYNC: 'realtime:presenceSync',
  ANALYTICS_UPDATE: 'realtime:analyticsUpdate'
};
```

## 🔒 Authentication Integration

The realtime system integrates with the existing authentication system:

```javascript
// Listen for auth changes
window.addEventListener('auth:login', (e) => {
  // User logged in, enable user-specific features
});

window.addEventListener('auth:logout', (e) => {
  // User logged out, switch to anonymous mode
});
```

Admin users get additional features:
- Contact form notifications
- Analytics dashboard updates
- Comment moderation queue
- Enhanced presence tracking

## 🎨 UI Components

### Notification System

Styled toast notifications with different types:
- **Success**: Green border, checkmark icon
- **Error**: Red border, error icon  
- **Warning**: Orange border, warning icon
- **Info**: Blue border, info icon

### Live Counters

Elements with `data-live-counter` attribute are automatically tracked:

```html
<span data-live-counter="comment-count">5</span>
<span data-live-counter="active-users">0</span>
```

### Connection Status

Connection status indicator shows current realtime connection state:
- **Connected**: Green indicator, "Online"
- **Connecting**: Orange indicator, "Connecting..."
- **Disconnected**: Red indicator, "Offline"

## 📱 Admin Dashboard

The admin dashboard (`/admin/realtime-dashboard.html`) provides:

- **Live Metrics**: Active users, page views, pending items
- **Activity Feed**: Real-time event stream
- **User Presence**: Online users list
- **Contact Forms**: Live submission tracking
- **Comment Moderation**: Real-time comment queue
- **Analytics Charts**: Live performance data

### Dashboard Features

- **Real-time Updates**: All metrics update automatically
- **Interactive Controls**: Approve/reject comments, reply to contacts
- **Export Data**: Download dashboard metrics as JSON
- **Connection Monitoring**: Visual connection status
- **Responsive Design**: Works on all device sizes

## 🔍 Troubleshooting

### Common Issues

1. **Realtime not connecting**
   - Check Supabase configuration
   - Verify network connectivity
   - Check browser console for errors

2. **Events not firing**
   - Ensure proper initialization
   - Check event listener setup
   - Verify demo mode is enabled for testing

3. **UI not updating**
   - Check DOM elements exist
   - Verify counter attributes
   - Check notification container

### Debug Tools

```javascript
// Get comprehensive status
const status = window.getRealtimeStatus();
console.log(status);

// Check WebSocket connections
const wsStatus = wsManager.getAllConnectionStatuses();
console.log('WebSocket status:', wsStatus);

// Check subscriptions
const subStatus = realtimeSubscriptions.getSubscriptionStatus();
console.log('Subscription status:', subStatus);
```

### Performance Monitoring

The system includes built-in performance tracking:
- Connection latency monitoring
- Event processing times
- Memory usage tracking
- Error rate monitoring

## 🤝 Contributing

When contributing to realtime features:

1. **Follow the event system**: Use the centralized event dispatcher
2. **Handle errors gracefully**: Include try-catch blocks and fallbacks
3. **Test with demo mode**: Verify features work with generated events
4. **Update documentation**: Keep this README current
5. **Consider performance**: Batch operations and debounce frequent events

## 📄 License

This realtime implementation is part of the portfolio site project and follows the same licensing terms.