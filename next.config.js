/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    // De oude plaatsen-sitemap is opgegaan in /sitemap.xml.
    return [{ source: "/location-sitemap2.xml", destination: "/sitemap.xml", permanent: true }]
  },
}

module.exports = nextConfig
