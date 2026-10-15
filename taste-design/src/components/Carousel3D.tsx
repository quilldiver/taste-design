"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BASE } from "@/lib/site";

/**
 * 3D 作品旋转木马 —— 光圈 / 风车结构
 *
 * 复刻 titarvl hero 的真实结构（已用无头浏览器实机渲染核对）：
 *   perspective(1200px) → 整体倾斜 scale + rotateZ + rotateX
 *   → N 张卡片【共用一根中央竖轴】，每张以自身左缘中点为轴心
 *   （transform-origin: 0 50%）依次转开 360/N 度，
 *   叠成"光圈 / 翻开的书页"般的星形，再由 JS 驱动绕轴匀速自转。
 *
 * 注意不是圆柱：卡片没有 translateZ，全部叠在同一根轴上。
 *
 * 正面是真实作品图（外链 public/carousel/，图片规格 1000×1250 即 4:5），
 * 每次加载从 14 张里随机挑 12 张 —— 刷新即换一组，同屏不重复。
 * 背面是实色深底（与参考站一致），不贴图。
 *
 * 交互：匀速自转 + 指针拖拽甩动（带惯性回落）；尊重 prefers-reduced-motion。
 */

/**
 * 盘面图后缀（文件名 3dcarousel_xx.webp）。
 * 图片放在 public/carousel/ 下（Next 不处理 public 内资源的 basePath，
 * 所以 <img src> 必须自己拼 BASE，见下）。
 */
const IMAGES = [
  "01", "02", "03", "04", "05", "06", "07",
  "08", "09", "10", "11", "12", "13", "14",
];

/** Fisher-Yates 洗牌后取前 n 张 */
function pickRandom(arr: readonly string[], n: number) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/**
 * 抽两组随机图：正面一组、背面一组，两面都能看见作品。
 * 同一张卡的正反面撞成同一张时，换到换完两边都不重复的位置。
 */
function pickPair(arr: readonly string[], n: number) {
  const front = pickRandom(arr, n);
  const back = pickRandom(arr, n);
  for (let i = 0; i < n; i++) {
    if (back[i] !== front[i]) continue;
    for (let d = 1; d < n; d++) {
      const k = (i + d) % n;
      if (back[k] !== front[i] && back[i] !== front[k]) {
        [back[i], back[k]] = [back[k], back[i]];
        break;
      }
    }
  }
  return { front, back };
}

/**
 * SSR / 静态导出时没有 window，用 useEffect 兜底避免 React 警告。
 * 客户端走 useLayoutEffect：在首帧绘制前就把随机结果写进去，看不到闪换。
 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type Panel = {
  id: string;
  index: string;
  title: string;
  type: string;
  /** 生成占位视觉用的色相偏移；换成真实资源后可删 */
  hue: number;
};

const PANELS: Panel[] = [
  { id: "p1", index: "001", title: "炉火", type: "BRAND", hue: 38 },
  { id: "p2", index: "002", title: "潮汐", type: "WEB", hue: 212 },
  { id: "p3", index: "003", title: "青苔", type: "GRAPHIC", hue: 168 },
  { id: "p4", index: "004", title: "夜航", type: "WEB", hue: 224 },
  { id: "p5", index: "005", title: "糖霜", type: "PACKAGING", hue: 22 },
  { id: "p6", index: "006", title: "淬火", type: "BRAND", hue: 200 },
  { id: "p7", index: "007", title: "余温", type: "GRAPHIC", hue: 46 },
  { id: "p8", index: "008", title: "深水", type: "WEB", hue: 234 },
  { id: "p9", index: "009", title: "沸点", type: "BRAND", hue: 8 },
  { id: "p10", index: "010", title: "洄游", type: "WEB", hue: 190 },
  { id: "p11", index: "011", title: "焦糖", type: "PACKAGING", hue: 28 },
  { id: "p12", index: "012", title: "静物", type: "GRAPHIC", hue: 260 },
];

const COUNT = PANELS.length;
/** 基础角速度 deg/s（负 = 与参考站同向） */
const BASE_VELOCITY = -9;
const START_ANGLE = -24;
/** 鼠标跟随灵敏度：最大倾斜 ≈ ±SENS/10*180*0.5 度 */
const SENS = 1.1;

