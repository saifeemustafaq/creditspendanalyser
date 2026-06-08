import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  serverExternalPackages: ["esbuild-wasm", "mongodb"],
};

export default withSerwist(nextConfig);
