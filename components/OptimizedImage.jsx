'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading with intersection observer
 * - Modern format support (WebP, AVIF)
 * - Responsive image sets
 * - Progressive loading with blur placeholder
 * - Performance monitoring
 */

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 80,
  placeholder = 'blur',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  lazy = true,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy || priority);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Generate responsive image URLs
  const generateResponsiveUrls = (baseSrc) => {
    if (!baseSrc) return baseSrc;
    
    const isExternal = baseSrc.startsWith('http');
    if (isExternal) return baseSrc;

    const extension = baseSrc.split('.').pop().toLowerCase();
    const basePath = baseSrc.replace(`.${extension}`, '');
    
    return {
      webp: `${basePath}.webp`,
      avif: `${basePath}.avif`,
      original: baseSrc
    };
  };

  // Create blur placeholder data URL
  const createBlurDataURL = (w = width || 10, h = height || 10) => {
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple gradient blur placeholder
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    // Create a subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#f1f5f9');
    gradient.addColorStop(1, '#e2e8f0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    return canvas.toDataURL();
  };

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) return;

    const currentImgRef = imgRef.current;
    if (!currentImgRef || isVisible) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1,
      }
    );

    observerRef.current.observe(currentImgRef);

    return () => {
      if (observerRef.current && currentImgRef) {
        observerRef.current.unobserve(currentImgRef);
      }
    };
  }, [lazy, priority, isVisible]);

  // Handle image load
  const handleLoad = (event) => {
    setIsLoaded(true);
    
    // Performance tracking
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime = performance.now();
      console.debug(`Image loaded: ${src}`, { loadTime });
    }
    
    onLoad?.(event);
  };

  // Handle image error
  const handleError = (event) => {
    setError(true);
    console.error(`Failed to load image: ${src}`);
    onError?.(event);
  };

  // Don't render if not visible (lazy loading)
  if (!isVisible && lazy && !priority) {
    return (
      <div
        ref={imgRef}
        className={`${className} bg-gray-100 animate-pulse`}
        style={{ width, height }}
        role="img"
        aria-label={`Loading ${alt}`}
      />
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`${className} bg-gray-100 flex items-center justify-center text-gray-400`}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load ${alt}`}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const responsiveUrls = generateResponsiveUrls(src);
  
  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      {/* Next.js Image with optimizations */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? createBlurDataURL() : undefined}
        className={`
          transition-opacity duration-300 ease-in-out
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          ${!isLoaded ? 'scale-110' : 'scale-100'}
        `}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Loading overlay */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
      
      {/* Modern format picture element for progressive enhancement */}
      {typeof responsiveUrls === 'object' && (
        <picture className="hidden">
          <source srcSet={responsiveUrls.avif} type="image/avif" />
          <source srcSet={responsiveUrls.webp} type="image/webp" />
          <img src={responsiveUrls.original} alt={alt} style={{ display: 'none' }} />
        </picture>
      )}
    </div>
  );
};

/**
 * Optimized Background Image Component
 * For hero sections and background images with better performance
 */
export const OptimizedBackgroundImage = ({
  src,
  alt = '',
  className = '',
  children,
  overlay = false,
  overlayOpacity = 0.4,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`} {...props}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
        priority
        onLoad={() => setIsLoaded(true)}
      />
      
      {/* Overlay */}
      {overlay && (
        <div 
          className="absolute inset-0 bg-black transition-opacity duration-300"
          style={{ 
            opacity: isLoaded ? overlayOpacity : 0 
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

/**
 * Image Gallery Component with Optimized Loading
 */
export const OptimizedImageGallery = ({
  images = [],
  className = '',
  itemClassName = '',
  maxVisible = 6,
  onImageClick,
}) => {
  const [visibleCount, setVisibleCount] = useState(maxVisible);
  
  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + maxVisible, images.length));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.slice(0, visibleCount).map((image, index) => (
          <div
            key={image.id || index}
            className={`relative group cursor-pointer ${itemClassName}`}
            onClick={() => onImageClick?.(image, index)}
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt || `Gallery image ${index + 1}`}
              width={image.width || 400}
              height={image.height || 300}
              className="rounded-lg transition-transform duration-300 group-hover:scale-105"
              lazy={index >= 3} // Load first 3 immediately
              quality={index < 3 ? 90 : 75} // Higher quality for first images
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 rounded-lg" />
          </div>
        ))}
      </div>
      
      {/* Load more button */}
      {visibleCount < images.length && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More ({images.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;