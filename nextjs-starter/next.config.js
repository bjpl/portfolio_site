/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '**',
      },
    ],
  },
  // Updated for Next.js 15.5+
  serverExternalPackages: ['@supabase/supabase-js'],
  // Explicitly set the workspace root to avoid inference issues
  outputFileTracingRoot: __dirname,
}

module.exports = nextConfig