import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Chrome アプリモードの強制再読み込みで HTML だけ新しくなり CSS が 404 になるのを防ぐ */
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
