"use client";

import { useEffect } from "react";

/**
 * 整屏翻页：一次滚轮 / 翻页键 = 一屏。
 *
 * 为什么不能只靠 CSS scroll-snap：`mandatory` 只会吸附到「最近」的吸附点。
 * 一格滚轮约 120~240px，远不到半屏，松手后被拉回原屏 ——
 * 实测首屏 757px 高，要滚够约 380px 才切得过去。
 *
 * 所以这里接管 wheel 与翻页键：一次输入直接送到相邻吸附点。
 * 触屏拖动、滚动条拖拽仍走原生 CSS snap（`mandatory` + `scroll-snap-stop: always`）。
 *
 * 没有 `.screen` 的页面（如 /works）取不到吸附点，自动完全不介入。
 */
export default function FullPageSnap() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let busy = false;
    let lastT = 0;
    let coolUntil = 0;
    let timer = 0;

    /** 吸附点 = 各屏顶部；内容高于视口的屏再补一个「屏底」点，避免中段被锁死 */
    const points = () => {
      const vh = window.innerHeight;
      const out: number[] = [];
      document.querySelectorAll<HTMLElement>(".screen").forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.height < 8) return; // 过滤 0 高的空容器
        const top = Math.round(r.top + window.scrollY);
        out.push(top);
        if (r.height > vh + 8) out.push(Math.round(top + r.height - vh));
      });
      return out
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort((a, b) => a - b);
    };

    const target = (dir: number): number | null => {
      const y = window.scrollY;
      const ps = points();
      if (dir > 0) {
        for (let i = 0; i < ps.length; i++) if (ps[i] > y + 2) return ps[i];
      } else {
        for (let i = ps.length - 1; i >= 0; i--) if (ps[i] < y - 2) return ps[i];
      }
      return null;
    };

    const go = (dir: number) => {
      const t = target(dir);
      if (t === null) return false; // 已经到头
      busy = true;
      const dur = reduce.matches ? 0 : 620;
      coolUntil = performance.now() + dur + 100; // 冷却：动画期间不再接受新输入
      window.scrollTo({ top: t, behavior: reduce.matches ? "auto" : "smooth" });
      timer = window.setTimeout(() => {
        busy = false;
      }, dur + 80);
      return true;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return; // 捏合缩放 / 已被别人处理
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // 横向滚动不接管
      const now = performance.now();
      /* 动画中、冷却中、或同一串惯性滚动的后续事件：吃掉，但不翻页。
         ⚠ lastT 必须在这里也更新：触控板惯性是 8~16ms 间隔的高频事件流，
         若只在放行时更新，冷却一结束惯性尾巴会被误判成「新的一次滚动」而多翻一屏。 */
      if (busy || now < coolUntil || now - lastT < 90) {
        lastT = now;
        e.preventDefault();
        return;
      }
      lastT = now;
      if (!e.deltaY) return;
      if (!go(e.deltaY > 0 ? 1 : -1)) return; // 到头，交回浏览器原生滚动
      e.preventDefault();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable)
        return;
      if (e.key === " " && (tag === "BUTTON" || tag === "A")) return; // 空格激活控件时不抢
      const map: Record<string, number> = {
        PageDown: 1,
        ArrowDown: 1,
        PageUp: -1,
        ArrowUp: -1,
      };
      const d = e.key === " " ? (e.shiftKey ? -1 : 1) : map[e.key];
      if (d === undefined) return;
      if (go(d)) e.preventDefault();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
