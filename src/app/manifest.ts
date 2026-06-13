import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TimeCraft",
    short_name: "TimeCraft",
    description:
      "本当に重要な予定を配置し、余白を守りながら、毎週改善していくタイムクラフティングアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#11203f",
    theme_color: "#11203f",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
