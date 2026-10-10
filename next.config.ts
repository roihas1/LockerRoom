import type { NextConfig } from "next";

const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
const mediaHost = mediaBase ? new URL(mediaBase) : null;
const mediaPath = mediaHost ? mediaHost.pathname.replace(/\/$/, "") : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
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
