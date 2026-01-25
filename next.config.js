/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // <--- This fixes the "out" directory error
  images: {
    unoptimized: true, // <--- This allows images to show up without a Node server
  },
}

module.exports = nextConfig
