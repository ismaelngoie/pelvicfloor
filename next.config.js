/** @type {import('next').NextConfig} */

// next-pwa@5.6.0 does not support Next 15. It looks for
// .next/server/middleware-manifest.json, which Next 15 no longer writes, and the
// build dies after "Collecting page data". That is why this repo did not deploy
// for five months, and it is why the plugin is gone from package.json.
//
// The service worker is now a hand-written public/sw.js, registered by
// app/ServiceWorker.jsx. There is no build step and no precache manifest to
// keep in sync, because it only ever caches content-hashed /_next/static/*
// URLs and never touches HTML. Read the header of public/sw.js before changing
// any of that: a worker that caches HTML is how a site starts serving a build
// from five months ago.
const nextConfig = {
  reactStrictMode: true,
  // For the DEV SERVER only. A `next build` and a `next dev` sharing one .next
  // folder delete each other's chunks; it surfaces as "Cannot find module
  // './733.js'" and a dev server stuck on 500 that restarting does not fix.
  // `npm run dev:qa` sets NEXT_DIST_DIR so a dev server can keep running while
  // somebody builds.
  //
  // It does NOT make two builds safe. `next build` with output:'export' still
  // writes .next/export and .next/server/pages by hardcoded path whatever
  // distDir says, so a second concurrent build fails on a missing 500.html.
  // Builds have to take turns.
  //
  // Unset, which is how CI and Cloudflare Pages run, this is the Next default.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'export', // required for Cloudflare Pages
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
