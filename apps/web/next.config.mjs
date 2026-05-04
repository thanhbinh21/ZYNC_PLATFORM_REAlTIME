import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['zync-media.s3.ap-southeast-1.amazonaws.com', 'res.cloudinary.com'],
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react$': require.resolve('react'),
      'react-dom$': require.resolve('react-dom'),
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;