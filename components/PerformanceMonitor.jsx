'use client';

import { useState, useEffect, useRef } from 'react';

// Core Web Vitals monitoring
export const WebVitalsMonitor = ({ onMetric, enabled = true }) => {
  const [vitals, setVitals] = useState({});
  const observersRef = useRef([]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let mounted = true;

    const measureWebVitals = async () => {
      try {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

        const handleMetric = (metric) => {
          if (mounted) {
            setVitals(prev => ({
              ...prev,
              [metric.name]: {
                value: metric.value,
                rating: metric.rating,
                delta: metric.delta,
              }
            }));
            onMetric?.(metric);
          }
        };

        // Measure all Core Web Vitals
        getCLS(handleMetric);
        getFID(handleMetric);
        getFCP(handleMetric);
        getLCP(handleMetric);
        getTTFB(handleMetric);

      } catch (error) {
        console.warn('Web Vitals measurement failed:', error);
        
        // Fallback to Performance API
        measureBasicMetrics();
      }
    };

    const measureBasicMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation && mounted) {
        setVitals({
          'load-time': {
            value: navigation.loadEventEnd - navigation.navigationStart,
            rating: navigation.loadEventEnd - navigation.navigationStart < 3000 ? 'good' : 'needs-improvement'
          },
          'dom-content-loaded': {
            value: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            rating: navigation.domContentLoadedEventEnd - navigation.navigationStart < 1500 ? 'good' : 'needs-improvement'
          }
        });
      }
    };

    measureWebVitals();

    return () => {
      mounted = false;
      observersRef.current.forEach(observer => {
        if (observer && observer.disconnect) observer.disconnect();
      });
    };
  }, [enabled, onMetric]);

  return vitals;
};

// Bundle size analyzer
export const BundleAnalyzer = () => {
  const [bundleStats, setBundleStats] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const analyzeBundles = () => {
      const resourceEntries = performance.getEntriesByType('resource');
      
      const jsResources = resourceEntries.filter(entry => 
        entry.name.includes('.js') && entry.name.includes('/_next/static/')
      );
      
      const cssResources = resourceEntries.filter(entry => 
        entry.name.includes('.css')
      );

      const totalJSSize = jsResources.reduce((acc, entry) => acc + (entry.transferSize || 0), 0);
      const totalCSSSize = cssResources.reduce((acc, entry) => acc + (entry.transferSize || 0), 0);

      const chunks = jsResources.map(entry => ({
        name: entry.name.split('/').pop(),
        size: entry.transferSize || 0,
        loadTime: entry.responseEnd - entry.requestStart,
        cached: entry.transferSize === 0,
      }));

      setBundleStats({
        totalJSSize,
        totalCSSSize,
        totalSize: totalJSSize + totalCSSSize,
        jsChunks: chunks.length,
        cssFiles: cssResources.length,
        chunks: chunks.sort((a, b) => b.size - a.size),
        largestChunk: chunks.reduce((largest, chunk) => 
          chunk.size > (largest?.size || 0) ? chunk : largest, null
        )
      });
    };

    // Analyze after initial load
    setTimeout(analyzeBundles, 2000);
  }, []);

  return bundleStats;
};

