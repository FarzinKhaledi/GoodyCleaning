import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return ["goodycleaning.com", "www.goodycleaning.com", "www.goodycleaning.co.uk"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://goodycleaning.co.uk/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;
