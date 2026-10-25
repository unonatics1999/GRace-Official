import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera for handoff photos; nothing else.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile in a parent folder otherwise confuses Next.
  outputFileTracingRoot: __dirname,
  // Self-contained server build for the Docker image.
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // Handoff checklists upload up to six compressed photos in one request.
    serverActions: { bodySizeLimit: "30mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
