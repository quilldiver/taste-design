"use client";

import { useEffect, useRef } from "react";
import { BASE, WORK_DECKS } from "@/lib/site";

/**
 * 第 2 屏：3D 卡片长卷（对位 Framer「sleeve」实站效果）
 *
 * ★ 几何模型（照参考站逆向出来的，别改回「各转各的角度」）：
 *   所有卡片**恒定 rotateY(90°)**——像一排立着的鳍片/书立，沿 x 轴等距
 *   排开（间距 0.46 卡宽）、z 全为 0。两侧卡片「朝观察者张开」是离轴透视
 *   给的：离屏心越远，视线与鳍片夹角越大，露出的画面越多
 *   （正中 ~15px 书脊 → 边缘 ~70% 画面）。透视原点压在卡片顶边
 *   （见 globals.css .band），顶边水平、底边向后斜——海报墙向后倒。
 *   （第一版按「各转各的角度」做，透视纵深全被人为压平——就是那次返工。）
 *
 * 交互：
 *   · 缓慢自动左移（指针进舞台 / 有卡被悬停 / 系统要求减弱动效 时暂停）
 *   · 拖拽 1:1 跟手，松手带惯性（exp 衰减）
 *   · 点某张 → 平滑移到正中；← → 逐张移一格
 *   · 悬停某张 → 整片沿 z 向镜头浮起 90px
 *
 * 卡名是独立的 2D 层（.cards-caps）：跟着卡左右移动，但不参与 3D。
 *
 * 尺寸全部来自 CSS：--cw 卡宽、--gap-k 间距比，这里只读不写。
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
/** 自动流动速度 px/s */
const AUTO = 26;

/**
 * 入场：一叠收拢的牌在屏心展开成扇。
 * 起点 e=0：所有卡的 translateX 收到终点的 ENT_X 倍（不是 0 —— 收成一条
 * 干净的竖线时前 150ms 几乎是空屏，看不出是牌），z 退 0.5 卡宽、缩到 0.9，
 * 再按卡位散开一点 y 与 ±6° 错落，读作「手里攥着一叠牌」。
 * ENT_D 单张时长、ENT_S 逐张错峰的间隔（按离正中位的卡位数算），
 * 所以是从中间向两边发牌，不是整排一起冲出来。
 */
const ENT_D = 700;
const ENT_S = 24;
const ENT_X = 0.12;
const ENT_Z = 0.5;
const ENT_SC = 0.9;
const ENT_Y = 2.4;

/**
 * 实体盒的 20 面侧壁：4 条直边 + 四角各 4 段圆弧。
 * 弧段用「弦」拼（近端截面的上、下角要顺着圆弧弯进卡面，才读得出一块板）；
 * 弦长 / 角度 / 坐标全是 globals.css 里的常量，这里只出类名、不写数值。
 */
const WALLS: string[] = [
  "v wl",
  "v wr",
  "h wt",
  "h wb",
  ...[1, 2, 3, 4].flatMap((k) =>
    ["tr", "tl", "br", "bl"].map((c) => `a ${c} c${k}`)
  ),
];

