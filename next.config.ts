import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/enquiries": ["./src/lib/mail/assets/goodycleaning-logo.png"],
    "/api/quotes/request": ["./src/lib/mail/assets/goodycleaning-logo.png"],
    "/api/admin/quotes/*/send": ["./src/lib/mail/assets/goodycleaning-logo.png"],
    "/api/admin/quotes/*/reopen": ["./src/lib/mail/assets/goodycleaning-logo.png"],
    "/api/webhooks/revolut": ["./src/lib/mail/assets/goodycleaning-logo.png"],
  },
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