// Performance metrics dashboard
export const PerformanceDashboard = ({ show = false }) => {
  const vitals = WebVitalsMonitor({ enabled: show });
  const bundleStats = BundleAnalyzer();
  const [resourceStats, setResourceStats] = useState(null);

  useEffect(() => {
    if (!show || typeof window === 'undefined') return;

    const analyzeResources = () => {
      const entries = performance.getEntriesByType('resource');
      
      const byType = entries.reduce((acc, entry) => {
        const extension = entry.name.split('.').pop()?.toLowerCase();
        const type = getResourceType(extension);
        
        if (!acc[type]) acc[type] = { count: 0, size: 0 };
        acc[type].count++;
        acc[type].size += entry.transferSize || 0;
        
        return acc;
      }, {});

      const totalSize = Object.values(byType).reduce((acc, { size }) => acc + size, 0);
      const totalCount = entries.length;

      setResourceStats({
        byType,
        totalSize,
        totalCount,
        cacheHitRate: entries.filter(e => e.transferSize === 0).length / totalCount * 100,
      });
    };

    analyzeResources();
  }, [show]);

  const getResourceType = (extension) => {
    const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg'];
    const fontExts = ['woff', 'woff2', 'ttf', 'otf', 'eot'];
    
    if (extension === 'js') return 'JavaScript';
    if (extension === 'css') return 'CSS';
    if (imageExts.includes(extension)) return 'Images';
    if (fontExts.includes(extension)) return 'Fonts';
    return 'Other';
  };

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm text-xs font-mono z-50 max-h-96 overflow-y-auto">
      <h3 className="font-bold mb-3 text-sm">Performance Dashboard</h3>
      
      {/* Core Web Vitals */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Core Web Vitals</h4>
        {Object.entries(vitals).map(([name, metric]) => (
          <div key={name} className="flex justify-between mb-1">
            <span className="capitalize">{name}:</span>
            <span className={`
              ${metric.rating === 'good' ? 'text-green-600' : ''}
              ${metric.rating === 'needs-improvement' ? 'text-yellow-600' : ''}
              ${metric.rating === 'poor' ? 'text-red-600' : ''}
            `}>
              {formatMetricValue(name, metric.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Bundle Stats */}
      {bundleStats && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Bundle Analysis</h4>
          <div className="flex justify-between mb-1">
            <span>Total JS:</span>
            <span>{(bundleStats.totalJSSize / 1024).toFixed(1)}KB</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Total CSS:</span>
            <span>{(bundleStats.totalCSSSize / 1024).toFixed(1)}KB</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>JS Chunks:</span>
            <span>{bundleStats.jsChunks}</span>
          </div>
          {bundleStats.largestChunk && (
            <div className="flex justify-between mb-1">
              <span>Largest:</span>
              <span>{(bundleStats.largestChunk.size / 1024).toFixed(1)}KB</span>
            </div>
          )}
        </div>
      )}

      {/* Resource Stats */}
      {resourceStats && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Resources</h4>
          <div className="flex justify-between mb-1">
            <span>Total:</span>
            <span>{resourceStats.totalCount} ({(resourceStats.totalSize / 1024).toFixed(1)}KB)</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Cache Hit:</span>
            <span>{resourceStats.cacheHitRate.toFixed(1)}%</span>
          </div>
          {Object.entries(resourceStats.byType).map(([type, stats]) => (
            <div key={type} className="flex justify-between mb-1">
              <span>{type}:</span>
              <span>{stats.count} ({(stats.size / 1024).toFixed(1)}KB)</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
        Updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

// Performance optimization recommendations
export const PerformanceRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const vitals = WebVitalsMonitor({ enabled: true });
  const bundleStats = BundleAnalyzer();

  useEffect(() => {
    const generateRecommendations = () => {
      const recs = [];

      // Bundle size recommendations
      if (bundleStats?.totalJSSize > 500 * 1024) { // > 500KB
        recs.push({
          type: 'bundle',
          priority: 'high',
          message: `JavaScript bundle is ${(bundleStats.totalJSSize / 1024).toFixed(0)}KB. Consider code splitting.`,
          solution: 'Implement dynamic imports for large components'
        });
      }

      if (bundleStats?.largestChunk?.size > 200 * 1024) { // > 200KB
        recs.push({
          type: 'bundle',
          priority: 'medium',
          message: `Largest chunk is ${(bundleStats.largestChunk.size / 1024).toFixed(0)}KB.`,
          solution: 'Split large chunks into smaller ones'
        });
      }

      // Web Vitals recommendations
      if (vitals.LCP?.rating === 'poor') {
        recs.push({
          type: 'lcp',
          priority: 'high',
          message: `LCP is ${vitals.LCP.value.toFixed(0)}ms (should be < 2.5s)`,
          solution: 'Optimize images and critical resources'
        });
      }

      if (vitals.CLS?.rating === 'poor') {
        recs.push({
          type: 'cls',
          priority: 'high',
          message: `CLS is ${vitals.CLS.value.toFixed(3)} (should be < 0.1)`,
          solution: 'Reserve space for dynamic content'
        });
      }

      if (vitals.FID?.rating === 'poor') {
        recs.push({
          type: 'fid',
          priority: 'medium',
          message: `FID is ${vitals.FID.value.toFixed(0)}ms (should be < 100ms)`,
          solution: 'Reduce JavaScript execution time'
        });
      }

      setRecommendations(recs);
    };

    generateRecommendations();
  }, [vitals, bundleStats]);

  return recommendations;
};

// Performance report generator
export const generatePerformanceReport = () => {
  const vitals = WebVitalsMonitor({ enabled: true });
  const bundleStats = BundleAnalyzer();
  const recommendations = PerformanceRecommendations();

  return {
    timestamp: new Date().toISOString(),
    webVitals: vitals,
    bundleStats,
    recommendations,
    score: calculatePerformanceScore(vitals, bundleStats),
  };
};

// Helper functions
const formatMetricValue = (name, value) => {
  if (name.includes('CLS')) return value.toFixed(3);
  if (name.includes('FID') || name.includes('LCP') || name.includes('FCP')) return `${value.toFixed(0)}ms`;
  if (name.includes('TTFB')) return `${value.toFixed(0)}ms`;
  return `${value.toFixed(0)}ms`;
};

const calculatePerformanceScore = (vitals, bundleStats) => {
  let score = 100;
  
  // Deduct based on Web Vitals
  Object.values(vitals).forEach(metric => {
    if (metric.rating === 'poor') score -= 20;
    else if (metric.rating === 'needs-improvement') score -= 10;
  });
  
  // Deduct based on bundle size
  if (bundleStats?.totalJSSize > 1000 * 1024) score -= 15; // > 1MB
  else if (bundleStats?.totalJSSize > 500 * 1024) score -= 10; // > 500KB
  
  return Math.max(0, score);
};

export default PerformanceDashboard;