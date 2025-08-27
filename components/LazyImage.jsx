'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const LazyImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'blur',
  blurDataURL,
  priority = false,
  loading = 'lazy',
  quality = 85,
  sizes,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  fallbackSrc,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Generate a blur placeholder if not provided
  const generateBlurDataURL = (w = 10, h = 10) => {
    const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;
    if (!canvas) return '';
    
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    // Create a simple gradient blur effect
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#f0f0f0');
    gradient.addColorStop(1, '#e0e0e0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  };

  const defaultBlurDataURL = blurDataURL || generateBlurDataURL(width || 400, height || 300);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || typeof window === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Load image 50px before it comes into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority]);

  const handleLoad = (event) => {
    setIsLoaded(true);
    onLoad?.(event);
  };

  const handleError = (event) => {
    setHasError(true);
    
    // Try fallback image if provided
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      return;
    }
    
    onError?.(event);
  };

  // Preload critical images
  useEffect(() => {
    if (priority && src && typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, src]);

  // Progressive enhancement - WebP support
  const [supportsWebP, setSupportsWebP] = useState(null);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob && blob.type === 'image/webp');
        }, 'image/webp');
      });
    };
    
    checkWebPSupport().then(setSupportsWebP);
  }, []);

  // Get optimized image source based on format support
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc || typeof originalSrc !== 'string') return originalSrc;
    
    // If WebP is supported and source is not already WebP
    if (supportsWebP && !originalSrc.includes('.webp')) {
      // For Next.js image optimization, add format parameter
      if (originalSrc.startsWith('/') || originalSrc.includes(process.env.NEXT_PUBLIC_DOMAIN || '')) {
        return originalSrc;
      }
    }
    
    return originalSrc;
  };

  const optimizedSrc = getOptimizedSrc(currentSrc);

  // Error fallback component
  if (hasError && !fallbackSrc) {
    return (
      <div 
        ref={imgRef}
        className={`lazy-image-error ${className}`}
        style={{ 
          width: fill ? '100%' : width, 
          height: fill ? '100%' : height,
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '14px',
          border: '1px solid #e0e0e0'
        }}
        {...props}
      >
        <div className="error-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          <span>Image unavailable</span>
        </div>
      </div>
    );
  }

  // Placeholder component while loading
  const PlaceholderComponent = () => (
    <div 
      className={`lazy-image-placeholder ${className}`}
      style={{ 
        width: fill ? '100%' : width, 
        height: fill ? '100%' : height,
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'pulse 2s ease-in-out infinite'
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21,15 16,10 5,21"/>
      </svg>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );

  // Don't load image until it's in view (unless priority)
  if (!isInView) {
    return <div ref={imgRef}><PlaceholderComponent /></div>;
  }

  return (
    <div 
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={{ position: fill ? 'relative' : undefined }}
    >
      <Image
        src={optimizedSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={loading}
        placeholder={placeholder}
        blurDataURL={defaultBlurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          objectFit: fill ? objectFit : undefined,
          objectPosition: fill ? objectPosition : undefined,
          transition: 'opacity 0.3s ease-in-out',
          opacity: isLoaded ? 1 : 0.8,
        }}
        {...props}
      />
      
      {/* Loading overlay */}
      {!isLoaded && !hasError && (
        <div 
          className="loading-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div 
            className="loading-spinner"
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #4A90E2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}

      <style jsx>{`
        .lazy-image-container {
          position: relative;
          overflow: hidden;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .lazy-image-error .error-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }

        .lazy-image-error .error-content span {
          font-size: 12px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .loading-spinner {
            width: 16px !important;
            height: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LazyImage;