'use client';

import { useEffect, useState } from 'react';

// Font loading optimization
export const FontOptimizer = ({ children, fonts = [] }) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        // Check if fonts are already loaded
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
          setFontsLoaded(true);
          return;
        }

        // Fallback for browsers without Font Loading API
        const loadPromises = fonts.map((font) => {
          return new Promise((resolve, reject) => {
            const fontFace = new FontFace(font.family, `url(${font.url})`);
            
            fontFace.load().then(() => {
              document.fonts.add(fontFace);
              resolve();
            }).catch(reject);
          });
        });

        await Promise.all(loadPromises);
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Font loading failed:', error);
        // Fallback to web-safe fonts
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, [fonts]);

  return (
    <div className={`font-optimizer ${fontsLoaded ? 'fonts-loaded' : 'fonts-loading'}`}>
      {children}
      
      <style jsx>{`
        .font-optimizer.fonts-loading {
          /* Use web-safe fonts while custom fonts load */
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .font-optimizer.fonts-loaded {
          /* Transition to custom fonts smoothly */
          transition: font-family 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

// Critical font preloader
export const FontPreloader = ({ fonts }) => {
  useEffect(() => {
    fonts.forEach((font) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.href = font.url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, [fonts]);

  return null;
};

// Font display optimization
export const OptimizedText = ({ 
  children, 
  className = '', 
  fallbackFont = 'sans-serif',
  critical = false,
  ...props 
}) => {
  return (
    <span 
      className={`optimized-text ${className}`}
      style={{
        fontDisplay: critical ? 'block' : 'swap',
        fontFamily: `var(--font-primary, ${fallbackFont})`,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

// Web font loader hook
export const useWebFonts = (fontConfigs) => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let mounted = true;

    const loadWebFonts = async () => {
      try {
        // Create font face declarations
        const fontFaces = fontConfigs.map(config => {
          const fontFace = new FontFace(
            config.family,
            config.source,
            {
              weight: config.weight || 'normal',
              style: config.style || 'normal',
              display: config.display || 'swap',
            }
          );
          return fontFace.load();
        });

        // Load all fonts in parallel
        const loadedFonts = await Promise.all(fontFaces);
        
        if (mounted) {
          // Add fonts to document
          loadedFonts.forEach((font, index) => {
            document.fonts.add(font);
            
            // Add CSS custom properties for each font
            document.documentElement.style.setProperty(
              `--font-${fontConfigs[index].name}`,
              fontConfigs[index].family
            );
          });
          
          setStatus('loaded');
        }
      } catch (error) {
        console.warn('Web font loading failed:', error);
        if (mounted) {
          setStatus('error');
        }
      }
    };

    loadWebFonts();

    return () => {
      mounted = false;
    };
  }, [fontConfigs]);

  return status;
};

// Font performance metrics
export const FontMetrics = () => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'fonts' in document) {
      const measureFontPerformance = () => {
        const fontEntries = performance.getEntriesByType('resource')
          .filter(entry => entry.name.includes('font') || /\.(woff2?|ttf|otf|eot)$/i.test(entry.name));

        const totalFontSize = fontEntries.reduce((acc, entry) => acc + (entry.transferSize || 0), 0);
        const fontLoadTime = Math.max(...fontEntries.map(entry => entry.responseEnd), 0);

        setMetrics({
          totalFonts: fontEntries.length,
          totalSize: totalFontSize,
          loadTime: fontLoadTime,
          fonts: fontEntries.map(entry => ({
            name: entry.name.split('/').pop(),
            size: entry.transferSize || 0,
            loadTime: entry.responseEnd - entry.requestStart,
          })),
        });
      };

      // Measure after fonts are loaded
      if (document.fonts.ready) {
        document.fonts.ready.then(measureFontPerformance);
      } else {
        // Fallback timing
        setTimeout(measureFontPerformance, 2000);
      }
    }
  }, []);

  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded text-xs font-mono z-50">
      <div className="mb-1">Font Metrics:</div>
      <div>Fonts: {metrics.totalFonts}</div>
      <div>Size: {(metrics.totalSize / 1024).toFixed(1)}KB</div>
      <div>Load: {metrics.loadTime.toFixed(0)}ms</div>
    </div>
  );
};

// System font stack utility
export const systemFontStack = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont', 
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    '"Noto Sans"',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Noto Color Emoji"'
  ].join(', '),
  
  serif: [
    'ui-serif',
    'Georgia',
    'Cambria',
    '"Times New Roman"',
    'Times',
    'serif'
  ].join(', '),
  
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    '"SF Mono"',
    'Consolas',
    '"Liberation Mono"',
    'Menlo',
    'monospace'
  ].join(', ')
};

export default FontOptimizer;