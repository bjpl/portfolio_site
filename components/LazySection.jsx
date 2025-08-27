'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { lazy } from 'react';

const LazySection = ({ 
  children, 
  fallback = null, 
  rootMargin = '100px', 
  threshold = 0.1,
  className = '',
  as: Component = 'div',
  loading = false,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasIntersected) {
            setIsVisible(true);
            setHasIntersected(true);
            // Continue observing for animations or other effects
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [rootMargin, threshold, hasIntersected]);

  // Loading fallback component
  const LoadingFallback = fallback || (() => (
    <div className={`lazy-section-loading ${className}`} style={{ minHeight: '200px' }}>
      <div className="loading-content">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
        ) : (
          <div className="loading-skeleton">
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
            <div className="skeleton-line medium"></div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .lazy-section-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner-ring {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #4A90E2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-skeleton {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 300px;
        }

        .skeleton-line {
          height: 16px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          border-radius: 4px;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .skeleton-line.short {
          width: 60%;
        }

        .skeleton-line.medium {
          width: 80%;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .spinner-ring {
            border-color: #333;
            border-top-color: #5BA3F5;
          }

          .skeleton-line {
            background: linear-gradient(90deg, #2a2a2a 25%, #404040 50%, #2a2a2a 75%);
            background-size: 200% 100%;
          }
        }
      `}</style>
    </div>
  ));

  return (
    <Component 
      ref={elementRef} 
      className={`lazy-section ${isVisible ? 'visible' : 'pending'} ${className}`}
      {...props}
    >
      {isVisible ? (
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      ) : (
        <LoadingFallback />
      )}
      
      <style jsx>{`
        .lazy-section {
          transition: opacity 0.6s ease-in-out, transform 0.6s ease-in-out;
        }

        .lazy-section.pending {
          opacity: 0.7;
          transform: translateY(20px);
        }

        .lazy-section.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </Component>
  );
};

// Higher-order component for creating lazy-loaded components
export const withLazyLoading = (WrappedComponent, options = {}) => {
  const LazyWrapper = (props) => {
    const [shouldRender, setShouldRender] = useState(false);
    const elementRef = useRef(null);

    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setShouldRender(true);
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: options.rootMargin || '50px',
          threshold: options.threshold || 0.1,
        }
      );

      observer.observe(element);

      return () => {
        observer.unobserve(element);
      };
    }, []);

    return (
      <div ref={elementRef}>
        {shouldRender ? (
          <WrappedComponent {...props} />
        ) : (
          <div style={{ minHeight: options.minHeight || '200px' }}>
            {options.fallback || <div>Loading...</div>}
          </div>
        )}
      </div>
    );
  };

  LazyWrapper.displayName = `LazyLoaded(${WrappedComponent.displayName || WrappedComponent.name})`;
  return LazyWrapper;
};

// Utility hook for intersection observer
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsIntersecting(entry.isIntersecting);
          if (entry.isIntersecting && !hasIntersected) {
            setHasIntersected(true);
          }
        });
      },
      {
        rootMargin: options.rootMargin || '0px',
        threshold: options.threshold || 0.1,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options.rootMargin, options.threshold]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Lazy loading for dynamic imports
export const createLazyComponent = (importFn, fallback = null) => {
  const LazyComponent = lazy(importFn);
  
  return (props) => (
    <Suspense fallback={fallback || <div>Loading component...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

export default LazySection;