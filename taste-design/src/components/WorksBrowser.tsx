"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { WORK_DECKS } from "@/lib/site";
import { BASE } from "@/lib/site";
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

/** 每张卡的固定倾斜角，避免牌堆看起来过于机械（桌面：横向叠放，角度细微） */
const TILT = [-2.6, 1.5, -1.1, 2.4, -2.9, 1.2, -1.8];

/**
 * 窄屏（<1024）竖排时用的倾斜角 —— 一张卡独占一行，细微角度看不出「没理齐」，
 * 所以放大到 1.8~6.4°。⚠ 上限 6.4°：再大倾斜后的包围盒（≈ 卡宽 × 1.17）
 * 就会顶出版心，被 main 的 overflow-x:clip 切掉边角（卡宽的预算见 .deck 的 --mcw）。
 */
const TILT_M = [2.2, -5.2, 4.4, -2.8, 6.4, -4.6, 1.8];

/** 每类一张封面（1000×1500 = 2:3，与卡片同比例零裁切），外链 public/card/ */
const IMG: Record<string, string> = {
  logo: "card_logo_1x.webp",
  brand: "card_brand_1x.webp",
  event: "card_events_1x.webp",
  pack: "card_package_1x.webp",
  type: "card_layout_1x.webp",
  ip: "card_ip_1x.webp",
  misc: "card_other_1x.webp",
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
                  "--tilt-d": `${TILT[i % TILT.length]}deg`,
                  "--tilt-m": `${TILT_M[i % TILT_M.length]}deg`,
                  "--shift": shiftOf(i),
                } as CSSProperties
              }
              onMouseEnter={() => setActive(i)}
            >
              <img
                className="deck-img"
                src={`${BASE}/card/${IMG[d.kind]}`}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              <div className="deck-face">
                <p className="deck-idx">
                  {d.index}
                  <span className="deck-dot" aria-hidden="true" />
                </p>

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
