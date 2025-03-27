// next.config.js with optimization settings
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Use SWC minifier for better performance
  
  // Use server components where possible and reduce client bundle size
  serverComponents: true,
  
  // Optimize images
  images: {
    domains: ['admin.damneddesigns.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  
  // Optimize fonts by keeping them local
  optimizeFonts: true,
  
  // Configure webpack for better bundling
  webpack: (config, { dev, isServer }) => {
    // Only run in production client builds
    if (!dev && !isServer) {
      // Enable tree shaking and dead code elimination
      config.optimization.usedExports = true;
      
      // Split chunks more aggressively
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 30,
        maxAsyncRequests: 30,
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Create a separate chunk for Material UI
          mui: {
            test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
            name: 'mui',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Create a separate chunk for large libraries
          vendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|redux|@reduxjs)[\\/]/,
            name: 'vendor',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Group smaller utilities together
          utils: {
            test: /[\\/]node_modules[\\/](lodash|moment|date-fns)[\\/]/,
            name: 'utils',
            priority: 5,
            reuseExistingChunk: true,
          },
          // Default settings for everything else
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // Configure headers for better security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // Configure redirects and rewrites as needed
  async redirects() {
    return [];
  },
  
  // Enable response compression
  compress: true,
  
  // Improve production builds
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundles
  poweredByHeader: false, // Remove X-Powered-By header for security
  
  // Configure environment variables exposure
  env: {
    // Define which env vars should be available to the browser 
    // (only add non-sensitive ones here)
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
};

module.exports = nextConfig;
