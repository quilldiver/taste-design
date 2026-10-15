"use client";

import { useEffect, useMemo, useRef } from "react";
import { BASE } from "@/lib/site";

/**
 * 3D 品牌球（与 Framer「3D Globe Gallery」同构）
 *
 * 14 个品牌 ×6 = 84 张卡片按 Fibonacci 分布铺满球面，整体匀速自转 + 拖拽惯性；
 * 每张卡片叠两层图：默认 white 版，hover / 点击锁定后 color 版淡入；
 * 默认形态整体 ×GLOBE_SCALE（半径/卡片/透视同乘，观感与放大前同构）；
 * 点击 = 锁定该卡并平滑转到正对观众，同时整个球体放大（倍数已折算，
 * 定格尺寸与放大前一致）并停止自转
 * （定格细看；再点一次 / 拖拽 / Esc 取消后复原并恢复自转）；
 * 键盘：← → 逐张切换，Enter 锁定，↑↓ 调俯仰。
 *
 * 球背面的卡片同样可见：不再隐藏 backface，朝后时内容层 scaleX(-1)
 * 把镜像投影翻回正读；深度驱动 模糊/透明度/缩放 形成景深。
 *
 * 素材在 /public/logo/（28 张 2000×1000 webp / 2:1，white 与 color 各 14；
 * 2026-10-15 起用户把素材改成了 2:1，按要求不做任何降采样/裁切）。
 */

const BRANDS = [
  "baimahe",
  "chao",
  "chongai",
  "chuanhuaxiang",
  "hansen",
  "htinin",
  "huixianlou",
  "jiawu",
  "nochange",
  "petbay",
  "qizhan",
  "soft",
  "uniwoo",
  "youjia",
];

/** 每个品牌在球面上出现的次数（改它即可增减球面密度） */
const REPEAT = 6;

const RAD = Math.PI / 180;
/** 黄金角 ≈ 137.5° */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const MAX_BLUR = 2.8;
/** 基础自转角速度 deg/s */
const BASE_VELOCITY = -6;
/** 默认形态整体放大倍数：半径、卡片尺寸、透视三者同乘一个数，
 *  投影才是纯粹的等比放大（改它同时要改 globals.css 的 perspective: 2550px） */
const GLOBE_SCALE = 1.5;
/** 透视基准（px）= 1700 × GLOBE_SCALE */
const PERSP = 1700 * GLOBE_SCALE;
/** 点击聚焦后整个球体的放大倍数（连同自转一起停住，进入「定格细看」状态）。
 *  基础设定是「相对放大前的默认形态 ×2.5」；默认形态本身已 ×GLOBE_SCALE，
 *  所以这里要折算掉，定格后的卡片尺寸与放大前完全一致 */
const FOCUS_ZOOM_BASE = 2.5;
const FOCUS_ZOOM = FOCUS_ZOOM_BASE / GLOBE_SCALE;
const START_SPIN = -24;
const START_TILT = -8;
/** 入场动画时长：球体由远及近 + 卡片依次弹出 */
const ENTER_MS = 1400;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

type SpherePoint = { lat: number; lon: number };

function spherePoints(n: number): SpherePoint[] {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * i + 1) / n; // 1 → -1，纬度按面积均匀
    return { lat: Math.asin(y), lon: i * GOLDEN };
  });
}

/** 步长 5 与 14 互质：同一品牌的多次出现会被排布拉开，不会扎堆 */
function brandAt(i: number): string {
  return BRANDS[(i * 5) % BRANDS.length];
}

