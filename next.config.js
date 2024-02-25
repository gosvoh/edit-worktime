/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["oslo"],
    typedRoutes: true,
  },
  redirects: async () => [
    { source: "/register", destination: "/", permanent: true },
  ],
};

module.exports = nextConfig;
