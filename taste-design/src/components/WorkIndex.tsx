"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BASE } from "@/lib/site";
import { SECTIONS, WORKS } from "@/lib/works";
import { cn } from "@/lib/utils";

/**
 * 「作品」二级页 —— 左中右三栏的作品索引。
 *
 * 版式取自《排版参考》：
 *   ┌ 一级菜单（英文大字 + 中文小字）
 *   │   └ 二级菜单（内联手风琴，缩进 21px，跟着展开的一级往下排）
 *   ├ 三级菜单（当前二级下的作品，垂直居中）
 *   └ 图片流（当前作品的详情页，一张接一张往下滚）
 *
 * ⚠ 三栏的显示规则：没有二级就不渲染二级列；没有作品就不渲染三级列。
 *
 * ⚠ 右侧图片流里放的是**全部作品**（按原作品集页码升序），
 *   所以「滚到底自然接下一个作品」是数据结构本身的性质，不需要任何拼接逻辑；
 *   反过来说，滚动位置才是唯一的状态源 —— 菜单的高亮由滚动反推出来。
 *
 * ⚠ 状态只有一个 workIdx：一级 / 二级 / 三级的高亮全部由它派生，
 *   避免三套状态互相打架（点一级跳过去、滚回来又对不上）。
 */

/** SSR 期不能用 useLayoutEffect（会警告），用这个同构版本 */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const NARROW_Q = "(max-width: 1023.98px)";

/** 图片流里「读到哪儿」的判定线：视口高度从这个比例处切一刀，落在哪个作品就是哪个 */
const READ_LINE = 0.42;