export default function GlobeGallery() {
  const rootRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);

  const N = BRANDS.length * REPEAT;
  const pts = useMemo(() => spherePoints(N), [N]);
  const cards = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        const b = brandAt(i);
        return { key: `${b}-${i}`, brand: b };
      }),
    [N],
  );

  useEffect(() => {
    const root = rootRef.current;
    const spin = spinRef.current;
    if (!root || !spin) return;

    const items = Array.from(spin.children) as HTMLElement[];
    const n = items.length;

    let R = 200;
    /* 与 globals.css 里 @media (min-width: 1280px) 必须一致 */
    const narrow = window.matchMedia("(max-width: 1279.98px)");
    const layout = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      /* 堆叠态（窄屏）半径上限取 h*0.33：×GLOBE_SCALE 后球径 ≈ 0.99h，正好装进槽位、
         不会溢出压到下方文案；桌面态球体本来就该出血，沿用 0.6 */
      const hc = narrow.matches ? 0.33 : 0.6;
      /* 半径下限也要跟着窄屏放低（140→100），并且不能高过槽位本身：
         矮屏（375×667、320×568）槽位只有 300px 上下，沿用 140 会把球钉在 210 半径、
         反而长出槽位压到文案上；取下限 = min(100, h*hc) 就永远不越界 */
      const rMin = narrow.matches ? Math.min(100, h * hc) : 140;
      R = Math.max(rMin, Math.min(w * 0.42, h * hc, 400)) * GLOBE_SCALE;
      /* 卡片尺寸与球面密度联动：84 张时约为半径的 0.32，铺满又不糊在一起。
         ⚠ 上下限也要跟着 GLOBE_SCALE 放大：原上限 130 在 R=540 时会顶住
         （540*0.32=172.8），卡片不跟着变大就成了「球变大但变稀」 */
      const iw = Math.max(52 * GLOBE_SCALE, Math.min(R * 0.32, 130 * GLOBE_SCALE));
      root.style.setProperty("--r", `${R.toFixed(1)}px`);
      root.style.setProperty("--iw", `${iw.toFixed(1)}px`);
      /* 素材 2:1（2000×1000）。+1 抵消左右各 1px 边框：border-box 下内容盒 =
         (iw-2) × (ih-2)，令 ih = iw/2 + 1 时内容盒正好 2:1，contain 完全贴边 */
      root.style.setProperty("--ih", `${(iw * 0.5 + 1).toFixed(1)}px`);
    };
    layout();

    /* 窄屏槽位高度会随 flex 收缩变化（文案变长就压球体），首帧可能读到收缩前的高度，
       ResizeObserver 让半径跟着实际高度重算；写 --r/--iw/--ih 不改变槽位尺寸、不会自我循环 */
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => layout());
      ro.observe(root);
    }

    let spinY = START_SPIN;
    let tiltX = START_TILT;
    let velocity = BASE_VELOCITY;
    let hoverIdx = -1;
    let keyIdx = -1;
    let activeIdx = -1;
    let aimY = 0;
    let aimT = 0;
    let aiming = false;
    /** 聚焦缩放：点击后整球放大，取消后缩回（缓动跟随 zoomT） */
    let zoom = 1;
    let zoomT = 1;
    /** 入场动画：滚进视口时球体由远及近浮出，卡片按球面顺序依次弹出 */
    let entering = true;
    let enterStart = 0;

    /** 聚焦优先级：点击锁定 > 悬停 > 键盘 */
    const focusIdx = () =>
      activeIdx >= 0 ? activeIdx : hoverIdx >= 0 ? hoverIdx : keyIdx;

    const clampT = (v: number) => (v < -42 ? -42 : v > 42 ? 42 : v);
    const norm180 = (a: number) => {
      a %= 360;
      if (a > 180) a -= 360;
      if (a < -180) a += 360;
      return a;
    };
    /** 把某张卡平滑转到正对观众：自转抵消经度、俯仰抵消纬度 */
    const aimAt = (i: number) => {
      const q = pts[i];
      aimY = spinY + norm180(-(q.lon / RAD) - spinY);
      aimT = clampT(-(q.lat / RAD));
      if (reduce.matches) {
        spinY = aimY;
        tiltX = aimT;
        render();
      } else {
        aiming = true;
        velocity = 0;
      }
    };

    const setActive = (i: number) => {
      if (activeIdx >= 0 && items[activeIdx])
        items[activeIdx].classList.remove("is-active");
      activeIdx = i;
      if (i >= 0) {
        items[i].classList.add("is-active");
        aimAt(i);
        zoomT = FOCUS_ZOOM;
      } else {
        aiming = false;
        zoomT = 1; /* 取消：缩回原尺寸，自转由 tick 缓升恢复 */
      }
      if (reduce.matches) {
        zoom = zoomT;
        render();
      }
    };

    const render = () => {
      const s = spinY * RAD;
      const t = tiltX * RAD;
      const cs = Math.cos(s);
      const sn = Math.sin(s);
      const ct = Math.cos(t);
      const st = Math.sin(t);
      /* 入场进度 0→1：球体由远及近，同时转进来一点 */
      let ep = 1;
      if (entering && enterStart) {
        const raw = (performance.now() - enterStart) / ENTER_MS;
        if (raw >= 1) {
          entering = false;
          ep = 1;
        } else ep = raw;
      }
      const eG = easeOut(ep);
      const eScale = 0.76 + 0.24 * eG;
      const eSpin = -34 * (1 - eG);
      spin.style.transform =
        `rotateX(${tiltX.toFixed(2)}deg) rotateY(${(spinY + eSpin).toFixed(2)}deg)` +
        ` scale3d(${eScale.toFixed(3)}, ${eScale.toFixed(3)}, 1)`;
      /* 聚焦缩放：几何等比放大（卡片的 translateZ 与 scale 同步 ×zoom），
         透视距离也 ×zoom —— 投影结果与「整体 2D 放大」完全等价
         （x, z, p 同乘 k ⇒ x·p/(p−z) 同乘 k），球心与聚焦卡的居中位置都不变。
         ⚠ 试过的坑：把 scale 直接放在带 perspective 的 .globe 上，Chrome 对
         「旋转 + translateZ」的卡片只按未放大的尺寸光栅化再拉伸，实测锐度仅 28%；
         写进卡片自身 transform 后达 97%。改回父层缩放会让居中卡片重新变糊。 */
      if (root.dataset.p !== zoom.toFixed(3)) {
        root.style.perspective =
          zoom === 1 ? "" : `${(PERSP * zoom).toFixed(0)}px`;
        root.dataset.p = zoom.toFixed(3);
      }

      const foc = focusIdx();
      const focusMode = activeIdx >= 0;
      for (let i = 0; i < n; i++) {
        const el = items[i];
        const q = pts[i];
        /* 本地球面坐标，与 CSS 的 rotateY(lon) rotateX(lat) translateZ(R) 一致 */
        const cl = Math.cos(q.lat);
        const px = R * cl * Math.sin(q.lon);
        const py = -R * Math.sin(q.lat);
        const pz = R * cl * Math.cos(q.lon);
        /* 依次施加 自转 rotateY(spinY) → 俯仰 rotateX(tiltX) */
        const z1 = -px * sn + pz * cs;
        const z2 = py * st + z1 * ct;
        const d = Math.min(1, Math.max(0, (z2 / R + 1) / 2)); // 0 最远 → 1 最近

        /* 球背面的卡片投影是镜像的，翻回内容层，logo 才不会反着读 */
        const flip = z2 < 0;
        if (el.dataset.f !== String(flip)) {
          el.classList.toggle("flip", flip);
          el.dataset.f = String(flip);
        }

        /* 入场：卡片按球面顺序依次弹出 */
        const ein = easeOut(
          Math.min(1, Math.max(0, ep * 1.55 - (i / n) * 0.45)),
        );

        const foced = i === foc;
        /* 模糊量化到 0.5px 一档，避免每帧都改 filter 触发重绘 */
        let blur = foced
          ? 0
          : Math.round(Math.pow(1 - d, 1.25) * MAX_BLUR * 2) / 2;
        /* 背面也保持可见（0.46 起），只靠模糊和缩放拉开层次 */
        let opacity = foced ? 1 : Math.min(1, 0.46 + 0.54 * Math.pow(d, 0.8));
        let baseScale = (0.76 + 0.26 * d) * (foced ? 1.2 : 1); // 聚焦放大 1.2×
        let tz = R;
        if (focusMode) {
          if (foced) tz = R * 1.1; // 选中卡抬到球面前方居中
          else {
            opacity *= 0.42; // 其余退到景深之外
            blur = Math.min(6, blur + 1.6);
          }
        }
        /* 聚焦缩放：球面半径与卡片尺寸同步 ×zoom（透视已同步放大，投影不变） */
        tz *= zoom;
        baseScale *= zoom;
        opacity *= ein;
        const scale = Math.round(baseScale * (0.45 + 0.55 * ein) * 100) / 100;

        if (el.dataset.b !== String(blur)) {
          el.style.filter = blur ? `blur(${blur}px)` : "none";
          el.dataset.b = String(blur);
        }
        const prevOp = parseFloat(el.dataset.o ?? "-1");
        if (!(Math.abs(prevOp - opacity) <= 0.015)) {
          el.style.opacity = opacity.toFixed(3);
          el.dataset.o = String(opacity);
        }
        if (el.dataset.s !== String(scale) || el.dataset.tz !== String(tz)) {
          el.style.transform =
            `rotateY(${(q.lon / RAD).toFixed(3)}deg) rotateX(${(
              q.lat / RAD
            ).toFixed(3)}deg) translateZ(${tz.toFixed(1)}px) scale(${scale})`;
          el.dataset.s = String(scale);
          el.dataset.tz = String(tz);
        }
      }
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let lastT = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastMoveT = 0;
    let downX = 0;
    let downY = 0;
    let moved = false;
    let downItem: HTMLElement | null = null;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const raw = now - lastT;
      /* 自转只有 6°/s，不必跑满 60fps：限制到约 45fps，
         拖拽 / 转正 / 入场 / 聚焦缩放时不节流，保证跟手 */
      const zooming = Math.abs(zoomT - zoom) > 0.0015;
      if (!dragging && !aiming && !entering && !zooming && raw < 21) return;
      const dt = Math.min(raw || 16, 64);
      lastT = now;
      /* 聚焦缩放：与转正同步推进，观感上像镜头推近 */
      zoom += (zoomT - zoom) * Math.min(1, dt * 0.006);
      if (Math.abs(zoomT - zoom) <= 0.0015) zoom = zoomT;
      if (aiming) {
        /* 点击后：0.6s 左右把选中卡送到正面，中途可以拖拽打断 */
        const k = Math.min(1, dt * 0.006);
        spinY += (aimY - spinY) * k;
        tiltX += (aimT - tiltX) * k;
        if (Math.abs(aimY - spinY) < 0.12 && Math.abs(aimT - tiltX) < 0.12) {
          spinY = aimY;
          tiltX = aimT;
          aiming = false;
          velocity = 0;
        }
      } else if (!dragging && activeIdx < 0) {
        /* 取消聚焦后：角速度从 0 缓升回 BASE_VELOCITY，平滑恢复自转 */
        velocity += (BASE_VELOCITY - velocity) * Math.min(1, dt * 0.0022);
        spinY += (velocity * dt) / 1000;
      } else if (!dragging) {
        velocity = 0; /* 聚焦锁定：完全停转 */
      }
      render();
    };
    /* ⚠ start() 可能被 IntersectionObserver / visibilitychange 多次调用，
       必须先判重 —— 否则会叠出多条 rAF 链，帧成本指数上升 */
    const start = () => {
      if (reduce.matches || raf) return;
      lastT = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      velocity = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      moved = false;
      lastMoveT = performance.now();
      const t = e.target as HTMLElement | null;
      downItem = t?.closest?.(".globe-item") as HTMLElement | null;
      root.classList.add("dragging");
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* 指针已释放 */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      if (
        !moved &&
        Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6
      ) {
        moved = true;
        if (activeIdx >= 0) setActive(-1); /* 一拖就解锁，交还给自由旋转 */
      }
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dt = Math.max(now - lastMoveT, 1);
      spinY += dx * 0.32;
      tiltX = clampT(tiltX - dy * 0.18);
      velocity = Math.max(-260, Math.min(260, ((dx * 0.32) / dt) * 1000));
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveT = now;
      render();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("dragging");
      if (!moved) {
        /* 位移 <6px 视为点击 */
        if (downItem) {
          const i = Number(downItem.dataset.i);
          setActive(activeIdx === i ? -1 : i); /* 再点同一张 = 取消 */
        } else if (activeIdx >= 0) {
          setActive(-1); /* 点空白处取消 */
        }
      }
      downItem = null;
    };
    const onLeave = () => {
      hoverIdx = -1;
    };
    /** 球体在转，卡片会自己移到指针下，所以靠 pointerover 判断 */
    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement)?.closest?.(".globe-item");
      hoverIdx = el ? Number((el as HTMLElement).dataset.i ?? -1) : -1;
    };
    const onOut = (e: Event) => {
      const el = (e.target as HTMLElement)?.closest?.(".globe-item");
      if (el && Number((el as HTMLElement).dataset.i) === hoverIdx) hoverIdx = -1;
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      let handled = true;
      if (k === "ArrowRight" || k === "ArrowLeft") {
        keyIdx = (keyIdx + (k === "ArrowRight" ? 1 : -1) + n) % n;
        if (reduce.matches) render();
        else if (!raf) start();
      } else if (k === "ArrowUp" || k === "ArrowDown") {
        setActive(-1);
        tiltX = clampT(tiltX + (k === "ArrowUp" ? -6 : 6));
        if (reduce.matches) render();
        else if (!raf) start();
      } else if (k === "Enter" || k === " " || k === "Spacebar") {
        setActive(keyIdx >= 0 && activeIdx !== keyIdx ? keyIdx : -1);
      } else if (k === "Escape") {
        setActive(-1);
      } else {
        handled = false;
      }
      if (handled) e.preventDefault();
    };
    const onFocus = () => {
      if (keyIdx < 0) keyIdx = 0;
    };
    const onResize = () => {
      layout();
      render();
    };
    /* 只在球体进入视口时才跑动画：离开视口 / 切到后台就停 rAF */
    let inView = false;
    let entered = false;
    const syncRun = () => {
      if (inView && !document.hidden && !reduce.matches) start();
      else stop();
    };
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          inView = entries[0].isIntersecting;
          if (inView && !entered) {
            entered = true;
            enterStart = performance.now();
          }
          syncRun();
        },
        { threshold: 0.12 },
      );
      io.observe(root);
    } else {
      inView = true;
      entered = true;
      enterStart = performance.now();
    }
    const onVisibility = () => syncRun();

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("keydown", onKey);
    root.addEventListener("focus", onFocus);
    spin.addEventListener("pointerover", onOver);
    spin.addEventListener("pointerout", onOut);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduce.matches) {
      entering = false;
      render();
    } else syncRun();

    return () => {
      io?.disconnect();
      ro?.disconnect();
      stop();
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("keydown", onKey);
      root.removeEventListener("focus", onFocus);
      spin.removeEventListener("pointerover", onOver);
      spin.removeEventListener("pointerout", onOut);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pts]);

  return (
    <div
      ref={rootRef}
      className="globe"
      role="application"
      tabIndex={0}
      aria-label="品牌 logo 组成的 3D 球体：拖拽旋转，点击锁定某张并转正；方向键逐张切换，回车确认，Esc 取消"
    >
      <div ref={spinRef} className="globe-spin">
        {cards.map((c, i) => (
          <div key={c.key} className="globe-item" data-i={i} data-b={c.brand}>
            <div className="gi-in">
              {/* 默认 white 版；hover / 锁定后彩色版淡入（纯 CSS） */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="gi-white"
                src={`${BASE}/logo/logo_${c.brand}_white.webp`}
                alt=""
                decoding="async"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="gi-color"
                src={`${BASE}/logo/logo_${c.brand}_color.webp`}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
