import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Only our own code runs. Next.js needs inline scripts for hydration ('unsafe-inline'); development
// also needs eval and a websocket for hot reload. Nothing may frame the site, and forms may only post
// to us (or PayMongo's checkout, which payment redirects to).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.paymongo.com",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Uploaded files (photos, PDFs) get a locked-down policy of their own: no scripts, sandboxed.
const fileContentSecurityPolicy = "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'";

const securityHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/((?!api/files/).*)", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] },
      { source: "/api/files/:path*", headers: [{ key: "Content-Security-Policy", value: fileContentSecurityPolicy }] },
    ];
  },
};

export default nextConfig;
