/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["oslo"],
    typedRoutes: true,
    esmExternals: false,
  },
  redirects: async () => [
    // { source: "/register", destination: "/", permanent: true },
  ],
};

module.exports = nextConfig;
