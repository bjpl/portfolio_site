import { NextResponse } from 'next/server';

// Web Push library would be imported here in production
// import webpush from 'web-push';

// Import the same subscriptions store (in production, use a database)
const subscriptions = new Map();

// VAPID keys configuration (replace with your actual keys in production)
const VAPID_KEYS = {
  publicKey: 'BH8S5L9hBg1zPLrP8zvuPdX8DtLW6hGwzCu9lHo4bX4ycqrJ3mCbNq4l2pHqWvQ8-example-key-replace-with-actual',
  privateKey: 'your-private-vapid-key-here-replace-with-actual-key'
};

// Configure web push (uncomment in production with actual web-push library)
/*
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);
*/

export async function POST(request) {
  try {
    const { subscription, title, body, data, targetSubscriptionId } = await request.json();
    
    if (!title && !body) {
      return NextResponse.json(
        { error: 'Title or body is required' },
        { status: 400 }
      );
    }
    
    const notification = {
      title: title || 'Brandon Lambert Portfolio',
      body: body || 'New content available!',
      icon: '/images/pwa/icon-192x192.png',
      badge: '/images/pwa/icon-72x72.png',
      image: '/images/pwa/notification-image.jpg',
      tag: `portfolio-${Date.now()}`,
      timestamp: Date.now(),
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      data: {
        url: '/',
        timestamp: Date.now(),
        ...data
      },
      actions: [
        {
          action: 'open',
          title: 'Open Portfolio',
          icon: '/images/pwa/action-open.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/images/pwa/action-dismiss.png'
        }
      ]
    };
    
    const results = [];
    
    if (targetSubscriptionId) {
      // Send to specific subscription
      const targetSubscription = subscriptions.get(targetSubscriptionId);
      if (targetSubscription && targetSubscription.isActive) {
        const result = await sendNotificationToSubscription(
          targetSubscription.subscription, 
          notification
        );
        results.push({ subscriptionId: targetSubscriptionId, ...result });
      } else {
        return NextResponse.json(
          { error: 'Subscription not found or inactive' },
          { status: 404 }
        );
      }
    } else if (subscription) {
      // Send to provided subscription (test notification)
      const result = await sendNotificationToSubscription(subscription, notification);
      results.push({ type: 'test', ...result });
    } else {
      // Send to all active subscriptions (broadcast)
      const activeSubscriptions = Array.from(subscriptions.values()).filter(s => s.isActive);
      
      if (activeSubscriptions.length === 0) {
        return NextResponse.json(
          { message: 'No active subscriptions found', sent: 0 },
          { status: 200 }
        );
      }
      
      for (const sub of activeSubscriptions) {
        const result = await sendNotificationToSubscription(sub.subscription, notification);
        results.push({ subscriptionId: sub.id, ...result });
        
        // Update last notification timestamp
        sub.lastNotification = new Date().toISOString();
        subscriptions.set(sub.id, sub);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`[PWA] Notifications sent: ${successCount} successful, ${errorCount} failed`);
    
    return NextResponse.json({
      message: 'Notification sending completed',
      sent: successCount,
      failed: errorCount,
      results: process.env.NODE_ENV === 'development' ? results : undefined
    });
    
  } catch (error) {
    console.error('[PWA] Error sending notification:', error);
    
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

async function sendNotificationToSubscription(subscription, payload) {
  try {
    // In production, use the web-push library:
    /*
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true, error: null };
    */
    
    // For development/testing - simulate sending
    console.log('[PWA] Simulating notification send:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      title: payload.title,
      body: payload.body
    });
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures for testing
    const shouldFail = Math.random() < 0.1; // 10% failure rate
    
    if (shouldFail) {
      return { 
        success: false, 
        error: 'Simulated network error' 
      };
    }
    
    return { success: true, error: null };
    
  } catch (error) {
    console.error('[PWA] Failed to send notification:', error.message);
    
    return { 
      success: false, 
      error: error.message || 'Unknown error'
    };
  }
}

// GET method to check notification service status
export async function GET() {
  const stats = {
    service: 'active',
    activeSubscriptions: Array.from(subscriptions.values()).filter(s => s.isActive).length,
    totalSubscriptions: subscriptions.size,
    vapidConfigured: !!VAPID_KEYS.publicKey,
    lastNotificationSent: subscriptions.size > 0 ? 
      Math.max(...Array.from(subscriptions.values())
        .filter(s => s.lastNotification)
        .map(s => new Date(s.lastNotification).getTime())) || null : null
  };
  
  return NextResponse.json(stats);
}