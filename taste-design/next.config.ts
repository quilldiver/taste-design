import type { NextConfig } from "next";

/**
 * GitHub Pages 是「项目站点」，地址形如 https://<owner>.github.io/<repo>/，
 * 所有资源都挂在 /<repo> 子路径下。Next 只在 next.config 里做 basePath，
 * 源码里手写的绝对路径（<img src> / CSS url()）不会被自动改写，
 * 所以这里统一从 NEXT_PUBLIC_BASE_PATH 取值（由 CI 注入），
 * 代码里再显式拼前缀（见 src/lib/site.ts 的 BASE）。
 * 本地开发时不设该变量 → 前缀为空串，路径保持根相对，dev 体验不变。
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /** 站点是纯静态的：没有服务端渲染、没有取数、没有重写 → 直接静态导出 */
  output: "export",
  /** 导出 trailingSlash → 生成 /works/index.html，Pages 才能按目录索引打开 */
  trailingSlash: true,
  /** 不需要 next/image 优化器（项目也没用它），省掉一个运行时依赖 */
  images: { unoptimized: true },

  basePath,
  assetPrefix: basePath,
};

export default nextConfig;