export default function Carousel3D({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);

  /* 初始 = 前 N 张确定性顺序：SSR / 无 JS 时也有图可看；
     hydration 后立刻换成随机的一组（绘制前完成，无闪烁） */
  const [face, setFace] = useState<{ front: string[]; back: string[] }>(() => ({
    front: IMAGES.slice(0, COUNT),
    back: IMAGES.slice(0, COUNT).map((_, i) => IMAGES[(i + 6) % IMAGES.length]),
  }));
  useIsoLayoutEffect(() => {
    setFace(pickPair(IMAGES, COUNT));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const fan = fanRef.current;
    if (!root || !fan) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clampV = (v: number) => Math.max(-220, Math.min(220, v));
    let angle = START_ANGLE;
    let velocity = BASE_VELOCITY;
    let dragging = false;
    let lastX = 0;
    let lastMoveT = 0;
    let lastT = 0;
    let raf = 0;
    /* 鼠标倾斜跟随：target 由鼠标位置算，current 用弹簧缓动逼近 */
    let tiltTargetX = 0;
    let tiltTargetY = 0;
    let tiltX = 0;
    let tiltY = 0;

    /**
     * 与 titarvl 所用组件同源的公式（该站在配置里关掉了它，只保留匀速自转）：
     *   rotateX = -((my / h) - 0.5) * k
     *   rotateY =  ((mx / w) - 0.5) * k      其中 k = SENS / 10 * 180
     */
    const onMouseMove = (e: MouseEvent) => {
      const k = (SENS / 10) * 180;
      tiltTargetX = -((e.clientY / window.innerHeight) - 0.5) * k;
      tiltTargetY = ((e.clientX / window.innerWidth) - 0.5) * k;
    };
    const onMouseLeave = () => {
      tiltTargetX = 0;
      tiltTargetY = 0;
    };

    const apply = () => {
      fan.style.transform = `rotateY(${angle}deg)`;
    };

    const tick = (now: number) => {
      const dt = Math.min(now - lastT || 16, 64);
      lastT = now;
      if (!dragging) {
        // 松手后惯性指数回落到基础速度
        velocity += (BASE_VELOCITY - velocity) * Math.min(1, dt * 0.0022);
        angle += (velocity * dt) / 1000;
        apply();
      }
      // 倾斜跟随：弹簧插值，拖拽时也不中断
      if (tiltX !== tiltTargetX || tiltY !== tiltTargetY) {
        const e = Math.min(1, dt * 0.006);
        tiltX += (tiltTargetX - tiltX) * e;
        tiltY += (tiltTargetY - tiltY) * e;
        root.style.setProperty("--fx", `${tiltX.toFixed(2)}deg`);
        root.style.setProperty("--fy", `${tiltY.toFixed(2)}deg`);
      }
      raf = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      velocity = 0;
      lastX = e.clientX;
      lastMoveT = performance.now();
      root.classList.add("dragging");
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* 指针已释放时忽略 */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dt = Math.max(now - lastMoveT, 1);
      const d = dx * 0.35;
      angle += d;
      velocity = clampV((d / dt) * 1000); // 记录瞬时速度供甩动惯性
      lastX = e.clientX;
      lastMoveT = now;
      apply();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("dragging");
    };

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);

    if (reduce.matches) {
      apply(); // 静态构图，不进动画循环
    } else {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("mouseleave", onMouseLeave);
      lastT = performance.now();
      raf = requestAnimationFrame(tick);
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce.matches) {
        lastT = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn("carousel", className)}
      aria-hidden="true" /* 纯装饰，读屏跳过 */
      style={
        {
          "--theta": `${360 / COUNT}deg`,
        } as React.CSSProperties
      }
    >
      <div className="carousel-tilt">
        <div ref={fanRef} className="carousel-fan">
          {PANELS.map((p, i) => (
            <figure
              key={p.id}
              className="carousel-card"
              style={
                {
                  "--i": i,
                  "--hue": p.hue,
                } as React.CSSProperties
              }
            >
              <div className="carousel-face carousel-face-front">
                <div className="carousel-plate" aria-hidden="true">
                  <span className="carousel-plate-blob" />
                  <img
                    className="carousel-plate-img"
                    src={`${BASE}/carousel/3dcarousel_${face.front[i] ?? IMAGES[i]}.webp`}
                    alt=""
                    decoding="async"
                    draggable={false}
                  />
                  <span className="carousel-plate-grain" />
                </div>
                <figcaption className="carousel-caption">
                  <span className="carousel-index">{p.index}</span>
                  <span className="carousel-title">{p.title}</span>
                  <span className="carousel-type">{p.type}</span>
                </figcaption>
              </div>
              <div className="carousel-face carousel-face-back" aria-hidden="true">
                <div className="carousel-plate" aria-hidden="true">
                  <img
                    className="carousel-plate-img"
                    src={`${BASE}/carousel/3dcarousel_${face.back[i] ?? IMAGES[i]}.webp`}
                    alt=""
                    decoding="async"
                    loading="lazy"
                    draggable={false}
                  />
                  <span className="carousel-plate-grain" />
                </div>
                <span className="carousel-back-mark">
                  {p.index} — TASTE DESIGN
                </span>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
