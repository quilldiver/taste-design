"use client";

import { useState } from "react";
import { WORK_TYPES } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 作品页骨架。
 * 分类筛选已接好状态，作品数据为空 —— 之后把 WORKS 数组填进来，
 * 网格会直接按 type 过滤，不需要改这里的逻辑。
 */
export function WorksBrowser() {
  const [active, setActive] = useState<string>("all");
  const current = WORK_TYPES.find((t) => t.id === active) ?? WORK_TYPES[0];

  // ↓↓↓ 之后填真实作品数据 ↓↓↓
  const WORKS: Array<{ id: string; type: string }> = [];
  const visible =
    active === "all" ? WORKS : WORKS.filter((w) => w.type === active);

  return (
    <>
      {/* 类型筛选 */}
      <div className="mt-12 border-y border-white/10">
        <div
          className="-mx-5 flex gap-1 overflow-x-auto px-5 py-2 sm:mx-0 sm:px-0"
          aria-label="作品类型"
        >
          {WORK_TYPES.map((t) => {
            const on = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setActive(t.id)}
                className={cn(
                  "flex min-h-[44px] shrink-0 items-center gap-2 rounded-sm px-4 transition-colors duration-200",
                  on
                    ? "bg-ember/12 text-ink"
                    : "text-mute hover:bg-white/5 hover:text-ink"
                )}
              >
                <span>{t.label}</span>
                <span className="font-mono text-[0.66rem] tracking-[0.18em] text-mute">
                  {t.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 作品网格 */}
      <div className="mt-14">
        <p className="font-mono text-[0.7rem] tracking-[0.2em] text-mute">
          {current.labelEn} — {visible.length.toString().padStart(3, "0")} 件
        </p>

        {visible.length === 0 ? (
          <div className="empty-frame mt-6 flex min-h-[28rem] flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="label">Empty — Awaiting Works</p>
            <p className="display text-[clamp(1.5rem,3.2vw,2.4rem)] text-ink/85">
              「{current.label}」还没有出品
            </p>
            <p className="max-w-md text-[0.95rem] text-mute">
              作品数据接入后会按类型在这里自动分组展示。
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((w) => (
              <li key={w.id}>{/* 作品卡片 */}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
