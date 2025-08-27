'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
import { useIntersectionObserver } from './LazySection';

// Performance monitoring
const performanceMetrics = {
  componentLoadTimes: new Map(),
  startTimer: (name) => performance.mark(`${name}-start`),
  endTimer: (name) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    const measure = performance.getEntriesByName(name)[0];
    performanceMetrics.componentLoadTimes.set(name, measure.duration);
  },
  getMetrics: () => Object.fromEntries(performanceMetrics.componentLoadTimes),
};

// Dynamic import with loading state and error boundary
const createOptimizedComponent = (importFn, componentName, fallback = null) => {
  const LazyComponent = lazy(async () => {
    performanceMetrics.startTimer(componentName);
    try {
      const module = await importFn();
      performanceMetrics.endTimer(componentName);
      return module;
    } catch (error) {
      console.error(`Failed to load ${componentName}:`, error);
      // Return a fallback component
      return { 
        default: () => (
          <div className="error-boundary p-4 border border-red-200 bg-red-50 rounded-lg">
            <h3 className="text-red-800 font-medium">Component Loading Error</h3>
            <p className="text-red-600 text-sm mt-1">
              Failed to load {componentName}. Please try refreshing the page.
            </p>
          </div>
        )
      };
    }
  });

  const OptimizedWrapper = (props) => {
    const { elementRef, isIntersecting } = useIntersectionObserver({
      rootMargin: '50px',
      threshold: 0.1,
    });

    const defaultFallback = (
      <div 
        className="animate-pulse bg-gray-200 rounded-lg"
        style={{ minHeight: '200px' }}
        aria-label={`Loading ${componentName}`}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading {componentName}...</div>
        </div>
      </div>
    );

    return (
      <div ref={elementRef}>
        {isIntersecting && (
          <Suspense fallback={fallback || defaultFallback}>
            <LazyComponent {...props} />
          </Suspense>
        )}
      </div>
    );
  };

  OptimizedWrapper.displayName = `Optimized(${componentName})`;
  return OptimizedWrapper;
};

// Optimized component exports with lazy loading
export const LazyAdminDashboard = createOptimizedComponent(
  () => import('./admin/Dashboard'),
  'AdminDashboard'
);

export const LazyAdminContentEditor = createOptimizedComponent(
  () => import('./admin/ContentEditor'),
  'AdminContentEditor'
);

export const LazyAdminMediaLibrary = createOptimizedComponent(
  () => import('./admin/MediaLibrary'),
  'AdminMediaLibrary'
);

export const LazyWYSIWYGEditor = createOptimizedComponent(
  () => import('./admin/WYSIWYGEditor'),
  'WYSIWYGEditor'
);

export const LazyAnalyticsDashboard = createOptimizedComponent(
  () => import('./admin/AnalyticsDashboard'),
  'AnalyticsDashboard'
);

export const LazyProjectGallery = createOptimizedComponent(
  () => import('./ProjectGallery'),
  'ProjectGallery'
);

export const LazyEnhancedProjectCard = createOptimizedComponent(
  () => import('./EnhancedProjectCard'),
  'EnhancedProjectCard'
);

// Code splitting for heavy dependencies
export const LazyFramerMotionComponents = createOptimizedComponent(
  () => import('./animations/FramerMotionComponents'),
  'FramerMotionComponents'
);

// Preload critical components
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // Preload components likely to be needed soon
    const criticalImports = [
      () => import('./admin/Dashboard'),
      () => import('./ProjectGallery'),
      () => import('./LazyImage'),
    ];

    criticalImports.forEach((importFn, index) => {
      // Stagger preloading to avoid overwhelming the main thread
      setTimeout(() => {
        importFn().catch(err => console.warn('Preload failed:', err));
      }, index * 100);
    });
  }
};

// Bundle size analyzer hook
export const useBundleMetrics = () => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Development-only bundle analysis
      const analyzeBundle = async () => {
        try {
          const navigationEntries = performance.getEntriesByType('navigation');
          const resourceEntries = performance.getEntriesByType('resource');
          
          const jsResources = resourceEntries.filter(entry => 
            entry.name.includes('.js') || entry.name.includes('/_next/static/')
          );

          const totalJSSize = jsResources.reduce((acc, entry) => 
            acc + (entry.transferSize || 0), 0
          );

          const componentMetrics = performanceMetrics.getMetrics();

          setMetrics({
            totalJSSize,
            jsResourceCount: jsResources.length,
            componentLoadTimes: componentMetrics,
            largestContentfulPaint: navigationEntries[0]?.loadEventEnd || 0,
          });
        } catch (error) {
          console.warn('Bundle metrics analysis failed:', error);
        }
      };

      // Analyze after page load
      if (document.readyState === 'complete') {
        analyzeBundle();
      } else {
        window.addEventListener('load', analyzeBundle);
        return () => window.removeEventListener('load', analyzeBundle);
      }
    }
  }, []);

  return metrics;
};

// Performance monitoring component
export const PerformanceMonitor = ({ children }) => {
  const metrics = useBundleMetrics();

  useEffect(() => {
    if (metrics && process.env.NODE_ENV === 'development') {
      console.group('Performance Metrics');
      console.log('Total JS Size:', `${(metrics.totalJSSize / 1024).toFixed(2)} KB`);
      console.log('JS Resources:', metrics.jsResourceCount);
      console.log('Component Load Times:', metrics.componentLoadTimes);
      console.log('LCP:', `${metrics.largestContentfulPaint.toFixed(2)}ms`);
      console.groupEnd();
    }
  }, [metrics]);

  return <>{children}</>;
};

export { performanceMetrics };