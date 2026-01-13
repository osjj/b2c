import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        hostname: 'shop.laifappe.com',
      },
      {
        protocol: 'https',
        hostname: 'placeholder.com',
      },
    ],
  },
};

export default nextConfig;
