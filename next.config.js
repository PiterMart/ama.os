/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/ama-os.firebasestorage.app/o/**',
      },
    ],
  },
};

module.exports = nextConfig; 