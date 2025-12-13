/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
    // Optimize image loading
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Enable edge runtime for better performance
  experimental: {
    serverActions: {},
    optimizeCss: true,
  },
  // Optimize production build
  swcMinify: true,
  // Add rewrites for clean URLs
  async rewrites() {
    return [
      {
        source: '/p/:id',
        destination: '/products/:id',
      },
      {
        source: '/proj/:id',
        destination: '/projects/:id',
      },
    ];
  },
}

module.exports = nextConfig