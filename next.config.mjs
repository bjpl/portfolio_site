/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Trailing slash configuration
  trailingSlash: false,
  
  // PWA and Image optimization
  images: {
    domains: ['localhost', 'vocal-pony-24e3de.netlify.app'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    loader: 'default',
  },
  
  // Redirect configuration (legacy support - main redirects handled by middleware)
  async redirects() {
    return [
      // Hugo legacy redirects for immediate compatibility
      {
        source: '/make/:path*',
        destination: '/writing/:path*',
        permanent: true,
      },
      {
        source: '/learn/:path*', 
        destination: '/tools/:path*',
        permanent: true,
      },
      {
        source: '/letratos/:path*',
        destination: '/gallery/:path*',
        permanent: true,
      },
      {
        source: '/servicios/:path*',
        destination: '/services/:path*',
        permanent: true,
      },
      {
        source: '/posts/:path*',
        destination: '/blog/:path*', 
        permanent: false,
      },
      // Admin redirect
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ];
  },
  
  // Rewrite configuration for API and dynamic routes
  async rewrites() {
    return {
      beforeFiles: [
        // Handle sitemap.xml
        {
          source: '/sitemap.xml',
          destination: '/api/sitemap',
        },
        // Handle robots.txt
        {
          source: '/robots.txt', 
          destination: '/api/robots',
        },
      ],
      afterFiles: [
        // Handle dynamic content routes
        {
          source: '/tools/resources/:slug',
          destination: '/tools/what-i-use/:slug',
        },
        {
          source: '/tools/strategy/:slug',
          destination: '/tools/strategies/:slug',
        },
        {
          source: '/projects/:slug',
          destination: '/tools/built/:slug',
        },
        {
          source: '/poetry/:slug',
          destination: '/writing/poetry/:slug',
        },
        {
          source: '/teaching/theory/:slug',
          destination: '/teaching-learning/sla-theory/:slug',
        },
        {
          source: '/posts/:slug',
          destination: '/blog/:slug',
        },
      ],
      fallback: [
        // Fallback to Hugo-style URLs if Next.js routes don't exist
        {
          source: '/:path*',
          destination: '/404',
        },
      ],
    };
  },
  
  // PWA and Security Headers configuration
  async headers() {
    return [
      // PWA Service Worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // PWA Manifest
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // PWA Icons
      {
        source: '/images/pwa/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security and SEO headers for all routes
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      // Cache headers for static assets
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache headers for images
      {
        source: '/(.*\\.(ico|png|jpg|jpeg|gif|webp|svg))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Configure webpack for CSS processing and optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Ensure proper CSS module handling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Optimize bundle splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };
    
    return config;
  },
  
  // Environment variables for build
  env: {
    SITE_URL: process.env.SITE_URL || 'https://vocal-pony-24e3de.netlify.app',
  },
  
  // PWA and Performance optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable compression
  compress: true,
  
  // Power by header removal for security
  poweredByHeader: false,
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
    webVitalsAttribution: ['CLS', 'LCP'],
  },
}

export default nextConfig