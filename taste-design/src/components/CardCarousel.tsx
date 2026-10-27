"use client";

import { useEffect, useRef } from "react";
import { BASE, WORK_DECKS } from "@/lib/site";

/**
 * 第二屏卡片长卷。离轴透视下保持侧立；悬停时转向镜头，按投影
 * 宽度让邻卡弹性让位，并加入指针倾斜和高光。窄屏使用正面横滑。
 * createCardRailMotion 与单文件交付版保持同一套几何和弹簧参数。
 */

/** kind → 卡图文件名（public/card-3d/，800×1200 webp） */
const IMG: Record<string, string> = {
  logo: "card_logo",
  brand: "card_brand",
  event: "card_events",
  pack: "card_package",
  type: "card_layout",
  ip: "card_ip",
  misc: "card_other",
};

const M = WORK_DECKS.length;
/** 三份循环：屏幕可见 10~11 张，三份足以覆盖，两端不会露空 */
const REPS = 3;
const N = M * REPS;
/** Original 14px corners: four straight edges and four segments per corner. */
const WALLS = Array.from({ length: 20 }, (_, index) => index);

/** Sidewall geometry and material parameters from the supplied Framer reference.
 * Original 8px depth, 14px corners and material. Wider overlaps cover raster seams.
 */
function updateCardSolid(cards: HTMLElement[], width: number, height: number, depth: number) {
  const radius = Math.max(0, Math.min(14, Math.min(width, height) / 2 - .01));
  const segments = radius > 0 ? Math.max(3, Math.ceil(Math.PI / (4 * Math.acos(1 - Math.min(.35 / radius, 1))))) : 0;
  type Point = { x: number; y: number };
  const points: Point[] = [{ x: radius, y: 0 }];
  const walls: { width: string; height: string; marginLeft: string; marginTop: string; transform: string }[] = [];
  let previous = points[0];
  const connect = (next: Point) => {
    const dx = next.x - previous.x, dy = next.y - previous.y;
    const length = Math.hypot(dx, dy);
    if (length >= 1e-5) {
      const ux = dx / length, uy = dy / length;
      const centreX = (previous.x + next.x - width) / 2;
      const centreY = (previous.y + next.y - height) / 2;
      walls.push({
        width: `${length + 1.2}px`, height: `${depth + .8}px`,
        marginLeft: `${-(length + 1.2) / 2}px`, marginTop: `${-(depth + .8) / 2}px`,
        transform: `matrix3d(${ux},${uy},0,0,0,0,1,0,${uy},${-ux},0,0,${centreX},${centreY},0,1)`,
      });
    }
    points.push(next);
    previous = next;
  };
  for (const corner of [
    { x: width - radius, y: radius, start: -Math.PI / 2 },
    { x: width - radius, y: height - radius, start: 0 },
    { x: radius, y: height - radius, start: Math.PI / 2 },
    { x: radius, y: radius, start: Math.PI },
  ]) {
    connect({ x: corner.x + radius * Math.cos(corner.start), y: corner.y + radius * Math.sin(corner.start) });
    for (let step = 1; step <= segments; step++) {
      const angle = corner.start + step / segments * Math.PI / 2;
      connect({ x: corner.x + radius * Math.cos(angle), y: corner.y + radius * Math.sin(angle) });
    }
  }
  const outline = `polygon(${points.map(p => `${p.x}px ${p.y}px`).join(',')})`;
  for (const card of cards) {
    card.style.setProperty('--card-outline', outline);
    const sides = card.querySelectorAll<HTMLElement>('.card3d-wall');
    sides.forEach((side, index) => {
      side.style.display = walls[index] ? 'block' : 'none';
      if (walls[index]) Object.assign(side.style, walls[index]);
    });
  }
}

/** Camera-facing hover, projected clearance and damped motion for the card rail.
 * Geometry is relative to the centre of .band; the perspective origin is the
 * resting card's top edge. Artwork retains its original portrait proportions.
 */
