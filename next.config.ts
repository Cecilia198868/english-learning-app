import type { NextConfig } from "next";

const devOrigins = ["192.168.88.8", "127.0.0.1", "localhost"];

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingExcludes: {
    "/api/admin/elevenlabs-course-audio": ["./public/**/*", "public/**/*"],
  },
  ...(process.env.NODE_ENV === "production"
    ? {}
    : { allowedDevOrigins: devOrigins }),
  async headers() {
    return [
      {
        source: "/speak-english",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: "/login/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: "/api/auth/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