export default function CardCarousel() {
  const bandRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    const capLayer = capRef.current;
    if (!band || !capLayer) return;

    const els = Array.from(band.querySelectorAll<HTMLElement>(".card3d"));
    const caps = Array.from(capLayer.querySelectorAll<HTMLElement>(".cards-cap"));
    if (!els.length || els.length !== caps.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ── 尺寸：卡宽 / 间距比都从 CSS 读 ── */
    let cw = 300;
    let gap = 138;
    let span = 1;
    const measure = () => {
      const cs = getComputedStyle(band);
      cw = els[0].offsetWidth || 300;
      const gk = parseFloat(cs.getPropertyValue("--gap-k")) || 0.62;
      gap = cw * gk;
      span = N * gap;
    };

    /** 把任意 x 折进 [-span/2, span/2]：卡片带是无限循环的 */
    const wrap = (x: number) => {
      const v = ((x % span) + span) % span;
      return v > span * 0.5 ? v - span : v;
    };

    let shift = 0;
    let vel = 0;
    let snap: number | null = null;
    let holdUntil = 0;
    let drag = false;
    let moved = 0;
    let lastX = 0;
    let lastT = 0;
    let downT = 0;
    let hoverIdx = -1;
    let over = false;
    const hov = new Array<number>(N).fill(0);

    /* 入场状态：entT = 入场起点（-1 未开始）；entOff = 不做入场（减弱动效）；
       entDone = 已经落位（自动流动要等它，否则一边散开一边漂，落位会偏） */
    let entT = -1;
    let entOff = false;
    let entDone = false;
    const root = band.closest<HTMLElement>(".cards-screen");

    /**
     * 鼠标落在哪张卡上：**按位置算，不靠命中测试**。
     * 正中那张转到 90° 后只剩 11px 宽，指针根本停不上去，
     * 用 e.target.closest('.card3d') 会让中间永远悬停不到。
     */
    const idxAt = (clientX: number) => {
      const r = band.getBoundingClientRect();
      const rel = clientX - r.left - r.width * 0.5;
      const idx = Math.round((rel - shift) / gap + (N - 1) * 0.5);
      return ((idx % N) + N) % N;
    };

    /** 把第 i 张移到正中（取最近的方向，不绕远路） */
    const centerOn = (i: number) => {
      const target = -(i - (N - 1) * 0.5) * gap;
      snap = shift + wrap(target - shift);
      vel = 0;
      /* 置中后停 2.6s：不然刚点正的一瞬间又被自动流动带走，等于没点 */
      holdUntil = performance.now() + 2600;
    };

    const render = () => {
      const vw = band.clientWidth || 1;
      /* 入场走了多久（ms）。entT<0 = 还没开始，按 0 画（收拢态，
         反正 .band 还没 is-live，看不见）；entOff = 不做入场。 */
      const eNow = entOff ? 1e6 : entT < 0 ? 0 : performance.now() - entT;
      /* 让位强度取「正被悬停那张」的过渡值：hoverIdx 换人时两侧让位平滑收回 */
      const hpx = hoverIdx >= 0 ? hov[hoverIdx] : 0;
      /* 被悬停那张自己的位置：让位量要按它算（主循环里它不参与让位） */
      const hx = hoverIdx >= 0 ? wrap((hoverIdx - (N - 1) * 0.5) * gap + shift) : 0;
      /* 两侧让位量不对称，这是几何必然，不是手感调参：
         · 外侧邻卡离屏心远，离轴透视下露出的画面更宽（一侧能露出 100px+），
           所以 hover 卡越靠边，外侧要推得越远（0.31cw → 0.66cw，近似线性）
         · 内侧邻卡贴着屏心，透视几乎不放大它，量恒定在 0.16cw
         · hover 卡前移后投影中心还会向外滑 0.149×|hx|，这一截也由外侧承担
         不做补偿就会「外侧压住邻卡、内侧空一大块」 */
      const ext = cw * 0.4 + Math.abs(hx) * 0.34;
      const inn = Math.max(cw * 0.2, cw * 0.4 - Math.abs(hx) * 0.34);

      for (let i = 0; i < N; i++) {
        let x = wrap((i - (N - 1) * 0.5) * gap + shift);
        const hv = hov[i];

        /* 入场进度：ep 线性 0→1（按离屏心的卡位数错峰），e 是缓出系数 */
        const ord = Math.abs(i - (N - 1) * 0.5);
        const et = eNow - ord * ENT_S;
        const ep = entOff ? 1 : et <= 0 ? 0 : et >= ENT_D ? 1 : et / ENT_D;
        const e = entOff ? 1 : 1 - Math.pow(1 - ep, 3);

        /* 悬停那张把两侧邻卡整体推开，腾出翻转空间（参考站同样做法）。
           基础量 0.31×卡宽：翻转卡前移后被透视放大到 ~1.22×卡宽，半宽 0.61，
           减掉基础间距 0.46 余 ~34px 缝（与参考站实测一致）。
           整段等量平移，相邻卡中心距仍 = gap，不会叠 */
        if (hpx > 0.001 && i !== hoverIdx) {
          let k = i - hoverIdx;
          if (k > N * 0.5) k -= N;
          else if (k < -N * 0.5) k += N;
          if (k !== 0) {
            const dir = k > 0 ? 1 : -1;
            const outer = dir === (hx >= 0 ? 1 : -1); /* 与 hover 卡同侧 = 外侧 */
            x += dir * hpx * (outer ? ext : inn);
          }
        }

        /* 翻转：平时恒定 90°（侧对鳍片，一切交给离轴透视）；
           悬停时转到正对观察者 —— 左半屏 0°（正面），右半屏 180°（背面）。
           两面同一张图且都是正立的，左右扫过去看到的是同一幅画面。 */
        const tgt = x <= 0 ? 0 : 180;
        const ang = 90 + (tgt - 90) * hv;
        const z = hv * cw * 0.52;
        const sc = 1 + hv * 0.06;
        els[i].style.transform =
          `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${ang.toFixed(2)}deg) scale(${sc.toFixed(3)})`;

        /* ★ 绘制顺序（修「右边卡片层叠错误」的根）：.band 是平面合成，
           卡与卡不进同一个 3D 渲染上下文，浏览器只按 DOM 顺序画 —— DOM 按 x
           升序建，于是左半屏碰巧正确、右半屏外侧卡反而压住内侧卡。
           几何上正确顺序是「离屏心越近越在前」，所以每帧按 |x| 写 z-index；
           悬停那张额外 +1000 垫到最顶（它前移 0.52 卡宽，本就是离镜头最近的）。 */
        els[i].style.zIndex = String(5000 + (i === hoverIdx ? 1000 : 0) - Math.round(Math.abs(x)));

        /* 卡名：只跟随位置，不参与 3D。衰减用二次曲线：
           线性时中间三四个就已经淡到看不清，二次能让正中一片都很实 */
        const d = Math.abs(x) / (vw * 0.5);
        const o = Math.max(0, 1 - d * d * 1.15);
        /* 卡名挂在卡片上方：悬停卡放大后顶边实测只向上长 ~13px
           （卡高对称外扩，大头长在下边），抬 0.075×卡宽 ≈ 18px 就够 */
        caps[i].style.transform = `translate3d(${x.toFixed(2)}px,${(-hv * cw * 0.075).toFixed(2)}px,0)`;
        caps[i].style.opacity = Math.max(o, hv).toFixed(3);
      }
    };

    let raf = 0;
    let last = 0;
    let running = false;
    let entered = false;

    const tick = (now: number) => {
      const dt = Math.min(Math.max(now - last, 1), 64);
      last = now;
      if (!drag) {
        if (snap !== null) {
          const dd = snap - shift;
          shift += dd * (1 - Math.exp(-dt / 110));
          if (Math.abs(dd) < 0.3) {
            shift = snap;
            snap = null;
          }
        } else if (Math.abs(vel) > 5) {
          shift += (vel * dt) / 1000;
          vel *= Math.exp(-dt / 300);
          if (Math.abs(vel) <= 5) vel = 0;
        } else if (!over && now > holdUntil && !reduce.matches && hoverIdx < 0) {
          shift -= (AUTO * dt) / 1000;
        }
      }
      /* shift 只在 [-span, span] 里活动，避免长时间累积的浮点漂移 */
      if (shift < -span) shift += span;
      else if (shift > span) shift -= span;

      for (let i = 0; i < N; i++) {
        const want = i === hoverIdx ? 1 : 0;
        /* 190ms 时间常数：翻转看得清（太快像硬切） */
        hov[i] += (want - hov[i]) * Math.min(1, dt / 190);
        if (Math.abs(hov[i] - want) < 0.002) hov[i] = want;
      }
      render();
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      if (!entered) {
        entered = true;
        /* 入场：从右侧小半步滑进来坐定，别让第一帧就是硬切 */
        if (!reduce.matches) {
          shift = gap * 1.4;
          snap = 0;
          render();
        }
      }
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    /* ── 拖拽 / 点击 ── */
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      drag = true;
      moved = 0;
      vel = 0;
      snap = null;
      hoverIdx = -1;
      lastX = e.clientX;
      lastT = performance.now();
      downT = lastT;
      band.classList.add("is-drag");
      try {
        band.setPointerCapture(e.pointerId);
      } catch {
        /* 指针已释放 */
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!drag) {
        hoverIdx = idxAt(e.clientX);
        return;
      }
      const now = performance.now();
      const dx = e.clientX - lastX;
      shift += dx;
      moved += Math.abs(dx);
      vel = (dx / Math.max(now - lastT, 1)) * 1000;
      lastX = e.clientX;
      lastT = now;
      render();
    };

    const endDrag = (e: PointerEvent, click: boolean) => {
      if (!drag) return;
      drag = false;
      band.classList.remove("is-drag");
      holdUntil = performance.now() + 1800;
      if (click && moved < 8 && performance.now() - downT < 450) {
        centerOn(idxAt(e.clientX));
      }
    };
    const onUp = (e: PointerEvent) => endDrag(e, true);
    const onCancel = (e: PointerEvent) => endDrag(e, false);

    const onEnter = () => {
      over = true;
    };
    const onLeave = () => {
      over = false;
      hoverIdx = -1;
      caps.forEach((c) => (c.style.opacity = "0"));
    };

    const onKey = (e: KeyboardEvent) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < N; i++) {
        const x = Math.abs(wrap((i - (N - 1) * 0.5) * gap + shift));
        if (x < bd) {
          bd = x;
          best = i;
        }
      }
      centerOn(best + d);
    };

    band.addEventListener("pointerdown", onDown);
    band.addEventListener("pointermove", onMove);
    band.addEventListener("pointerup", onUp);
    band.addEventListener("pointercancel", onCancel);
    band.addEventListener("pointerenter", onEnter);
    band.addEventListener("pointerleave", onLeave);
    band.addEventListener("keydown", onKey);

    let rz = 0;
    const onResize = () => {
      window.clearTimeout(rz);
      rz = window.setTimeout(() => {
        measure();
        render();
      }, 120);
    };
    window.addEventListener("resize", onResize, { passive: true });

    measure();
    render();

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (es) => (es[0].isIntersecting ? start() : stop()),
        { threshold: 0.08 },
      );
      io.observe(band);
    } else {
      start();
    }
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(rz);
      io?.disconnect();
      band.removeEventListener("pointerdown", onDown);
      band.removeEventListener("pointermove", onMove);
      band.removeEventListener("pointerup", onUp);
      band.removeEventListener("pointercancel", onCancel);
      band.removeEventListener("pointerenter", onEnter);
      band.removeEventListener("pointerleave", onLeave);
      band.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
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
              <span key={cls} className={`card3d-wall ${cls}`} />
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
