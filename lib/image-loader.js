/**
 * Custom Image Loader for Static Export
 * Optimizes images for static generation with responsive sizes and formats
 */

export default function imageLoader({ src, width, quality }) {
  // For static export, we need to handle images without server-side optimization
  
  // If it's already an absolute URL, return as-is
  if (src.startsWith('http')) {
    return src;
  }
  
  // Remove leading slash for static export
  const cleanSrc = src.startsWith('/') ? src.slice(1) : src;
  
  // For static export, we'll use the original image
  // In a real deployment, you'd want to pre-optimize images or use a CDN
  return `/${cleanSrc}`;
}

/**
 * Utility function to generate responsive image srcset for static sites
 * @param {string} src - Image source path
 * @param {number[]} sizes - Array of widths to generate
 * @returns {string} - Formatted srcset string
 */
export function generateStaticSrcSet(src, sizes = [640, 750, 828, 1080, 1200, 1920]) {
  if (src.startsWith('http')) {
    return src; // External URLs don't need srcset processing
  }
  
  const cleanSrc = src.startsWith('/') ? src.slice(1) : src;
  const basePath = cleanSrc.replace(/\.[^/.]+$/, ''); // Remove extension
  const extension = cleanSrc.match(/\.[^/.]+$/)?.[0] || '.jpg';
  
  return sizes
    .map(size => `/${basePath}-${size}w${extension} ${size}w`)
    .join(', ');
}

/**
 * Generate optimized image props for static export
 * @param {Object} props - Image properties
 * @returns {Object} - Optimized props for static images
 */
export function optimizeImageProps({ src, width, height, quality = 85, ...props }) {
  const optimizedSrc = imageLoader({ src, width, quality });
  
  return {
    ...props,
    src: optimizedSrc,
    width,
    height,
    // Add loading optimization
    loading: props.priority ? 'eager' : 'lazy',
    // Add decoding optimization
    decoding: 'async',
    // Add responsive behavior
    style: {
      maxWidth: '100%',
      height: 'auto',
      ...props.style,
    },
  };
}

/**
 * WebP fallback for static sites
 * @param {string} src - Original image source
 * @returns {Object} - Source set with WebP fallback
 */
export function createWebPFallback(src) {
  const cleanSrc = src.startsWith('/') ? src.slice(1) : src;
  const webpSrc = cleanSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  
  return {
    webp: `/${webpSrc}`,
    fallback: `/${cleanSrc}`,
  };
}