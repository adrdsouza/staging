// next.config.js

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Use SWC minifier for better performance
  
  // Image optimization
  images: {
    domains: [
      'admin.damneddesigns.com',
      'cdn.damneddesigns.com', // Your CDN domain
      'cloudflare-ipfs.com',   // If using Cloudflare
      'cloudfront.net',        // If using AWS CloudFront
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Fonts optimization
  optimizeFonts: true,
  
  // Export as standalone for better deployment
  output: 'standalone',
  
  // Configure webpack for better bundling
  webpack: (config, { dev, isServer }) => {
    // Only run in production client builds
    if (!dev && !isServer) {
      // Enable tree shaking and dead code elimination
      config.optimization.usedExports = true;
      
      // Split chunks more aggressively
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
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
          // Add Content Security Policy when ready
          // {
          //   key: 'Content-Security-Policy',
          //   value: "default-src 'self'; script-src 'self'"
          // }
        ],
      },
    ];
  },
  
  // Enable response compression
  compress: true,
  
  // Improve production builds
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundles
  poweredByHeader: false, // Remove X-Powered-By header for security
  
  // Trailing slash configuration
  trailingSlash: false,
  
  // Environment variables to be available on the client
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://damneddesigns.com',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://admin.damneddesigns.com/graphql',
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.damneddesigns.com',
  },
  
  // Experimental features
  experimental: {
    // Enable React Server Components
    serverComponents: true,
    // Enable app directory
    appDir: true,
    // Optimize fonts
    fontLoaders: [
      { loader: '@next/font/google', options: { subsets: ['latin'] } },
    ],
  },
  
  // Sentry configuration
  sentry: {
    hideSourceMaps: true,
    disableServerWebpackPlugin: process.env.NODE_ENV === 'development',
    disableClientWebpackPlugin: process.env.NODE_ENV === 'development',
  },
};

// Sentry configuration for source maps
const sentryWebpackPluginOptions = {
  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
};

// Export configuration with bundle analyzer and Sentry
module.exports = withSentryConfig(
  withBundleAnalyzer(nextConfig),
  sentryWebpackPluginOptions
);
