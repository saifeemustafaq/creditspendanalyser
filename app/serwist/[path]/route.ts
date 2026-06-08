import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

function getRevision(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  const hash = result.stdout?.trim();
  return hash || crypto.randomUUID();
}

const revision = getRevision();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "app/sw.ts",
  useNativeEsbuild: false,
});
