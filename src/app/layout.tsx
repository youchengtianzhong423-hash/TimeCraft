import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { DataPersistence } from "@/components/DataPersistence";
import { GoogleProvider } from "@/components/GoogleProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TimeCraft — 時間を管理するのではなく、時間をつくる",
  description:
    "TimeCraftは、本当に重要な予定を配置し、余白を守りながら、毎週改善していくためのタイムクラフティングアプリです。",
  applicationName: "TimeCraft",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "TimeCraft",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <GoogleProvider>
          <ThemeProvider />
          <DataPersistence />
          <AppShell>{children}</AppShell>
        </GoogleProvider>
      </body>
    </html>
  );
}
