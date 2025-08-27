'use client';

import { useState, useEffect } from 'react';

const PushNotifications = () => {
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      // Get current permission status
      setPermission(Notification.permission);

      // Check if already subscribed
      navigator.serviceWorker.ready.then((registration) => {
        return registration.pushManager.getSubscription();
      }).then((existingSubscription) => {
        setSubscription(existingSubscription);
      }).catch((error) => {
        console.error('Error checking push subscription:', error);
      });
    }
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToNotifications = async () => {
    if (!isSupported || permission === 'denied') {
      return false;
    }

    setIsSubscribing(true);

    try {
      // Request notification permission
      const notificationPermission = await Notification.requestPermission();
      setPermission(notificationPermission);

      if (notificationPermission !== 'granted') {
        setIsSubscribing(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // VAPID public key - replace with your actual key
      const vapidPublicKey = 'BH8S5L9hBg1zPLrP8zvuPdX8DtLW6hGwzCu9lHo4bX4ycqrJ3mCbNq4l2pHqWvQ8-example-key-replace-with-actual';

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(pushSubscription);

      // Send subscription to server
      await sendSubscriptionToServer(pushSubscription);

      console.log('Successfully subscribed to push notifications');
      return true;

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribeFromNotifications = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      setSubscription(null);

      // Remove subscription from server
      await removeSubscriptionFromServer(subscription);

      console.log('Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  };

  const sendSubscriptionToServer = async (subscription) => {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      console.log('Subscription sent to server successfully');
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      // Still allow local subscription even if server fails
    }
  };

  const removeSubscriptionFromServer = async (subscription) => {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }

      console.log('Subscription removed from server successfully');
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  };

  const sendTestNotification = async () => {
    if (!subscription) return;

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          title: 'Test Notification',
          body: 'This is a test notification from Brandon Lambert Portfolio',
          data: {
            url: '/',
            timestamp: Date.now()
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className="push-notifications-container">
      <div className="notification-status">
        <div className="status-indicator">
          <div className={`status-dot ${subscription ? 'active' : 'inactive'}`}></div>
          <span className="status-text">
            {subscription ? 'Notifications enabled' : 'Notifications disabled'}
          </span>
        </div>

        {permission === 'denied' && (
          <p className="permission-denied">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        )}
      </div>

      <div className="notification-actions">
        {!subscription ? (
          <button 
            onClick={subscribeToNotifications}
            disabled={isSubscribing || permission === 'denied'}
            className="subscribe-button"
          >
            {isSubscribing ? 'Subscribing...' : 'Enable Notifications'}
          </button>
        ) : (
          <>
            <button 
              onClick={unsubscribeFromNotifications}
              className="unsubscribe-button"
            >
              Disable Notifications
            </button>
            
            <button 
              onClick={sendTestNotification}
              className="test-button"
            >
              Send Test Notification
            </button>
          </>
        )}
      </div>

      {subscription && (
        <div className="subscription-info">
          <p className="subscription-details">
            You'll receive notifications about new blog posts, project updates, and important announcements.
          </p>
        </div>
      )}

      <style jsx>{`
        .push-notifications-container {
          padding: 20px;
          border-radius: 8px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          margin: 16px 0;
        }

        .notification-status {
          margin-bottom: 16px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.active {
          background: #28a745;
        }

        .status-dot.inactive {
          background: #6c757d;
        }

        .status-text {
          font-weight: 500;
          color: #495057;
        }

        .permission-denied {
          color: #dc3545;
          font-size: 14px;
          margin: 8px 0;
          padding: 8px 12px;
          background: #f8d7da;
          border-radius: 4px;
          border: 1px solid #f5c6cb;
        }

        .notification-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .subscribe-button, .unsubscribe-button, .test-button {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .subscribe-button {
          background: linear-gradient(135deg, #4A90E2 0%, #5BA3F5 100%);
          color: white;
        }

        .subscribe-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .subscribe-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .unsubscribe-button {
          background: #6c757d;
          color: white;
        }

        .unsubscribe-button:hover {
          background: #5a6268;
          transform: translateY(-1px);
        }

        .test-button {
          background: #17a2b8;
          color: white;
        }

        .test-button:hover {
          background: #138496;
          transform: translateY(-1px);
        }

        .subscription-info {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e9ecef;
        }

        .subscription-details {
          font-size: 14px;
          color: #6c757d;
          margin: 0;
          line-height: 1.4;
        }

        @media (max-width: 480px) {
          .push-notifications-container {
            padding: 16px;
          }

          .notification-actions {
            flex-direction: column;
          }

          .subscribe-button, .unsubscribe-button, .test-button {
            width: 100%;
            justify-content: center;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .push-notifications-container {
            background: #1a1a1a;
            border-color: #333;
          }

          .status-text {
            color: #ccc;
          }

          .permission-denied {
            background: #3d1a1a;
            border-color: #5c2c2c;
            color: #ff6b6b;
          }

          .subscription-details {
            color: #999;
          }
        }
      `}</style>
    </div>
  );
};

export default PushNotifications;