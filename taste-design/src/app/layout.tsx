import type { Metadata, Viewport } from "next";
import "./globals.css";
import ShaderBackground from "@/components/ShaderBackground";
import SiteNav from "@/components/SiteNav";
import PageSwipe from "@/components/PageSwipe";

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

        {/* PageSwipe 提供「渐隐渐现 + 左右滑动」的换页过渡；
            data-page-stage 标记被动画的舞台，固定导航留在舞台外不被一起推走 */}
        <PageSwipe>
          <SiteNav />
          <main data-page-stage className="relative overflow-x-clip">{children}</main>
        </PageSwipe>
      </body>
    </html>
  );
}
