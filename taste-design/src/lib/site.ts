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

/**
 * 作品页的七类出品 —— 以 Deckshift 式「重叠牌堆」呈现。
 * kind 决定卡面图标；顺序即牌堆从左到右的顺序。
 */
export const WORK_DECKS = [
  { kind: "logo", index: "001", cn: "标志设计", en: "LOGO", note: "一个符号，撑住所有触点" },
  { kind: "brand", index: "002", cn: "品牌设计", en: "BRANDING", note: "把调性与规矩写成能复用的系统" },
  { kind: "event", index: "003", cn: "活动设计", en: "CAMPAIGN", note: "限时、限地，一次说清一件事" },
  { kind: "pack", index: "004", cn: "包装设计", en: "PACKAGING", note: "货架上的三秒决断" },
  { kind: "type", index: "005", cn: "排版设计", en: "TYPOGRAPHY", note: "字距与行距里的呼吸节奏" },
  { kind: "ip", index: "006", cn: "IP设计", en: "IP & MASCOT", note: "能被记住，也能被延展" },
  { kind: "misc", index: "007", cn: "其他设计", en: "MISCELLANEOUS", note: "不好归类的好东西" },
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
