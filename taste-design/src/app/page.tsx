import Carousel3D from "@/components/Carousel3D";
import FullPageSnap from "@/components/FullPageSnap";
import GlobeGallery from "@/components/GlobeGallery";
import { CONTACTS, STUDIO } from "@/lib/site";

/** ── 第 1 屏：左·作品木马 / 右·工作室介绍 ── */
function HeroScreen() {
  return (
    <section
      id="studio"
      className="screen relative flex min-h-[100svh] items-center px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32"
    >
      <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-8">
        {/* 左：工作室介绍 */}
        <div className="order-1 lg:pr-6">
          <p className="label">Creative Studio — Since {STUDIO.since}</p>

          <h1 className="display mt-5 text-[clamp(2.6rem,6.4vw,5.2rem)]">
            <span className="block">{STUDIO.nameCn}</span>
            <span className="mt-2 block text-[0.4em] tracking-[0.06em] text-mute">
              {STUDIO.name}
            </span>
          </h1>

          <div className="hairline my-7 max-w-[34rem]" />

          <p className="max-w-[36rem] text-[1.0625rem] leading-[1.75] text-mute">
            {STUDIO.intro}
          </p>

          <dl className="mt-10 grid max-w-[36rem] grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
            {[
              { k: "Est.", v: STUDIO.since },
              { k: "Base", v: "深圳 · 蛇口" },
              { k: "Practice", v: "品牌 / 数字 / 空间" },
            ].map((row) => (
              <div key={row.k}>
                <dt className="font-mono text-[0.7rem] tracking-[0.2em] text-mute">
                  {row.k}
                </dt>
                <dd className="mt-1.5 text-[0.95rem] text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 右：3D 木马 */}
        <div className="order-2">
          <Carousel3D />
        </div>
      </div>
    </section>
  );
}

/** ── 第 2 屏：3D 品牌球（≥1280：球体左侧出血 + 右侧文案；窄屏上下堆叠）── */
function GlobeScreen() {
  return (
    <section
      id="clients"
      className="screen globe-screen relative flex min-h-[100svh] flex-col items-center justify-center overflow-clip px-5 sm:px-8 xl:flex-row xl:justify-end"
    >
      <GlobeGallery />
      {/* 三段式与第 3 屏一致：label / display / lede */}
      <div className="partners-row">
        <p className="label">Our Partners</p>
        <h2 className="display partners-title">一起出品的伙伴</h2>
        <p className="partners-lede">
          从连锁餐饮到独立品牌，我们的配方进过不少厨房。他们把想法端上来，我们把火候调准，让出品稳定、可复现。
        </p>
      </div>
    </section>
  );
}

/** ── 第 3 屏：联系方式 ── */
function ContactScreen() {
  return (
    <section
      id="contact"
      className="screen relative flex min-h-[100svh] items-center px-5 py-28 sm:px-8"
    >
      <div className="mx-auto w-full max-w-[1680px]">
        <p className="label">Say Hello</p>

        <h2 className="display mt-5 max-w-[22ch] text-[clamp(2.2rem,5.6vw,4.6rem)]">
          把你的想法端上来
        </h2>

        {/* 这一段要求单行：去掉 34rem 宽度限制并禁止折行；窄屏放不下时再自动折行 */}
        <p className="mt-6 text-[1.0625rem] leading-[1.75] text-mute whitespace-nowrap max-[760px]:whitespace-normal">
          每次合作都从一次对话开始。说说你想做什么，我们一起看看该怎么配比。
        </p>

        <a
          href={`mailto:${STUDIO.email}`}
          className="group mt-10 inline-flex min-h-[44px] items-center gap-3 border-b border-ember/40 pb-1 text-[clamp(1.1rem,2.2vw,1.6rem)] text-ink transition-colors duration-200 hover:border-ember"
        >
          <span className="font-mono tracking-tight">{STUDIO.email}</span>
          <span
            aria-hidden="true"
            className="text-ember transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </a>

        <div className="hairline my-14" />

        <dl className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {CONTACTS.map((c) => (
            <div key={c.label}>
              <dt className="font-mono text-[0.7rem] tracking-[0.2em] text-mute">
                {c.label}
              </dt>
              <dd className="mt-2 text-[0.95rem] text-ink">
                {c.href ? (
                  <a
                    href={c.href}
                    className="underline-offset-4 transition-colors duration-200 hover:text-ember hover:underline"
                  >
                    {c.value}
                  </a>
                ) : (
                  c.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <footer className="mt-24 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.7rem] tracking-[0.2em] text-mute">
            © {new Date().getFullYear()} {STUDIO.name} {STUDIO.nameCn}
          </p>
          <p className="font-mono text-[0.7rem] tracking-[0.2em] text-mute">
            {STUDIO.city}
          </p>
        </footer>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      {/* 一次滚轮 = 一屏（CSS snap 只吸最近的点，滚一格会被弹回） */}
      <FullPageSnap />
      <HeroScreen />
      <GlobeScreen />
      <ContactScreen />
    </>
  );
}
