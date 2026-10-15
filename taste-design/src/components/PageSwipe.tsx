"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";

/**
 * 「我们 / 作品」两页之间的过渡：渐隐渐现 + 左右滑动。
 *
 * 为什么是「顺序式」而不是交叉淡化：App Router 一旦换路由，旧页面的 DOM 立刻就没了，
 * 所以点击时先把当前舞台滑走淡出，动画跑完才 router.push —— 换页发生在两页都不可见
 * 的那一瞬，顺手把滚动归零也不会被看见；新页面挂载后再从侧面滑进来。
 *
 * 方向按导航顺序：去后面的页面（我们 → 作品）新页从右边进，返回则从左边进。
 */

type Nav = (href: string) => void;

const SwipeCtx = createContext<Nav>(() => {});
export const useSwipeNav = () => useContext(SwipeCtx);

/* 导航顺序决定滑动方向。挂在子路径下部署时 usePathname() 不返回 basePath，
   一律按「最后一段」判断，免得 /taste-design/works 匹配不上 */
const ORDER: Record<string, number> = { "/": 0, "/works": 1 };
const tail = (h: string) => {
  const k = (h || "/").replace(/\/+$/, "") || "/";
  return k.slice(k.lastIndexOf("/")) || "/";
};
const rank = (h: string) => ORDER[tail(h)] ?? 0;

const OUT_MS = 220;
const IN_MS = 360;
const dist = () => Math.max(24, Math.min(90, window.innerWidth * 0.055));
const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stageEl = () => document.querySelector<HTMLElement>("[data-page-stage]");

/** 站点内的链接：走带动画的过渡；装饰键 / 中键开新标签时交回浏览器 */
export function SwipeLink({ href, onClick, children, ...rest }: React.ComponentProps<typeof Link>) {
  const nav = useSwipeNav();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
          return;
        e.preventDefault();
        nav(String(href));
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

export default function PageSwipe({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const prev = useRef(pathname);
  const dir = useRef(1);
  const busy = useRef(false);

  /* 路由变了 ⇒ 新页面从侧面滑进来（离开动画在点击时已经播完） */
  useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    const el = stageEl();
    const settle = () => {
      busy.current = false;
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel()); // 撤掉 fill，舞台回到无残样式
      el.style.opacity = "";
      el.style.transform = "";
    };
    if (!el || !el.animate || reduce()) {
      window.scrollTo({ top: 0, behavior: "auto" });
      settle();
      return;
    }
    const d = dist() * dir.current;
    const anim = el.animate(
      [
        { opacity: 0, transform: `translate3d(${d}px,0,0)` },
        { opacity: 1, transform: "translate3d(0,0,0)" },
      ],
      { duration: IN_MS, easing: "cubic-bezier(.22,.61,.36,1)", fill: "both" },
    );
    anim.finished.then(settle, settle);
  }, [pathname]);

  const nav = useCallback(
    (href: string) => {
      if (tail(href) === tail(pathname) || busy.current) return;
      const el = stageEl();
      if (!el || !el.animate || reduce()) {
        router.push(href);
        return;
      }
      busy.current = true;
      dir.current = rank(href) >= rank(pathname) ? 1 : -1;
      const d = -dist() * dir.current;
      const anim = el.animate(
        [
          { opacity: 1, transform: "translate3d(0,0,0)" },
          { opacity: 0, transform: `translate3d(${d}px,0,0)` },
        ],
        { duration: OUT_MS, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" },
      );
      const land = () => {
        window.scrollTo({ top: 0, behavior: "auto" });
        router.push(href);
        /* 兜底：万一新路由迟迟不挂载（离线、加载失败），别把导航锁死 */
        window.setTimeout(() => {
          busy.current = false;
        }, 800);
      };
      anim.finished.then(land, land);
    },
    [pathname, router],
  );

  return <SwipeCtx.Provider value={nav}>{children}</SwipeCtx.Provider>;
}
