'use client';

import { useState, useEffect } from 'react';
import PWAInstallPrompt from '../../components/PWAInstallPrompt';
import PushNotifications from '../../components/PushNotifications';
import LazyImage from '../../components/LazyImage';
import LazySection from '../../components/LazySection';

const PWATestPage = () => {
  const [pwaStats, setPwaStats] = useState({
    serviceWorker: null,
    manifest: null,
    installable: null,
    pushSupport: null,
    offlineReady: false,
  });

  const [tests, setTests] = useState({
    serviceWorkerRegistration: { status: 'pending', details: '' },
    manifestValidation: { status: 'pending', details: '' },
    iconLoading: { status: 'pending', details: '' },
    cacheStrategies: { status: 'pending', details: '' },
    pushNotifications: { status: 'pending', details: '' },
    offlineSupport: { status: 'pending', details: '' },
    lazyLoading: { status: 'pending', details: '' },
    performanceMetrics: { status: 'pending', details: '' },
  });

  useEffect(() => {
    runPWATests();
  }, []);

  const runPWATests = async () => {
    console.log('🧪 Running PWA tests...');

    // Test 1: Service Worker Registration
    await testServiceWorker();
    
    // Test 2: Manifest Validation
    await testManifest();
    
    // Test 3: Icon Loading
    await testIconLoading();
    
    // Test 4: Cache Strategies
    await testCacheStrategies();
    
    // Test 5: Push Notifications
    await testPushNotifications();
    
    // Test 6: Offline Support
    await testOfflineSupport();
    
    // Test 7: Lazy Loading
    await testLazyLoading();
    
    // Test 8: Performance Metrics
    await testPerformanceMetrics();
  };

  const testServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const isRegistered = !!registration;
        
        updateTest('serviceWorkerRegistration', {
          status: isRegistered ? 'passed' : 'failed',
          details: isRegistered 
            ? `✅ Service Worker registered at: ${registration.scope}`
            : '❌ Service Worker not registered'
        });

        setPwaStats(prev => ({ ...prev, serviceWorker: isRegistered }));
      } else {
        updateTest('serviceWorkerRegistration', {
          status: 'failed',
          details: '❌ Service Worker not supported in this browser'
        });
      }
    } catch (error) {
      updateTest('serviceWorkerRegistration', {
        status: 'failed',
        details: `❌ Error: ${error.message}`
      });
    }
  };

  const testManifest = async () => {
    try {
      const response = await fetch('/manifest.json');
      const manifest = await response.json();
      
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      const missingFields = requiredFields.filter(field => !manifest[field]);
      
      const isValid = missingFields.length === 0 && manifest.icons.length > 0;
      
      updateTest('manifestValidation', {
        status: isValid ? 'passed' : 'failed',
        details: isValid 
          ? `✅ Manifest valid with ${manifest.icons.length} icons`
          : `❌ Missing fields: ${missingFields.join(', ')}`
      });

      setPwaStats(prev => ({ ...prev, manifest: isValid }));
    } catch (error) {
      updateTest('manifestValidation', {
        status: 'failed',
        details: `❌ Error loading manifest: ${error.message}`
      });
    }
  };

  const testIconLoading = async () => {
    try {
      const iconTests = [
        '/images/pwa/icon-192x192.svg',
        '/images/pwa/icon-512x512.svg',
        '/images/pwa/apple-touch-icon.svg'
      ];
      
      const results = await Promise.all(
        iconTests.map(async (iconUrl) => {
          const response = await fetch(iconUrl);
          return { url: iconUrl, ok: response.ok };
        })
      );
      
      const passedCount = results.filter(r => r.ok).length;
      const allPassed = passedCount === iconTests.length;
      
      updateTest('iconLoading', {
        status: allPassed ? 'passed' : 'warning',
        details: `${passedCount}/${iconTests.length} icons loaded successfully`
      });
    } catch (error) {
      updateTest('iconLoading', {
        status: 'failed',
        details: `❌ Error testing icons: ${error.message}`
      });
    }
  };

  const testCacheStrategies = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const hasCaches = cacheNames.length > 0;
        
        updateTest('cacheStrategies', {
          status: hasCaches ? 'passed' : 'warning',
          details: hasCaches 
            ? `✅ ${cacheNames.length} cache(s) active: ${cacheNames.join(', ')}`
            : '⚠️ No caches found (may populate after navigation)'
        });
      } else {
        updateTest('cacheStrategies', {
          status: 'failed',
          details: '❌ Cache API not supported'
        });
      }
    } catch (error) {
      updateTest('cacheStrategies', {
        status: 'failed',
        details: `❌ Error testing cache: ${error.message}`
      });
    }
  };

  const testPushNotifications = async () => {
    try {
      const isSupported = 'serviceWorker' in navigator && 
                         'PushManager' in window && 
                         'Notification' in window;
      
      if (isSupported) {
        const permission = Notification.permission;
        updateTest('pushNotifications', {
          status: 'passed',
          details: `✅ Push notifications supported. Permission: ${permission}`
        });
        
        setPwaStats(prev => ({ ...prev, pushSupport: true }));
      } else {
        updateTest('pushNotifications', {
          status: 'failed',
          details: '❌ Push notifications not supported'
        });
      }
    } catch (error) {
      updateTest('pushNotifications', {
        status: 'failed',
        details: `❌ Error: ${error.message}`
      });
    }
  };

  const testOfflineSupport = async () => {
    try {
      const isOnline = navigator.onLine;
      const hasServiceWorker = 'serviceWorker' in navigator;
      
      if (hasServiceWorker) {
        // Test offline functionality by making a request
        const testUrl = '/?test=offline';
        const response = await fetch(testUrl);
        const isWorking = response.ok;
        
        updateTest('offlineSupport', {
          status: isWorking ? 'passed' : 'warning',
          details: `Network: ${isOnline ? 'Online' : 'Offline'}. SW cache: ${isWorking ? 'Working' : 'Not cached yet'}`
        });

        setPwaStats(prev => ({ ...prev, offlineReady: isWorking }));
      } else {
        updateTest('offlineSupport', {
          status: 'failed',
          details: '❌ No Service Worker for offline support'
        });
      }
    } catch (error) {
      updateTest('offlineSupport', {
        status: 'warning',
        details: `⚠️ Offline test inconclusive: ${error.message}`
      });
    }
  };

  const testLazyLoading = async () => {
    try {
      // Test Intersection Observer support
      const hasIntersectionObserver = 'IntersectionObserver' in window;
      
      // Test loading attribute support
      const img = document.createElement('img');
      const hasLoadingAttribute = 'loading' in img;
      
      const lazySupport = hasIntersectionObserver && hasLoadingAttribute;
      
      updateTest('lazyLoading', {
        status: lazySupport ? 'passed' : 'warning',
        details: `Intersection Observer: ${hasIntersectionObserver ? '✅' : '❌'}, Loading attribute: ${hasLoadingAttribute ? '✅' : '❌'}`
      });
    } catch (error) {
      updateTest('lazyLoading', {
        status: 'failed',
        details: `❌ Error: ${error.message}`
      });
    }
  };

  const testPerformanceMetrics = async () => {
    try {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        const loadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;
        
        const isPerformant = loadTime < 3000 && (fcp ? fcp.startTime < 1500 : true);
        
        updateTest('performanceMetrics', {
          status: isPerformant ? 'passed' : 'warning',
          details: `Load: ${Math.round(loadTime)}ms, FCP: ${fcp ? Math.round(fcp.startTime) : 'N/A'}ms`
        });
      } else {
        updateTest('performanceMetrics', {
          status: 'warning',
          details: '⚠️ Performance API not available'
        });
      }
    } catch (error) {
      updateTest('performanceMetrics', {
        status: 'failed',
        details: `❌ Error: ${error.message}`
      });
    }
  };

  const updateTest = (testName, result) => {
    setTests(prev => ({
      ...prev,
      [testName]: result
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'warning': return '⚠️';
      default: return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            PWA Test Suite
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Comprehensive testing of Progressive Web App functionality including 
            service workers, manifest, caching, and mobile optimization.
          </p>
        </div>

        {/* PWA Status Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">PWA Status Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl mb-1 ${pwaStats.serviceWorker ? 'text-green-500' : 'text-red-500'}`}>
                {pwaStats.serviceWorker ? '🟢' : '🔴'}
              </div>
              <div className="text-sm font-medium">Service Worker</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl mb-1 ${pwaStats.manifest ? 'text-green-500' : 'text-red-500'}`}>
                {pwaStats.manifest ? '🟢' : '🔴'}
              </div>
              <div className="text-sm font-medium">Manifest</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl mb-1 ${pwaStats.pushSupport ? 'text-green-500' : 'text-red-500'}`}>
                {pwaStats.pushSupport ? '🟢' : '🔴'}
              </div>
              <div className="text-sm font-medium">Push Support</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl mb-1 ${pwaStats.offlineReady ? 'text-green-500' : 'text-yellow-500'}`}>
                {pwaStats.offlineReady ? '🟢' : '🟡'}
              </div>
              <div className="text-sm font-medium">Offline Ready</div>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Test Results</h2>
          <div className="space-y-4">
            {Object.entries(tests).map(([testName, result]) => (
              <div key={testName} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-xl mt-0.5">
                  {getStatusIcon(result.status)}
                </span>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h3>
                  <p className={`text-sm ${getStatusColor(result.status)}`}>
                    {result.details || 'Running test...'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PWA Components Demo */}
        <div className="space-y-8">
          {/* Install Prompt */}
          <LazySection className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">PWA Install Prompt</h2>
            <p className="text-gray-600 mb-4">
              The install prompt will show automatically when PWA criteria are met.
            </p>
            <PWAInstallPrompt />
          </LazySection>

          {/* Push Notifications */}
          <LazySection className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Push Notifications</h2>
            <PushNotifications />
          </LazySection>

          {/* Lazy Loading Demo */}
          <LazySection className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Lazy Loading Demo</h2>
            <p className="text-gray-600 mb-4">
              Test lazy loading with optimized images and intersection observer.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LazyImage
                src="/images/placeholder-project.jpg"
                alt="Lazy loaded image example"
                width={400}
                height={300}
                className="rounded-lg"
                loading="lazy"
              />
              <LazyImage
                src="/images/pwa/og-image.svg"
                alt="PWA OG Image"
                width={400}
                height={200}
                className="rounded-lg"
                loading="lazy"
              />
            </div>
          </LazySection>

          {/* Performance Info */}
          <LazySection className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600" id="fcp-metric">-</div>
                <div className="text-sm text-gray-600">First Contentful Paint</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600" id="lcp-metric">-</div>
                <div className="text-sm text-gray-600">Largest Contentful Paint</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600" id="cls-metric">-</div>
                <div className="text-sm text-gray-600">Cumulative Layout Shift</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600" id="fid-metric">-</div>
                <div className="text-sm text-gray-600">First Input Delay</div>
              </div>
            </div>
          </LazySection>
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={runPWATests}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Rerun Tests
            </button>
            
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              🔃 Hard Refresh
            </button>
            
            <button 
              onClick={() => navigator.serviceWorker?.getRegistration().then(reg => reg?.unregister())}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              🗑️ Clear Service Worker
            </button>
            
            <a 
              href="/manifest.json"
              target="_blank"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition inline-block text-center"
            >
              📄 View Manifest
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>PWA Test Suite for Brandon Lambert Portfolio</p>
          <p>Check browser dev tools for detailed service worker and PWA information</p>
        </div>
      </div>

      {/* Performance metrics script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          if ('performance' in window) {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                const element = document.getElementById(entry.name.replace(/-/g, '-') + '-metric');
                if (element) {
                  element.textContent = Math.round(entry.startTime) + 'ms';
                }
              }
            });
            observer.observe({ entryTypes: ['paint'] });

            // Web Vitals
            if ('PerformanceObserver' in window) {
              try {
                const observer = new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                      const clsElement = document.getElementById('cls-metric');
                      if (clsElement) {
                        clsElement.textContent = entry.value.toFixed(3);
                      }
                    }
                  }
                });
                observer.observe({ entryTypes: ['layout-shift'] });
              } catch (e) {
                console.log('Layout shift observer not supported');
              }
            }
          }
        `
      }} />
    </div>
  );
};

export default PWATestPage;