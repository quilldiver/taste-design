import type { Metadata, Viewport } from "next";
import "./globals.css";
import ShaderBackground from "@/components/ShaderBackground";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Taste Design 设计厨房",
  description: "一间设计厨房。把策略、排版与执行按火候配比，出品稳定、有回味的设计。",
};

export const viewport: Viewport = {
  themeColor: "#030815",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="relative overflow-x-hidden antialiased">
        {/* 三层背景：CSS 兜底 → WebGL shader → 压暗 + 颗粒 */}
        <div className="bg-fallback" aria-hidden="true" />
        <ShaderBackground />
        <div className="shader-scrim" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        <SiteNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
