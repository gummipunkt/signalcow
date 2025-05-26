/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*', // Forwards requests to the backend on port 3001
      },
    ];
  },
};

export default nextConfig; 