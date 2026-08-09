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
