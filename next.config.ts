import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  serverExternalPackages: ["firebase-admin", "@google-cloud/tasks"],
};

export default nextConfig;