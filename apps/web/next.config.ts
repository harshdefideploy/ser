import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@tron-gas-sponsor/shared"],
  output: "standalone",
  outputFileTracingRoot: rootDir,
};

export default nextConfig;
