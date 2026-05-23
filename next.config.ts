import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["child_process"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" }, // for CSV uploads
  },
};

export default nextConfig;