export function WorkIndex({ slug }: { slug: string }) {
  const startSec = Math.max(
    0,
    SECTIONS.findIndex((s) => s.slug === slug),
  );

  const [workIdx, setWorkIdx] = useState(() => SECTIONS[startSec].works[0]);
  const [narrow, setNarrow] = useState(false);
  /** 图片流顶上的黑渐变：往下滚过才出现（见 sync / .is-scrolled） */
  const [scrolled, setScrolled] = useState(false);
  /** 只用来在「字体替换完 / 首帧排版完成」后再触发一次菜单归位 */
  const [tick, setTick] = useState(0);

  const navRef = useRef<HTMLDivElement | null>(null);
  const l1Ref = useRef<HTMLOListElement | null>(null);
  const l2RowRef = useRef<HTMLOListElement | null>(null);
  const l3Ref = useRef<HTMLOListElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const workRefs = useRef<Array<HTMLElement | null>>([]);
  /** 每个作品在滚动容器里的 [offsetTop, offsetHeight]，尺寸变化时重算 */
  const offs = useRef<Array<[number, number]>>([]);
  const raf = useRef(0);
  /** 给 measure 用的当前作品（useCallback 闭包里读不到最新 state） */
  const atRef = useRef(0);
  /** 上一次量到的图片流宽度：宽度变了才需要把视图重新锚回同一个作品 */
  const lastW = useRef(0);
  /** 程序化滚动（点菜单）期间锁住「滚动反推」，免得高亮从中间的作品一路闪过去 */
  const lock = useRef<{ top: number; until: number } | null>(null);

  const cur = WORKS[workIdx];
  const sec = cur.sec;
  const grp = cur.grp;
  const section = SECTIONS[sec];
  const hasL2 = section.groups[0] !== null;
  atRef.current = workIdx;

  /** 三级菜单的内容：有二级 ⇒ 当前二级的作品；没有二级 ⇒ 该一级的全部作品 */
  const l3 = useMemo(
    () => (hasL2 ? section.works.filter((w) => WORKS[w].grp === grp) : section.works),
    [hasL2, section, grp],
  );

  const measure = useCallback(() => {
    const feed = feedRef.current;
    offs.current = workRefs.current.map((el) =>
      el ? [el.offsetTop, el.offsetHeight] : [0, 0],
    );
    if (!feed) return;
    /* 宽度变了 ⇒ 每张图的高度全变 ⇒ 原来的 scrollTop 会落到别的作品上。
       把视图重新锚回当前作品，否则旋屏 / 拉窗口时菜单会和画面对不上。 */
    const w = feed.clientWidth;
    const changed = lastW.current > 0 && Math.abs(w - lastW.current) > 1;
    lastW.current = w;
    if (!changed) return;
    const el = workRefs.current[atRef.current];
    if (el) feed.scrollTop = Math.max(0, el.offsetTop - 10);
  }, []);

  /** 滚动 → 反推当前作品 */
  const sync = useCallback(() => {
    const feed = feedRef.current;
    if (!feed) return;
    /* 图片流顶上的黑渐变：**第一个作品被卷到视口之上后才出现**。
       ⚠ 阈值必须用「第一个作品的 offsetTop」而不是 0：进页时图片流本身就会带上
       `offsetTop-10` 的偏移（logo 页是 10px），拿 0 判定会让首屏一进来就挂着黑幕。
       读的是缓存好的 offs 表、不读 offsetTop ⇒ 不会在滚动里强制重排。
       相同值返回原引用 ⇒ React 直接 bailout，不会每帧重渲染。 */
    const wantShade = feed.scrollTop > (offs.current[0]?.[0] ?? 0) + 2;
    setScrolled((p) => (p === wantShade ? p : wantShade));
    const l = lock.current;
    if (l) {
      /* 锁到「确实滚到目标」为止，另加一个超时兜底（目标可能被 maxScroll 夹住） */
      if (performance.now() < l.until && Math.abs(feed.scrollTop - l.top) > 3) return;
      lock.current = null;
    }
    const y = feed.scrollTop + feed.clientHeight * READ_LINE;
    const arr = offs.current;
    let hit = 0;
    for (let k = 0; k < arr.length; k++) {
      if (arr[k][0] <= y) hit = k;
      else break;
    }
    /* 滚到底：最后一个作品往往整段都落在判定线以下（视口越矮越明显），
       但用户已经滚无可滚 —— 直接把它算作当前，顺便消掉
       「桌面高亮末件、手机高亮倒数第二件」的不一致 */
    if (feed.scrollTop >= feed.scrollHeight - feed.clientHeight - 1) {
      hit = arr.length - 1;
    }
    setWorkIdx((p) => (p === hit ? p : hit));
  }, []);

  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      sync();
    });
  }, [sync]);

  /** 点菜单：立刻切换高亮，同时把图片流滚到那个作品 */
  const jump = useCallback((i: number) => {
    const feed = feedRef.current;
    const el = workRefs.current[i];
    setWorkIdx(i);
    if (!feed || !el) return;
    const top = Math.max(0, el.offsetTop - 10);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      feed.scrollTop = top;
      return;
    }
    lock.current = { top, until: performance.now() + 1400 };
    feed.scrollTo({ top, behavior: "smooth" });
  }, []);

  /* 进场 / 路由换到另一个一级：量一次尺寸，把图片流直接落到该一级的第一个作品 */
  useIsoLayoutEffect(() => {
    measure();
    const i = SECTIONS[startSec].works[0];
    setWorkIdx(i);
    lock.current = null;
    const feed = feedRef.current;
    const el = workRefs.current[i];
    if (feed && el) feed.scrollTop = Math.max(0, el.offsetTop - 10);
    /* 赋值没真的改变 scrollTop 就不会派发 scroll 事件 ⇒ 黑渐变状态在这里补一刀 */
    if (feed) setScrolled(feed.scrollTop > (offs.current[0]?.[0] ?? 0) + 2);
  }, [startSec, measure]);

  /* 宽度变化 ⇒ 图片高度全变 ⇒ 偏移表必须重算 */
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(feed);
    return () => ro.disconnect();
  }, [measure]);

  /* 窄屏换成三行横向 chips，DOM 结构与桌面不同，所以得知道断点 */
  useIsoLayoutEffect(() => {
    const mq = window.matchMedia(NARROW_Q);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  /* 首帧排版完成 / 字体替换完（会改变 chips 宽度）后再归位一次菜单 */
  useEffect(() => {
    const r = requestAnimationFrame(() => setTick((t) => t + 1));
    document.fonts?.ready.then(() => setTick((t) => t + 1));
    return () => cancelAnimationFrame(r);
  }, []);

  /**
   * ⚠ 归位不能只绑在「状态变化」上 —— 实测坑：移动端布局视口先用 980px 起算
   * （<meta viewport> 生效前 innerWidth=980），那一刻 7 个一级 chip 一共 818px
   * 还没溢出（scrollWidth ≤ clientWidth），归位算出 0；随后视口落到设备宽度、
   * chips 才真的溢出，但没有任何 React 状态变化去重跑它，激活项就永远停在屏幕外。
   * 视口落定会派发 resize，所以这里用 rAF 节流地把 tick 推一格让归位重算。
   * 归位只写 scrollLeft、不触发 resize ⇒ 不会自我循环。
   */
  useEffect(() => {
    let id = 0;
    const on = () => {
      if (id) return;
      id = requestAnimationFrame(() => {
        id = 0;
        setTick((t) => t + 1);
      });
    };
    window.addEventListener("resize", on, { passive: true });
    return () => {
      window.removeEventListener("resize", on);
      cancelAnimationFrame(id);
    };
  }, []);

  /**
   * 手风琴展开要 0.42s（--wd-acc）。上面那次归位量到的还是「没展开」的几何，
   * 新展开的二级会整段落在面板外 —— 动画走完再归位一次。
   */
  useEffect(() => {
    const t = window.setTimeout(() => setTick((x) => x + 1), 470);
    return () => window.clearTimeout(t);
  }, [sec]);

  /**
   * 把当前项带进视野。
   * 窄屏三行 chips 都是横向滚动的，激活项经常在屏幕外（比如从 works/other 进页，
   * 一级行里 Other 在最右），不归位就等于「进来就看不见自己在哪」。
   * 桌面要看的是「整块」：一级项 + 它展开出来的二级 —— 只盯按钮的话，
   * 二级展开后整段会落在面板底下还是看不见。
   * ⚠ 依赖 .wd-* 上的 scroll-behavior:auto，否则 += 是异步的、读了等于没读。
   */
  useIsoLayoutEffect(() => {
    const onLi = l1Ref.current?.querySelector<HTMLElement>(".wd-l1li.is-on");
    const on = onLi?.querySelector<HTMLElement>(".wd-l1b") ?? null;
    const nav = navRef.current;
    if (!narrow) {
      /* 桌面要看的是「整块」：一级项 + 它展开出来的二级 —— 只盯按钮的话，
         二级展开后整段会落在面板底下还是看不见。
         ⚠ 整块比面板还高时只对齐顶部 —— 否则「对下沿」把顶部顶出去、
         下一帧又「对上沿」，两帧来回拉成抖动。 */
      if (nav && onLi) {
        const nb = nav.getBoundingClientRect();
        const ob = onLi.getBoundingClientRect();
        const pd = 8;
        if (ob.height > nb.height - pd * 2 || ob.top < nb.top + pd)
          nav.scrollTop += ob.top - nb.top - pd;
        else if (ob.bottom > nb.bottom - pd) nav.scrollTop += ob.bottom - nb.bottom + pd;
      }
      return;
    }
    const targets = [
      on,
      l2RowRef.current?.querySelector<HTMLElement>(".wd-l2b.is-on"),
      l3Ref.current?.querySelector<HTMLElement>(".wd-l3b.is-on"),
    ];
    for (const el of targets) {
      const ol = el?.closest("ol");
      if (!el || !ol) continue;
      const b = ol.getBoundingClientRect();
      if (!b.width) continue;
      /* 用「绝对位置」而不是 +=：重建面板会把 scrollLeft 清零，
         相对累加碰上归零的 scrollLeft 就等于没滚 */
      const at = el.getBoundingClientRect().left - b.left + ol.scrollLeft;
      const want = at - (ol.clientWidth - el.getBoundingClientRect().width) / 2;
      const max = Math.max(0, ol.scrollWidth - ol.clientWidth);
      ol.scrollLeft = Math.max(0, Math.min(want, max));
    }
  }, [narrow, workIdx, sec, grp, l3, tick]);

  const l2 = hasL2 ? section.groups : [];

  /* 图片流一次性建好后再也不重建 —— 每次滚动都重渲染 52 个作品 / 108 张图太亏，
     而且 React 每次 diff 都会碰这 160 个节点。 */
  const feed = useMemo(
    () =>
      WORKS.map((w, i) => (
        <article
          key={w.id}
          className="wd-work"
          ref={(el) => {
            workRefs.current[i] = el;
          }}
        >
          {/* 只留标题：原作品集页码（P7-P9 之类）是内部标记，不上页面 */}
          <p className="wd-cap">
            <span className="wd-cap-t">{w.title}</span>
          </p>
          {w.imgs.map((im, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${im.file}-${k}`}
              className="wd-img"
              src={`${BASE}/works/${im.file}`}
              width={im.w}
              height={im.h}
              alt={`${w.title} 第 ${k + 1} 张`}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          ))}
        </article>
      )),
    [],
  );

  return (
    <div className="wdetail">
      {/* 版心：与导航 / 第 3 屏同一套 max-width + padding，三栏全在它之内 */}
      <div className="wd-in">
        {/* ── 一级 + 二级 ── */}
        <div className="wd-nav" ref={navRef}>
          <div className="wd-nav-in">
            <ol className="wd-l1" ref={l1Ref}>
              {SECTIONS.map((s, si) => {
                const on = si === sec;
                /* 有二级的一级**永远**把二级挂在 DOM 里，展开/收起只切 .is-open：
                   条件渲染的话元素是「新出现」的，grid-template-rows 的过渡根本
                   不会播。窄屏由 CSS 整条 display:none，改用下面那行横向 chips。 */
                const kids = s.groups[0] !== null;
                return (
                  <li
                    key={s.slug}
                    className={cn("wd-l1li", on && "is-on", on && kids && "is-open")}
                  >
                    <button
                      type="button"
                      className="wd-l1b"
                      aria-current={on ? "true" : undefined}
                      aria-expanded={kids ? on : undefined}
                      aria-controls={kids ? `wd-l2-${s.slug}` : undefined}
                      onClick={() => jump(s.works[0])}
                    >
                      <span className="wd-en">{s.en}</span>
                      <span className="wd-cn">{s.cn}</span>
                    </button>

                    {kids && (
                      <ol className="wd-l2" id={`wd-l2-${s.slug}`}>
                        {s.groups.map((g, gi) => (
                          <li key={g}>
                            <button
                              type="button"
                              className={cn("wd-l2b", gi === grp && "is-on")}
                              aria-current={gi === grp ? "true" : undefined}
                              onClick={() => jump(s.works.find((w) => WORKS[w].grp === gi)!)}
                            >
                              {g}
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>

            {narrow && l2.length > 0 && (
              <ol className="wd-l2 wd-l2row" ref={l2RowRef}>
                {l2.map((g, gi) => (
                  <li key={g}>
                    <button
                      type="button"
                      className={cn("wd-l2b", gi === grp && "is-on")}
                      aria-current={gi === grp ? "true" : undefined}
                      onClick={() => jump(section.works.find((w) => WORKS[w].grp === gi)!)}
                    >
                      {g}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ── 三级 ── */}
        {l3.length > 0 && (
          <nav className="wd-list" aria-label="作品">
            <ol className="wd-l3" ref={l3Ref}>
              {l3.map((i) => (
                <li key={WORKS[i].id}>
                  <button
                    type="button"
                    className={cn("wd-l3b", i === workIdx && "is-on")}
                    aria-current={i === workIdx ? "true" : undefined}
                    onClick={() => jump(i)}
                  >
                    {WORKS[i].title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* ── 图片流：全部作品首尾相接，滚到底就是下一个作品 ──
            外面这层 wrap 只为托住覆盖层（Liquid Scroll 渐进模糊 + 滚动黑渐变）。
            ⚠ 覆盖层必须在**滚动容器外面**，否则会跟着内容一起滚走。 */}
        <div className={cn("wd-feed-wrap", scrolled && "is-scrolled")}>
          <div
            className="wd-feed"
            ref={feedRef}
            onScroll={onScroll}
            role="region"
            aria-label="作品图片"
            /* 可滚动区域要能键盘聚焦，否则键盘用户滚不动它 */
            tabIndex={0}
          >
            <div className="wd-feed-in">{feed}</div>
          </div>
          {/* 6 层模糊 + 1 层黑渐变；层参数全在 globals.css 的 .wd-lq 段落里 */}
          <div className="wd-lq" aria-hidden="true">
            <div className="wd-lq-band wd-lq-t">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span className="wd-lq-tint" />
            </div>
            <div className="wd-lq-band wd-lq-b">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