function createCardRailMotion(band: HTMLElement, cards: HTMLElement[], labels: HTMLElement[]) {
  const count = cards.length;
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const hover = cards.map(() => ({ value: 0, speed: 0 }));
  const spread = cards.map(() => ({ value: 0, speed: 0 }));
  let width = 1, height = 1, cardWidth = 1, cardHeight = 1, pitch = 1, distance = 1;
  let compact = false;
  let thickness = 1, lastTime = 0, active = -1, anchor = 0;
  let tiltX = 0, tiltY = 0;
  let activeBounds: { left: number; right: number; top: number; bottom: number } | null = null;

  function measure() {
    const css = getComputedStyle(band);
    width = band.clientWidth;
    height = band.clientHeight;
    const cardStyle = getComputedStyle(cards[0]);
    cardWidth = parseFloat(cardStyle.width);
    cardHeight = parseFloat(cardStyle.height);
    compact = width < 768 || matchMedia('(hover: none) and (pointer: coarse)').matches;
    pitch = cardWidth * (compact ? 1.3 : (parseFloat(css.getPropertyValue('--gap-k')) || .58));
    distance = parseFloat(css.perspective) || cardWidth * 1500 / 380;
    thickness = 8;
    updateCardSolid(cards, cardWidth, cardHeight, thickness);
    activeBounds = null;
  }

  function base(index: number, offset: number) {
    const length = pitch * count;
    const x = (index - (count - 1) / 2) * pitch + offset;
    return ((x + length / 2) % length + length) % length - length / 2;
  }

  function spring(state: { value: number; speed: number }, target: number, dt: number, frequency: number, damping: number, reduced: boolean) {
    if (reduced) { state.value = target; state.speed = 0; return; }
    const steps = Math.max(1, Math.ceil(dt * 120));
    const step = dt / steps;
    for (let n = 0; n < steps; n++) {
      state.speed += ((target - state.value) * frequency * frequency - 2 * damping * frequency * state.speed) * step;
      state.value += state.speed * step;
    }
    if (Math.abs(state.value - target) < .0001 && Math.abs(state.speed) < .001) {
      state.value = target; state.speed = 0;
    }
  }

  function focused(x: number) {
    const z = Math.min(cardWidth / 2 + 24, distance * .3);
    const zoom = distance / (distance - z);
    const top = (height - cardHeight) / 2;
    const scale = Math.min(1, Math.max(.4, (height - top - 22) / (cardHeight * zoom * 1.07)));
    const half = cardWidth * scale * zoom * .58 + 22;
    const centre = clamp(x * zoom, -width / 2 + half, width / 2 - half) / zoom;
    const angle = -Math.atan2(centre, distance - z) * 180 / Math.PI;
    return { x: centre, z, scale, angle };
  }

  function project(x: number, y: number, z: number, angle: number, scale: number) {
    const a = angle * Math.PI / 180;
    const top = (height - cardHeight) / 2;
    let left = Infinity, right = -Infinity, upper = Infinity, lower = -Infinity;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const px = sx * cardWidth * scale / 2;
      const py = sy * cardHeight * scale / 2;
      const pz = sz * thickness * scale / 2;
      const wx = x + px * Math.cos(a) + pz * Math.sin(a);
      const wz = z - px * Math.sin(a) + pz * Math.cos(a);
      const zoom = distance / Math.max(1, distance - wz);
      const xx = width / 2 + wx * zoom;
      const yy = top + (cardHeight / 2 + y + py) * zoom;
      left = Math.min(left, xx); right = Math.max(right, xx);
      upper = Math.min(upper, yy); lower = Math.max(lower, yy);
    }
    return { left, right, top: upper, bottom: lower };
  }

  function pick(clientX: number, clientY: number, offset: number) {
    const rect = band.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    if (x < 0 || x > width || y < 0 || y > height) return -1;
    if (active >= 0 && activeBounds && x >= activeBounds.left - 12 && x <= activeBounds.right + 12 &&
        y >= activeBounds.top - 12 && y <= activeBounds.bottom + 12) return active;
    const top = (height - cardHeight) / 2;
    if (y < top - 64 || y > Math.min(height, top + cardHeight * distance / (distance - cardWidth / 2) + 12)) return -1;
    let nearest = -1, delta = Infinity;
    for (let i = 0; i < count; i++) {
      const dx = Math.abs(base(i, offset) + spread[i].value - (x - width / 2));
      if (dx < delta) { nearest = i; delta = dx; }
    }
    return delta <= pitch * .7 ? nearest : -1;
  }

  function reset() {
    active = -1; anchor = 0; tiltX = tiltY = 0; activeBounds = null; lastTime = 0;
    hover.forEach(s => { s.value = s.speed = 0; });
    spread.forEach(s => { s.value = s.speed = 0; });
  }

  function draw(offset: number, selected: number, clientX: number | null, clientY: number | null, elapsed: number, reduced: boolean) {
    if (compact) selected = -1;
    const now = performance.now();
    const dt = lastTime ? clamp((now - lastTime) / 1000, .001, .05) : 1 / 60;
    lastTime = now;
    if (selected !== active) { active = selected; anchor = active < 0 ? 0 : spread[active].value; }
    let pushLeft = 0, pushRight = 0;
    const activeX = active >= 0 ? base(active, offset) : 0;
    if (active >= 0) {
      const pose = focused(activeX + anchor);
      const bounds = project(pose.x, -12, pose.z, pose.angle, pose.scale * 1.07);
      const front = distance / (distance - cardWidth / 2);
      const back = distance / (distance + cardWidth / 2);
      const left = bounds.left - width / 2 - 28;
      const right = bounds.right - width / 2 + 28;
      pushLeft = Math.min(0, Math.min(left / front, left / back) - thickness / 2 - (activeX - pitch));
      pushRight = Math.max(0, Math.max(right / front, right / back) + thickness / 2 - (activeX + pitch));
    }
    const rect = active >= 0 && clientX !== null && clientY !== null ? band.getBoundingClientRect() : null;
    let pointerX = 0, pointerY = 0;
    if (rect && activeBounds && clientX !== null && clientY !== null) {
      pointerX = clamp(((clientX - rect.left - activeBounds.left) / Math.max(1, activeBounds.right - activeBounds.left) - .5) * 2, -1, 1);
      pointerY = clamp(((clientY - rect.top - activeBounds.top) / Math.max(1, activeBounds.bottom - activeBounds.top) - .5) * 2, -1, 1);
    }
    const ease = reduced ? 1 : 1 - Math.exp(-dt * 14);
    tiltX += (pointerY * -8 - tiltX) * ease;
    tiltY += (pointerX * 9 - tiltY) * ease;
    activeBounds = null;
    for (let i = 0; i < count; i++) {
      const x = base(i, offset);
      const target = active < 0 ? 0 : i === active ? anchor : x < activeX ? pushLeft : pushRight;
      spring(spread[i], target, dt, 15, 1, reduced);
      spring(hover[i], i === active ? 1 : 0, dt, 18, .82, reduced);
      const h = clamp(hover[i].value, 0, 1.035);
      const centre = x + spread[i].value;
      const focus = focused(centre);
      const progress = reduced ? 1 : clamp((elapsed - Math.abs(i - (count - 1) / 2) * 18) / 650, 0, 1);
      const enter = 1 - Math.pow(1 - progress, 3);
      const xx = (centre + (focus.x - centre) * h) * (.12 + .88 * enter);
      const yy = -12 * h + (1 - enter) * 18;
      const zz = focus.z * h - (1 - enter) * cardWidth * .35;
      const angle = compact ? 0 : 90 + (focus.angle - 90) * h;
      const scale = (1 + (focus.scale - 1) * h) * (1 + .07 * h) * (.94 + .06 * enter);
      cards[i].style.transform = `translate3d(${xx.toFixed(3)}px,${yy.toFixed(3)}px,${zz.toFixed(3)}px) rotateY(${angle.toFixed(3)}deg) rotateX(${(tiltX * h).toFixed(3)}deg) rotateY(${(tiltY * h).toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      cards[i].style.opacity = String(progress);
      cards[i].style.zIndex = String(5000 - Math.round(Math.abs(centre)) + Math.round(h * 3000));
      cards[i].style.setProperty('--card-glow', String(h * .32));
      cards[i].style.setProperty('--card-glow-x', `${50 + pointerX * 45}%`);
      cards[i].style.setProperty('--card-glow-y', `${50 + pointerY * 45}%`);
      cards[i].dataset.hover = h.toFixed(4);
      cards[i].dataset.angle = angle.toFixed(3);
      if (i === active) activeBounds = project(xx, yy, zz, angle, scale);
      const dim = clamp(1 - Math.pow(Math.abs(centre) / (width * .65), 2), .18, 1);
      labels[i].style.transform = `translate3d(${centre.toFixed(3)}px,${(-h * 16).toFixed(3)}px,0)`;
      labels[i].style.opacity = String(Math.max(dim, h) * enter);
      labels[i].style.fontSize = '';
    }
  }
  measure();
  return { measure, draw, pick, reset };
}


export default function CardCarousel() {
  const bandRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    const capLayer = capRef.current;
    if (!band || !capLayer) return;
    const cards = Array.from(band.querySelectorAll<HTMLElement>('.card3d'));
    const labels = Array.from(capLayer.querySelectorAll<HTMLElement>('.cards-cap'));
    if (!cards.length || cards.length !== labels.length) return;
    const motion = createCardRailMotion(band, cards, labels);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const root = band.closest<HTMLElement>('.cards-screen');
    let shift = 0, target = 0, hovered = -1, pointerX: number | null = null, pointerY: number | null = null;
    let dragging = false, downX = 0, downShift = 0, travelled = 0;
    const AUTO_SPEED = 18; // px/s，从左向右，悬停或操作后暂停。
    let holdUntil = 0;
    let raf = 0, last = 0, enteredAt = performance.now(), visible = false;
    const draw = () => motion.draw(shift, hovered, pointerX, pointerY, performance.now() - enteredAt, reduce.matches);
    const tick = (now: number) => {
      const dt = Math.min(.05, Math.max(.001, (now - last) / 1000));
      last = now;
      if (!dragging && hovered < 0 && !reduce.matches && now > holdUntil && now - enteredAt > 1000) target += AUTO_SPEED * dt;
      shift = reduce.matches ? target : shift + (target - shift) * (1 - Math.exp(-14 * dt));
      if (Math.abs(target - shift) < .015) shift = target;
      draw();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const onMove = (e: PointerEvent) => {
      pointerX = e.clientX; pointerY = e.clientY;
      if (dragging) {
        const dx = e.clientX - downX;
        travelled = Math.max(travelled, Math.abs(dx));
        if (travelled > 5) { target = downShift + dx; hovered = -1; }
      } else if (e.pointerType !== 'touch') hovered = motion.pick(e.clientX, e.clientY, shift);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (motion.pick(e.clientX, e.clientY, shift) < 0) return;
      dragging = true; downX = e.clientX; downShift = target = shift; travelled = 0;
      band.classList.add('is-drag');
      band.setPointerCapture(e.pointerId);
    };
    const end = (e: PointerEvent, click: boolean) => {
      if (!dragging) return;
      dragging = false; band.classList.remove('is-drag');
      holdUntil = performance.now() + 1800;
      if (band.hasPointerCapture(e.pointerId)) band.releasePointerCapture(e.pointerId);
      if (click && travelled < 6) {
        const index = motion.pick(e.clientX, e.clientY, shift);
        if (index >= 0) {
          const pitch = parseFloat(getComputedStyle(cards[0]).width) * (band.clientWidth < 768 ? 1.3 : .58);
          const length = cards.length * pitch;
          const desired = -(index - (cards.length - 1) / 2) * pitch;
          target = shift + ((desired - shift + length / 2) % length + length) % length - length / 2;
        }
      }
    };
    const onUp = (e: PointerEvent) => end(e, true);
    const onCancel = (e: PointerEvent) => { end(e, false); hovered = -1; };
    const onLeave = () => { hovered = -1; pointerX = pointerY = null; holdUntil = performance.now() + 600; };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      if (motion.pick(e.clientX, e.clientY, shift) < 0 && Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); e.stopPropagation();
      target += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? band.clientWidth : 1);
      hovered = -1; holdUntil = performance.now() + 1800;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      target += (e.key === 'ArrowLeft' ? 1 : -1) * parseFloat(getComputedStyle(cards[0]).width) * (band.clientWidth < 768 ? 1.3 : .58);
      hovered = -1; holdUntil = performance.now() + 1800;
    };
    const onResize = () => { motion.measure(); motion.reset(); hovered = -1; draw(); };
    const resize = new ResizeObserver(onResize);
    resize.observe(band);
    const io = new IntersectionObserver(entries => {
      visible = entries.some(e => e.isIntersecting);
      if (visible) { root?.classList.add('is-live'); enteredAt = performance.now(); motion.reset(); start(); }
      else stop();
    }, { threshold: .08 });
    io.observe(band);
    const onVisibility = () => document.hidden ? stop() : start();
    band.addEventListener('pointermove', onMove);
    band.addEventListener('pointerdown', onDown);
    band.addEventListener('pointerup', onUp);
    band.addEventListener('pointercancel', onCancel);
    band.addEventListener('pointerleave', onLeave);
    band.addEventListener('wheel', onWheel, { passive: false });
    band.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener('change', onResize);
    draw();
    return () => {
      stop(); io.disconnect(); resize.disconnect();
      band.removeEventListener('pointermove', onMove);
      band.removeEventListener('pointerdown', onDown);
      band.removeEventListener('pointerup', onUp);
      band.removeEventListener('pointercancel', onCancel);
      band.removeEventListener('pointerleave', onLeave);
      band.removeEventListener('wheel', onWheel);
      band.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', onResize);
    };
  }, []);


  /** 三份循环的拍平列表：中间那份是语义上的「真」卡，两侧只做视觉延续 */
  const items = Array.from({ length: N }, (_, idx) => ({
    deck: WORK_DECKS[idx % M],
    rep: Math.floor(idx / M),
    idx,
  }));

  return (
    <>
      <div
        ref={bandRef}
        className="band"
        tabIndex={0}
        role="application"
        aria-label="七类出品的三维卡片长卷：左右拖拽或方向键浏览，点击某张移到正中"
      >
        {items.map(({ deck, rep, idx }) => (
          <article
            className="card3d"
            key={idx}
            data-i={idx % M}
            aria-hidden={rep !== 1}
          >
            <div className="card3d-face front">
              <img
                src={`${BASE}/card-3d/${IMG[deck.kind]}.webp`}
                alt={rep === 1 ? deck.cn : ""}
                width={800}
                height={1200}
                decoding="async"
                draggable={false}
              />
            </div>
            {/* 背面：同一张素材图（用户提供的七张卡图），保持正立，不自创版面 */}
            <div className="card3d-face back" aria-hidden="true">
              <img
                src={`${BASE}/card-3d/${IMG[deck.kind]}.webp`}
                alt=""
                width={800}
                height={1200}
                decoding="async"
                draggable={false}
              />
            </div>
            {WALLS.map((cls) => (
              <span key={cls} className="card3d-wall" />
            ))}
          </article>
        ))}
      </div>

      {/* 卡名层：跟着卡左右移动，但不跟着转身（文字进 3D 一转就被压成一条） */}
      <div className="cards-caps" ref={capRef} aria-hidden="true">
        {items.map(({ deck, idx }) => (
          <p className="cards-cap" key={idx}>
            <span className="n">{String((idx % M) + 1).padStart(2, "0")}</span>
            {deck.cn}
          </p>
        ))}
      </div>
    </>
  );
}
