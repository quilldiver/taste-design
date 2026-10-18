"use client";

import { SwipeLink } from "@/components/PageSwipe";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, STUDIO, BASE } from "@/lib/site";

/**
 * 顶部导航。
 * 品牌区：logo 定死 48px；中文主名 18px / 90% 白，英文副标 12px / 50% 白。
 * 首页第一屏只显示图形 logo，滚过半屏进入第二屏后文字从下往上浮现；
 * 作品页没有 hero 首屏，文字常显。
 * 颜色固定为色板两档（主 90% 白 / 辅 50% 白），不再用 difference 反相。
 */
export default function SiteNav() {
  const pathname = usePathname();
  const [textIn, setTextIn] = useState(false);
  const [shade, setShade] = useState(false);

  useEffect(() => {
    let ticking = false;
    const sync = () => {
      const onWorks = pathname.startsWith("/works");
      setTextIn(onWorks || window.scrollY > window.innerHeight * 0.55);
      /* 第二屏（纯黑球体屏 #clients）盖住视口顶部时点亮导航黑幕。
         用「球体屏与视口顶边的相对位置」判定：顶边已越过 0、底边还没越过 0。
         比 IntersectionObserver 的边界判定可靠 —— 切到第三屏那一帧第二屏
         底边恰好落在 0 上，IO 会把这种相切算成相交，幕布就关不掉。 */
      const el = document.getElementById("clients");
      if (!el) {
        setShade(false);
        return;
      }
      const r = el.getBoundingClientRect();
      setShade(r.height > 0 && r.top <= 0 && r.bottom > 0);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sync();
        ticking = false;
      });
    };
    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
    };
  }, [pathname]);

  return (
    <header
      data-shade={shade}
      className="site-nav fixed inset-x-0 top-0 z-50"
    >
      {/* 左右留 32px 呼吸；≤711px 按 4.5vw 自动收，否则 360/320 会把「作品」挤出屏幕 */}
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-[clamp(1rem,4.5vw,2rem)] py-4 sm:py-6">
        <SwipeLink
          href="/"
          className="group flex items-center gap-[0.65rem] no-underline"
          aria-label={`${STUDIO.name} ${STUDIO.nameCn} — 首页`}
        >
          <span aria-hidden="true" className="block leading-none text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/taste-logo.svg`} alt="" className="block h-12 w-12" />
          </span>
          <span
            data-in={textIn}
            className="brand-txt flex flex-col justify-center gap-[0.12rem] overflow-hidden py-[0.1em] max-[359px]:hidden"
          >
            {/* 英文副标：12px / 辅助档 50% 白 */}
            <span className="whitespace-nowrap font-display text-[12px] font-semibold leading-[1.3] tracking-[0.04em] text-mute">
              {STUDIO.name}
            </span>
            {/* 中文主名：18px / 主文本档 90% 白 */}
            <span className="whitespace-nowrap text-[18px] font-medium leading-[1.25] tracking-[0.02em] text-ink">
              {STUDIO.nameCn}
            </span>
          </span>
        </SwipeLink>

        <nav aria-label="主导航">
          <ul className="flex items-center gap-1 max-[479px]:gap-0 sm:gap-3">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <SwipeLink
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      /* 两态：常规 = 整项 50% 透明，激活（当前页）= 100%。
                         用 opacity 而不是 text-ink/text-mute —— 子元素各自带
                         字色（EN 是 text-mute、CN 是 text-ink），改父级 color
                         根本传不下去，之前那套 active/inactive 其实看不出差别。
                         hover 取中间档 75%：有反馈，但不会被误读成「已选中」。 */
                      "flex min-h-[44px] items-center rounded-sm px-3 py-2 transition-opacity duration-200 max-[479px]:px-1.5 sm:px-4",
                      active
                        ? "opacity-100"
                        : "opacity-50 hover:opacity-75 focus-visible:opacity-100",
                    ].join(" ")}
                  >
                    <span className="flex flex-col leading-none">
                      <span className="font-mono text-[0.65rem] tracking-[0.24em] text-mute">
                        {item.labelEn}
                      </span>
                      <span className="mt-1 text-[0.95rem] text-ink sm:text-base">
                        {item.label}
                      </span>
                    </span>
                  </SwipeLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
