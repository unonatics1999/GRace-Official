import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile in a parent folder otherwise confuses Next.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
