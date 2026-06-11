import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['playwright', 'sharp'],
  async redirects() {
    return [
      {
        source: '/solutions/ppe-safety-equipment-for-construction-sites',
        destination: '/solutions/construction-site-ppe-solution',
        permanent: true,
      },
    ];
  },
  async headers() {
    const devAdminCacheResetHeaders =
      process.env.NODE_ENV === 'development'
        ? [
            {
              source: '/admin/:path*',
              headers: [
                {
                  key: 'Clear-Site-Data',
                  value: '"cache"',
                },
              ],
            },
          ]
        : [];
    const staticAssetHeaders =
      process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/_next/static/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : [];

    return [
      {
        source: '/:path*',
        headers: [
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
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      ...devAdminCacheResetHeaders,
      ...staticAssetHeaders,
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.laifappe.com',
      },
      {
        protocol: 'https',
        hostname: 'placeholder.com',
      },
      {
        protocol: 'https',
        hostname: '*.aitohumanize.com',
      },
      {
        protocol: 'https',
        hostname: '*.1688.com',
      },
      {
        protocol: 'https',
        hostname: '*.alicdn.com',
      },
      {
        protocol: 'https',
        hostname: 'cbu01.alicdn.com',
      },
    ],
  },
};

export default nextConfig;
