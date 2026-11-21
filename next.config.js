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
    return [
      { source: "/location-sitemap2.xml", destination: "/sitemap.xml", permanent: true },
      // Typfout in de oude URL; de canonical wees naar een pagina die niet bestond.
      { source: "/diensten/verkeerde-brandstof-getanked", destination: "/diensten/verkeerde-brandstof-getankt", permanent: true },
      { source: "/diensten/verkeerde-brandstof", destination: "/diensten/verkeerde-brandstof-getankt", permanent: true },
      { source: "/:taal(nl|en|de|fr)/diensten/verkeerde-brandstof-getanked", destination: "/:taal/diensten/verkeerde-brandstof-getankt", permanent: true },
    ]
  },
}

module.exports = nextConfig
