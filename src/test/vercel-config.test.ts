import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getTransformedRoutes } from "@vercel/routing-utils";

// Vercel rejects the whole deployment (before building) when any route source is invalid,
// leaving production silently stuck on the previous build. Validate with Vercel's own parser.
const config = JSON.parse(readFileSync(path.resolve(__dirname, "../../vercel.json"), "utf8"));

describe("vercel.json", () => {
  it("has route sources Vercel accepts", () => {
    const { error } = getTransformedRoutes({
      rewrites: config.rewrites,
      headers: config.headers,
      redirects: config.redirects,
      cleanUrls: config.cleanUrls,
      trailingSlash: config.trailingSlash,
    });
    expect(error?.message ?? null).toBeNull();
  });

  it("keeps the service worker and manifest revalidating and assets immutable", () => {
    const headerFor = (source: string) =>
      config.headers
        .find((h: { source: string }) => h.source === source)
        ?.headers.find((x: { key: string }) => x.key === "Cache-Control")?.value;
    expect(headerFor("/sw.js")).toBe("public, max-age=0, must-revalidate");
    expect(headerFor("/manifest.webmanifest")).toBe("public, max-age=0, must-revalidate");
    expect(headerFor("/assets/(.*)")).toContain("immutable");
  });
});
