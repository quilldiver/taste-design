"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { WORK_DECKS } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 作品页 —— Deckshift 式「重叠牌堆」（参考 framer.com/marketplace/components/deckshift/）。
 *
 * 静止：七张卡横向叠放、各自带一点固定倾斜，像一副没理齐的牌。
 * 桌面：悬停某张 ⇒ 它浮起当主角，两侧卡片按距离被弹簧推开、再小幅回弹。
 * 触屏：点一下等同悬停（再点取消），不需要精确控制指针。
 * 移动端：还原成干净的单列列表（见 globals.css 的 max-width:1023px 分支）。
 *
 * 关键约定：所有「自然感」的值（倾斜 TILT）都是**写死的常量数组**。
 * 用 Math.random() 会让静态导出的 HTML 与 hydration 结果不一致。
 */

/** 每张卡的固定倾斜角，避免牌堆看起来过于机械 */
const TILT = [-2.6, 1.5, -1.1, 2.4, -2.9, 1.2, -1.8];

/** 统一规格：64×64、线稿、1.6 描边，随卡面文字色变化 */
const ICONS: Record<string, ReactNode> = {
  logo: (
    <>
      <circle cx="32" cy="32" r="21" />
      <path d="M25 43V24h11a6 6 0 0 1 0 12h-11" />
    </>
  ),
  brand: (
    <>
      <rect x="9" y="13" width="31" height="31" rx="5" />
      <rect x="24" y="20" width="31" height="31" rx="5" />
    </>
  ),
  event: (
    <>
      <circle cx="32" cy="32" r="7" />
      <path d="M32 6v11M32 47v11M6 32h11M47 32h11" />
      <path d="M14 14l8 8M42 42l8 8M50 14l-8 8M22 42l-8 8" />
    </>
  ),
  pack: (
    <>
      <path d="M32 8l22 12-22 12L10 20 32 8z" />
      <path d="M10 20v22l22 13V33" />
      <path d="M32 33l22 12V22" />
    </>
  ),
  type: (
    <>
      <path d="M14 46l12-30 12 30M19 33h14" />
      <path d="M42 14h16M42 25h16M42 36h16M42 47h10" />
    </>
  ),
  ip: (
    <>
      <circle cx="32" cy="35" r="18" />
      <circle cx="25" cy="31" r="1.7" />
      <circle cx="39" cy="31" r="1.7" />
      <path d="M25 40c2 3 4 4.4 7 4.4S37 43 39 40" />
      <path d="M20 18l-4-7M44 18l4-7" />
    </>
  ),
  misc: (
    <>
      {[14, 32, 50].map((y) =>
        [14, 32, 50].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" />)
      )}
    </>
  ),
};

export function WorksBrowser() {
  const [active, setActive] = useState<number | null>(null);

  /**
   * 卡片被推开的格数：以激活卡为中心，左负右正。
   * 步长递减（1 / 1.2 / 0.9 / 0.4…）：离主角越近让位越多，
   * 远处增速放缓，避免把整排推出版心。
   */
  const STEP = [0, 1, 2.2, 3.1];
  const shiftOf = (i: number) => {
    if (active === null) return 0;
    const d = i - active;
    if (d === 0) return 0;
    const a = Math.abs(d);
    const f = a <= 3 ? STEP[a] : 3.1 + (a - 3) * 0.4;
    return Math.sign(d) * f;
  };

  return (
    <ul className="deck mt-14" onMouseLeave={() => setActive(null)}>
      {WORK_DECKS.map((d, i) => {
        const on = active === i;
        return (
          <li
            key={d.kind}
            className="deck-cell"
            style={{ zIndex: on ? 30 : 10 + i } as CSSProperties}
          >
            <article
              className={cn("deck-card", on && "is-active")}
              style={
                {
                  "--tilt": `${TILT[i % TILT.length]}deg`,
                  "--shift": shiftOf(i),
                } as CSSProperties
              }
              onMouseEnter={() => setActive(i)}
            >
              <div className="deck-face">
                <p className="deck-idx">
                  {d.index}
                  <span className="deck-dot" aria-hidden="true" />
                </p>

                <span className="deck-icon" aria-hidden="true">
                  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.6">
                    {ICONS[d.kind]}
                  </svg>
                </span>

                <div>
                  <h2 className="deck-title">{d.cn}</h2>
                  <p className="deck-en">{d.en}</p>
                  <p className="deck-note">{d.note}</p>
                </div>
              </div>

              {/* 命中层：让整张卡可聚焦 / 可点（正文用标题才是正解，不能把 h2 塞进 button） */}
              <button
                type="button"
                className="deck-hit"
                aria-pressed={on}
                aria-label={`${d.cn} ${d.en}`}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((cur) => (cur === i ? null : cur))}
                onClick={() => setActive(on ? null : i)}
              />
            </article>
          </li>
        );
      })}
    </ul>
  );
}
