import type { Metadata, Viewport } from "next";
import "./globals.css";
import ShaderBackground from "@/components/ShaderBackground";
import SiteNav from "@/components/SiteNav";
import PageSwipe from "@/components/PageSwipe";
import { BASE } from "@/lib/site";

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
      <head>
        {/* 标签页图标：public/favicon.ico → 导出后落在站点根（out/favicon.ico）。
            ⚠ 手写绝对路径不会被 next.config 的 basePath 自动改写，须自己拼 BASE
              （同 src/lib/site.ts 里那条约定）。 */}
        <link rel="icon" href={`${BASE}/favicon.ico?v=2970f583b117`} sizes="16x16 24x24 32x32 48x48 64x64 128x128 256x256" type="image/x-icon" />
      </head>
      <body className="relative overflow-x-hidden antialiased">
        {/* 背景两层：CSS 兜底 → WebGL shader；压暗罩（shader-scrim）已按用户要求移除 */}
        <div className="bg-fallback" aria-hidden="true" />
        <ShaderBackground />
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
