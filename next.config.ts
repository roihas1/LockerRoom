import type { NextConfig } from "next";

const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
const mediaHost = mediaBase ? new URL(mediaBase) : null;
const mediaPath = mediaHost ? mediaHost.pathname.replace(/\/$/, "") : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/training", destination: "/plays", permanent: true },
      { source: "/training/:id", destination: "/plays/:id", permanent: true },
      { source: "/admin/training/:path*", destination: "/admin/plays/:path*", permanent: true },
    ];
  },
  images: {
    qualities: [70, 85],
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaHost
      ? [
          {
            protocol: mediaHost.protocol.replace(":", "") as "https" | "http",
            hostname: mediaHost.hostname,
            pathname: `${mediaPath}/images/**`,
          },
        ]
      : [],
  },
};

export default nextConfig;
