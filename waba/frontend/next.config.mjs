/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      '@chakra-ui/react',
      'lucide-react',
      'react-icons',
      'framer-motion',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },
      {
        source: '/public/:path*',
        destination: 'http://127.0.0.1:5000/public/:path*',
      },
      {
        source: '/public/:path*',
        destination: 'http://localhost:5000/public/:path*',
      },
    ];
  },
};

export default nextConfig;
