"use client";

import Link from "next/link";
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
      {/* 左右不留边：品牌与菜单顶到视口两侧 */}
      <div className="mx-auto flex max-w-[1680px] items-center justify-between px-0 py-4 sm:px-0 sm:py-6">
        <Link
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
            className="brand-txt flex flex-col justify-center gap-[0.12rem] overflow-hidden py-[0.1em]"
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
        </Link>

        <nav aria-label="主导航">
          <ul className="flex items-center gap-1 sm:gap-3">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex min-h-[44px] items-center rounded-sm px-3 py-2 transition-colors duration-200 sm:px-4",
                      active ? "text-ink" : "text-mute hover:text-ink",
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
