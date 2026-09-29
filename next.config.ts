import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Poster maks. 2 MB dikirim lewat Server Action.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  serverExternalPackages: ["@react-pdf/renderer", "bullmq", "ioredis", "exceljs"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
