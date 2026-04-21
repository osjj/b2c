import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
