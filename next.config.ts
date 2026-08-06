import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  serverExternalPackages: ["firebase-admin", "@google-cloud/tasks"],

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
