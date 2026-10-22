"use client";

import { useEffect, useRef } from "react";
import { BASE } from "@/lib/site";

/**
 * RING —— 持续自转的 3D 图片环
 *
 * 结构、尺寸、材质全部照抄 Framer Marketplace / RING（https://ring.framer.me/ 实测）：
 *
 *   perspective 1200px / perspective-origin 50% 50%
 *   底座俯角 rotateX(-7deg)
 *   卡片 140×100、圆角 12px、半径 450px、40 张、每张步进 9°
 *   关键一步：卡片推到半径上之后还要再 rotateY(90deg) —— 卡面**沿着切线**而不是
 *   法线朝外。所以正对镜头的那张是「立着的刀刃」（画面中间那道缝），
 *   真正看清的是一路斜向两侧退开的卡面，形成左右两片扇形。
 *   再配 backface-visibility:hidden：背向镜头的卡直接不画，
 *   于是环的后半圈是透的，只剩前面半圈 —— 这是 RING 最显著的特征。
 *
 * 四层（顺序不能换）：
 *   .ring          透视容器 + 裁切（原版就是 overflow:hidden 满屏裁）
 *   .ring-plane    底座俯角，入场时从 -73° 立起来
 *   .ring-yaw      光标视差（rotateX / rotateY）
 *   .ring-wheel    只有它在自转，卡片方位角是静态的
 *
 * 尺寸只有一个真源：--h（盒子高）⇒ --u = 原版 1px。内部全用 calc(n * var(--u))，
 * 改高度即整体等比缩放，透视也跟着缩，形变比例永远和原版一致。
 */

/** works/ 里均匀抽的 40 张（已裁成 1.4:1、480px 宽的缩略图，见 public/ring/） */
const IMAGES = [
  "004", "008", "010", "013", "016", "019", "021", "024", "027", "030",
  "033", "036", "039", "041", "044", "047", "049", "052", "055", "058",
  "060", "063", "066", "070", "072", "075", "078", "080", "083", "086",
  "089", "092", "095", "099", "101", "104", "108", "111", "113", "116",
];

const COUNT = IMAGES.length;
const STEP = 360 / COUNT;

/** 原版实测：约 4°/s 匀速（逆时针） */
const BASE_VELOCITY = -4;
/** 拖拽手感：水平位移 → 角度，0.4 ≈ 手感比 1:1 稍钝，不会一碰就飞 */
const DRAG = 0.4;
/** 光标视差：原版 Yaw / Tilt 都在 ±6° 左右 */
const YAW = 6;
const TILT = 6;

export default function Ring3D({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const wheel = wheelRef.current;
    if (!root || !wheel) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clampV = (v: number) => Math.max(-400, Math.min(400, v));
    let angle = 0;
    let velocity = BASE_VELOCITY;
    let dragging = false;
    let lastX = 0;
    let lastMoveT = 0;
    let lastT = 0;
    let raf = 0;
    let yawT = 0;
    let tiltT = 0;
    let yaw = 0;
    let tilt = 0;

    const apply = () => {
      wheel.style.transform = `rotateY(${angle.toFixed(2)}deg)`;
    };

    const tick = (now: number) => {
      const dt = Math.min(now - lastT || 16, 64);
      lastT = now;
      if (!dragging) {
        // 松手后惯性指数回落到匀速
        velocity += (BASE_VELOCITY - velocity) * Math.min(1, dt * 0.002);
        angle += (velocity * dt) / 1000;
        apply();
      }
      if (Math.abs(yaw - yawT) > 0.01 || Math.abs(tilt - tiltT) > 0.01) {
        const e = Math.min(1, dt * 0.005);
        yaw += (yawT - yaw) * e;
        tilt += (tiltT - tilt) * e;
        root.style.setProperty("--yaw", `${yaw.toFixed(2)}deg`);
        root.style.setProperty("--tilt", `${tilt.toFixed(2)}deg`);
        // 负倾角（光标在下半屏）会把环的近端压低，按 9u/度 同量抬回去
        // （6° 时下端要抬 62u 才不贴屏幕底；取 54u 是因为再抬就顶到上方文案）
        root.style.setProperty("--lift", (tilt < 0 ? -tilt * 9 : 0).toFixed(1));
      }
      raf = requestAnimationFrame(tick);
    };

    const onMouseMove = (e: MouseEvent) => {
      yawT = (e.clientX / window.innerWidth - 0.5) * 2 * YAW;
      tiltT = (0.5 - e.clientY / window.innerHeight) * 2 * TILT;
    };
    const onMouseLeave = () => {
      yawT = 0;
      tiltT = 0;
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
        /* 指针已释放 */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const d = (e.clientX - lastX) * DRAG;
      angle += d;
      velocity = clampV((d / Math.max(now - lastMoveT, 1)) * 1000);
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
      apply();
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
    <div ref={rootRef} className={`ring${className ? ` ${className}` : ""}`} aria-hidden="true">
      <div className="ring-plane">
        <div className="ring-yaw">
          <div ref={wheelRef} className="ring-wheel">
            {IMAGES.map((img, i) => (
              <div
                key={img}
                className="ring-slot"
                style={{ "--i": i, "--ang": `${i * STEP}deg` } as React.CSSProperties}
              >
                <div className="ring-face">
                  <img
                    className="ring-photo"
                    src={`${BASE}/ring/${img}.webp`}
                    alt=""
                    width={640}
                    height={457}
                    decoding="async"
                    loading={i < 10 ? "eager" : "lazy"}
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
