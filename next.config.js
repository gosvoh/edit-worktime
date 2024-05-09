/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // serverComponentsExternalPackages: ["oslo"],
    // typedRoutes: true,
    // esmExternals: false,
    // serverMinification: false,
  },
  redirects: async () => [
    // { source: "/register", destination: "/", permanent: true },
  ],
};

module.exports = nextConfig;
