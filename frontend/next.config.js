// Bundle analyzer - run with ANALYZE=true npm run build
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for optimized Railway deployment
  reactStrictMode: true,
  // Set turbopack root to fix Cyrillic path issues
  turbopack: {
    root: __dirname,
  },
  // Optimize imports for better tree-shaking
  modularizeImports: {
    // Optimize date-fns imports
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
    // Optimize lodash imports (if used)
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },
  // Experimental optimizations
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-icons'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*.railway.app',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Security & PWA Headers Configuration
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

    // Parse API domain for CSP
    const apiDomain = new URL(apiUrl).origin

    return [
      // Service Worker Headers
      {
        source: '/service-worker.js',
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
      // Manifest Headers
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      // Security Headers for All Routes
      {
        source: '/:path*',
        headers: [
          // Content Security Policy (CSP)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: Next.js App Router requires 'unsafe-inline' for hydration
              // In development: also need 'unsafe-eval' for HMR/Fast Refresh
              // In production: 'unsafe-inline' only (safer but not ideal)
              // TODO: Implement nonce-based CSP for better security (requires middleware)
              isDevelopment
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              // Styles: Allow self + inline (Tailwind/CSS-in-JS requires this)
              "style-src 'self' 'unsafe-inline'",
              // Images: Allow self, data URIs, HTTPS images
              "img-src 'self' data: https: blob:",
              // Fonts: Allow self + data URIs
              "font-src 'self' data:",
              // API connections: Allow self + API domain + WebSocket
              `connect-src 'self' ${apiDomain} ${apiDomain.replace('http', 'ws')}`,
              // Frames: Deny all iframes (prevent clickjacking)
              "frame-ancestors 'none'",
              // Base URI: Only allow same origin
              "base-uri 'self'",
              // Form actions: Only allow same origin
              "form-action 'self'",
              // Object/Embed: Block plugins (Flash, etc.)
              "object-src 'none'",
              // Upgrade insecure requests (HTTP → HTTPS) in production
              ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
            ].join('; '),
          },
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Feature/Permissions Policy - disable unused browser features
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()', // Disable camera
              'microphone=()', // Disable microphone
              'geolocation=(self)', // Allow geolocation for our site only
              'payment=()', // Disable payment API
              'usb=()', // Disable USB
              'magnetometer=()', // Disable sensors
              'gyroscope=()',
              'accelerometer=()',
            ].join(', '),
          },
          // HTTP Strict Transport Security (HSTS) - production only
          ...(isDevelopment
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]),
          // Remove X-Powered-By header (already done via poweredByHeader: false)
        ],
      },
    ]
  },
  // Proxy rewrites disabled - axios connects directly to backend
  // This prevents double /v1/v1/ path issues
  // async rewrites() {
  //   const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: `${apiUrl}/:path*`,
  //     },
  //   ];
  // },
  // Optimize for mobile
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
}

module.exports = withBundleAnalyzer(nextConfig)
