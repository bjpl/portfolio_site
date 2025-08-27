'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useIntersectionObserver } from './LazySection';

// Enhanced image optimization with multiple formats and responsive loading
export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 85,
  placeholder = 'blur',
  sizes,
  fill = false,
  loading = 'lazy',
  onLoad,
  onError,
  fallbackSrc,
  formats = ['webp', 'avif'],
  responsive = true,
  blurDataURL,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imageRef = useRef(null);

  // Generate blur placeholder for better UX
  const generateBlurDataURL = useCallback((w = 8, h = 8) => {
    if (typeof window === 'undefined') return '';
    
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    // Create a subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    return canvas.toDataURL('image/jpeg', 0.1);
  }, []);

  const defaultBlurDataURL = blurDataURL || generateBlurDataURL();

  // Responsive sizes for different breakpoints
  const responsiveSizes = sizes || (responsive ? 
    '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' : 
    undefined
  );

  // Handle image load success
  const handleLoad = useCallback((event) => {
    setImageLoaded(true);
    onLoad?.(event);
    
    // Report image performance metrics
    if (process.env.NODE_ENV === 'development') {
      const img = event.target;
      console.log('Image loaded:', {
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        loadTime: performance.now()
      });
    }
  }, [onLoad]);

  // Handle image load error with fallback
  const handleError = useCallback((event) => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    
    setImageError(true);
    onError?.(event);
  }, [fallbackSrc, currentSrc, onError]);

  // Preload critical images
  useEffect(() => {
    if (priority && src && typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      
      // Add responsive image hints
      if (responsiveSizes) {
        link.imageSizes = responsiveSizes;
      }
      
      document.head.appendChild(link);
      
      return () => {
        try {
          document.head.removeChild(link);
        } catch (e) {
          // Element may have been removed already
        }
      };
    }
  }, [priority, src, responsiveSizes]);

  // Error fallback component
  if (imageError) {
    return (
      <div 
        className={`image-error-fallback ${className}`}
        style={{ 
          width: fill ? '100%' : width, 
          height: fill ? '100%' : height,
          minHeight: '200px',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #dee2e6',
          borderRadius: '8px'
        }}
        {...props}
      >
        <div className="error-content text-center text-gray-500">
          <svg 
            className="mx-auto mb-2" 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="1"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
          <div className="text-sm">Image unavailable</div>
          <div className="text-xs mt-1 opacity-75">
            {alt || 'Failed to load image'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={imageRef}
      className={`optimized-image-container ${className}`}
      style={{ 
        position: fill ? 'relative' : 'static',
        overflow: 'hidden'
      }}
    >
      <Image
        src={currentSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={responsiveSizes}
        quality={quality}
        priority={priority}
        loading={loading}
        placeholder={placeholder}
        blurDataURL={defaultBlurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
          opacity: imageLoaded ? 1 : 0.8,
          transform: imageLoaded ? 'scale(1)' : 'scale(1.05)',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
        {...props}
      />
      
      {/* Loading indicator */}
      {!imageLoaded && !imageError && (
        <div 
          className="loading-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(248, 249, 250, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div 
            className="loading-spinner"
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid #e9ecef',
              borderTop: '2px solid #6c757d',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .optimized-image-container img {
          will-change: transform, opacity;
        }
        
        /* Improve image rendering */
        .optimized-image-container img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .optimized-image-container img {
            transition: none !important;
          }
          
          .loading-spinner {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

// Progressive image loading with multiple formats
export const ProgressiveImage = ({ src, srcSet, fallback, ...props }) => {
  const [currentSrc, setCurrentSrc] = useState(fallback || src);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
    
    img.onerror = () => {
      if (fallback) {
        setCurrentSrc(fallback);
      }
      setIsLoaded(true);
    };

    // Load high-quality version
    img.src = src;
    if (srcSet) {
      img.srcset = srcSet;
    }
  }, [src, srcSet, fallback]);

  return (
    <OptimizedImage
      src={currentSrc}
      className={`progressive-image ${isLoaded ? 'loaded' : 'loading'}`}
      {...props}
    />
  );
};

// Image gallery optimization
export const OptimizedImageGallery = ({ images, className = '', ...props }) => {
  const [visibleImages, setVisibleImages] = useState(new Set());
  const { elementRef, isIntersecting } = useIntersectionObserver({
    rootMargin: '100px',
  });

  // Preload images that are about to be visible
  useEffect(() => {
    if (isIntersecting) {
      images.slice(0, 6).forEach((image, index) => {
        setTimeout(() => {
          const img = new window.Image();
          img.src = image.src;
          setVisibleImages(prev => new Set([...prev, index]));
        }, index * 100);
      });
    }
  }, [isIntersecting, images]);

  return (
    <div ref={elementRef} className={`optimized-gallery ${className}`} {...props}>
      {images.map((image, index) => (
        <OptimizedImage
          key={image.id || index}
          {...image}
          priority={index < 3} // Prioritize first 3 images
          loading={index < 6 ? 'eager' : 'lazy'}
          quality={index < 3 ? 90 : 75} // Higher quality for above-fold images
          className={`gallery-image ${visibleImages.has(index) ? 'preloaded' : ''}`}
        />
      ))}
    </div>
  );
};

// Image performance metrics
export const ImageMetrics = () => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const measureImagePerformance = () => {
        const imageEntries = performance.getEntriesByType('resource')
          .filter(entry => /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(entry.name));

        const totalImageSize = imageEntries.reduce((acc, entry) => acc + (entry.transferSize || 0), 0);
        const averageLoadTime = imageEntries.length > 0 ? 
          imageEntries.reduce((acc, entry) => acc + (entry.responseEnd - entry.requestStart), 0) / imageEntries.length : 0;

        setMetrics({
          totalImages: imageEntries.length,
          totalSize: totalImageSize,
          averageLoadTime,
          images: imageEntries.map(entry => ({
            name: entry.name.split('/').pop(),
            size: entry.transferSize || 0,
            loadTime: entry.responseEnd - entry.requestStart,
          })).sort((a, b) => b.size - a.size),
        });
      };

      // Measure after initial load
      setTimeout(measureImagePerformance, 3000);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-80 text-white p-3 rounded text-xs font-mono z-50">
      <div className="mb-1">Image Metrics:</div>
      <div>Images: {metrics.totalImages}</div>
      <div>Size: {(metrics.totalSize / 1024).toFixed(1)}KB</div>
      <div>Avg Load: {metrics.averageLoadTime.toFixed(0)}ms</div>
      {metrics.images.length > 0 && (
        <div className="mt-2 max-h-32 overflow-y-auto">
          <div className="text-xs opacity-75">Largest:</div>
          {metrics.images.slice(0, 3).map((img, i) => (
            <div key={i} className="text-xs">
              {img.name}: {(img.size / 1024).toFixed(1)}KB
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;