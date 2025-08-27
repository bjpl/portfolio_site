'use client';

import { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show install prompt for iOS after a delay
    if (ios && !standalone) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOS) return;

    if (deferredPrompt) {
      // For Chrome/Edge
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Remember user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or user previously dismissed
  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  // Check if user dismissed recently (within 7 days)
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  if (dismissedTime) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) {
      return null;
    }
  }

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-content">
        <div className="pwa-install-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" 
              fill="currentColor"
            />
          </svg>
        </div>
        
        <div className="pwa-install-text">
          <h3 className="pwa-install-title">Install Portfolio App</h3>
          <p className="pwa-install-description">
            {isIOS 
              ? 'Add to your home screen for a better experience. Tap the share button and select "Add to Home Screen".'
              : 'Get the full experience with our mobile app. Install now for offline access and faster loading.'
            }
          </p>
        </div>
        
        <div className="pwa-install-actions">
          {!isIOS && (
            <button 
              onClick={handleInstallClick}
              className="pwa-install-button"
              disabled={!deferredPrompt}
            >
              Install
            </button>
          )}
          
          <button 
            onClick={handleDismiss}
            className="pwa-dismiss-button"
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </div>
      </div>

      <style jsx>{`
        .pwa-install-prompt {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          max-width: 400px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          z-index: 1000;
          animation: slideUp 0.3s ease-out;
        }

        .pwa-install-content {
          display: flex;
          align-items: center;
          padding: 16px;
          gap: 12px;
        }

        .pwa-install-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4A90E2 0%, #5BA3F5 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .pwa-install-text {
          flex: 1;
          min-width: 0;
        }

        .pwa-install-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1a1a1a;
        }

        .pwa-install-description {
          font-size: 14px;
          margin: 0;
          color: #666;
          line-height: 1.4;
        }

        .pwa-install-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .pwa-install-button {
          background: linear-gradient(135deg, #4A90E2 0%, #5BA3F5 100%);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pwa-install-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .pwa-install-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .pwa-dismiss-button {
          background: none;
          border: none;
          color: #999;
          font-size: 16px;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .pwa-dismiss-button:hover {
          background: #f5f5f5;
          color: #666;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .pwa-install-prompt {
            left: 10px;
            right: 10px;
            bottom: 10px;
          }

          .pwa-install-content {
            padding: 12px;
            gap: 10px;
          }

          .pwa-install-title {
            font-size: 15px;
          }

          .pwa-install-description {
            font-size: 13px;
          }

          .pwa-install-button {
            padding: 6px 12px;
            font-size: 13px;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .pwa-install-prompt {
            background: #1a1a1a;
            border: 1px solid #333;
          }

          .pwa-install-title {
            color: #fff;
          }

          .pwa-install-description {
            color: #ccc;
          }

          .pwa-dismiss-button {
            color: #666;
          }

          .pwa-dismiss-button:hover {
            background: #333;
            color: #999;
          }
        }
      `}</style>
    </div>
  );
};

export default PWAInstallPrompt;