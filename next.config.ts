import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["firebase-admin"],
  async rewrites() {
    return [
      {
        source: "/web",
        destination: "https://testing-zone-five.vercel.app/web",
      },
      {
        source: "/web/:path*",
        destination: "https://testing-zone-five.vercel.app/web/:path*",
      },
    ];
  },
};

export default nextConfig;
