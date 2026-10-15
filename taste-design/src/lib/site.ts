/**
 * 站点级内容与配置。
 * 之后接 CMS / 数据时，把这里换成 fetch 即可，组件不用改。
 */

export const STUDIO = {
  name: "Taste Design",
  nameCn: "设计厨房",
  tagline: "把方法与手感，炖进每一个项目",
  intro:
    "我们是一间设计厨房。不卖灵感，只卖配方——把策略、排版与执行按火候配比，出品稳定、可复现、有回味的设计。",
  since: "2016",
  city: "中国 · 深圳",
  email: "hello@tastedesign.studio",
  phone: "+86 755 0000 0000",
  wechat: "tastedesign",
} as const;

/**
 * 站点的子路径前缀。
 * GitHub Pages 项目站点挂在 https://<owner>.github.io/<repo>/ 下，
 * 静态资源与手写链接都得带上这个前缀。
 * CI 里注入 NEXT_PUBLIC_BASE_PATH=/<repo>；本地不设 → 空串（保持根相对）。
 *
 * ⚠ 只有「源码里手写的绝对路径」需要它（<img src>、<a href>）。
 *   next/link 的 href、以及经 webpack 处理的资源会自动带上 next.config 的 basePath。
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** 作品类型 —— 作品页按此分组 */
export const WORK_TYPES = [
  { id: "all", label: "全部", labelEn: "ALL" },
  { id: "brand", label: "品牌识别", labelEn: "BRAND" },
  { id: "web", label: "网站与数字", labelEn: "WEB" },
  { id: "graphic", label: "视觉与平面", labelEn: "GRAPHIC" },
  { id: "space", label: "空间与陈列", labelEn: "SPACE" },
  { id: "type", label: "字体与排版", labelEn: "TYPE" },
] as const;

export const NAV = [
  { href: "/", label: "我们", labelEn: "STUDIO" },
  { href: "/works", label: "作品", labelEn: "WORKS" },
] as const;

export const CONTACTS = [
  { label: "邮件", value: "hello@tastedesign.studio", href: "mailto:hello@tastedesign.studio" },
  { label: "微信", value: "tastedesign", href: null },
  { label: "电话", value: "+86 755 0000 0000", href: "tel:+8675500000000" },
  { label: "地址", value: "深圳市南山区 · 蛇口", href: null },
] as const;
