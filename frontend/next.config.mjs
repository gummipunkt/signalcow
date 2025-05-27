/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://signalbot.ecow.dev/api/:path*', // Forwards requests to the backend on port 3001
      },
    ];
  },
};

export default nextConfig; 