import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The web app is a fully static site (it only talks to the WebSocket
  // server), so it can be hosted on GitHub Pages: `next build` writes `out/`.
  output: "export",
  trailingSlash: true,
  // Set when the site lives under a path prefix, e.g. `/scrawl` on GitHub Pages.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  // The e2e run uses its own build dir so it can coexist with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
