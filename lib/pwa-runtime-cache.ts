import { defaultCache } from "@serwist/turbopack/worker";
import type { RuntimeCaching } from "serwist";
import { NetworkOnly } from "serwist";

/** Cache names that may store HTML, RSC payloads, or API responses — excluded for security. */
const UNSAFE_CACHE_NAMES = new Set([
  "apis",
  "next-data",
  "others",
  "cross-origin",
  "pages-rsc-prefetch",
  "pages-rsc",
  "pages",
  "static-data-assets",
]);

function getCacheName(entry: RuntimeCaching): string | undefined {
  const handler = entry.handler as { cacheName?: string };
  return handler.cacheName;
}

/** Static assets only — never HTML, RSC, or API responses. */
export const secureRuntimeCaching: RuntimeCaching[] = [
  ...defaultCache.filter((entry) => {
    const cacheName = getCacheName(entry);
    return cacheName !== undefined && !UNSAFE_CACHE_NAMES.has(cacheName);
  }),
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin &&
      (request.mode === "navigate" ||
        request.destination === "document" ||
        request.headers.get("RSC") === "1" ||
        request.headers.get("Next-Router-Prefetch") === "1"),
    handler: new NetworkOnly(),
  },
  {
    matcher: /\/_next\/data\/.+\/.+\.json$/i,
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url: { pathname } }) =>
      sameOrigin && !pathname.startsWith("/_next/static"),
    method: "GET",
    handler: new NetworkOnly(),
  },
];
