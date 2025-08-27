import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  
  // Optimized for static portfolio - but allow server rendering for better performance
  trailingSlash: false,
  
  // Images optimization
  images: {
    domains: ['localhost', 'vocal-pony-24e3de.netlify.app'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Optimized images with Next.js built-in optimization
  },
  
  // Security and performance headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
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
      // Cache static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize for static export
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Enhanced code splitting
    config.optimization.splitChunks = {
      ...config.optimization.splitChunks,
      chunks: 'all',
      cacheGroups: {
        ...config.optimization.splitChunks.cacheGroups,
        // Framework chunk
        framework: {
          chunks: 'all',
          name: 'framework',
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types)[\\/]/,
          priority: 40,
          enforce: true,
        },
        // Libraries chunk
        lib: {
          test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion|date-fns|clsx|tailwind-merge)[\\/]/,
          name: 'lib',
          priority: 30,
          chunks: 'all',
          enforce: true,
        },
        // Common chunk
        common: {
          name: 'common',
          minChunks: 2,
          priority: 10,
          chunks: 'all',
          enforce: true,
        },
      },
    };

    // Production optimizations
    if (!dev) {
      // Remove console logs in production
      const terserPlugin = config.optimization.minimizer?.find(
        (plugin) => plugin.constructor.name === 'TerserPlugin'
      );
      
      if (terserPlugin) {
        terserPlugin.options.terserOptions = {
          ...terserPlugin.options.terserOptions,
          compress: {
            ...terserPlugin.options.terserOptions.compress,
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
        };
      }
    }

    // SVG optimization
    config.module.rules.push({
      test: /\.svg$/,
      use: [{
        loader: '@svgr/webpack',
        options: {
          svgo: true,
          svgoConfig: {
            plugins: [
              {
                name: 'removeViewBox',
                active: false,
              },
            ],
          },
        },
      }],
    });
    
    return config;
  },

  // Compiler optimizations
  compiler: {
    removeConsole: isProd,
  },

  // Enable compression
  compress: true,
  poweredByHeader: false,

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns', 
      '@radix-ui/react-tabs',
      '@radix-ui/react-slot',
      'framer-motion'
    ],
    webVitalsAttribution: ['CLS', 'LCP']
  },
  
  // Build configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Bundle optimization
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
      preventFullImport: true,
    },
    'date-fns': {
      transform: 'date-fns/{{ member }}',
      preventFullImport: true,
    },
    '@radix-ui/react-tabs': {
      transform: '@radix-ui/react-tabs/dist/{{ member }}',
      preventFullImport: true,
    },
    'framer-motion': {
      transform: 'framer-motion/dist/es/{{ member }}',
      preventFullImport: true,
    },
  },
}

export default bundleAnalyzer(nextConfig);