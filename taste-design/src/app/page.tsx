import Ring3D from "@/components/Ring3D";
import WeChatTrigger from "@/components/WeChatTrigger";
import CardCarousel from "@/components/CardCarousel";
import FullPageSnap from "@/components/FullPageSnap";
import GlobeGallery from "@/components/GlobeGallery";
import { CONTACTS, STUDIO } from "@/lib/site";

/** tel: 里不能带空格与连字符，从 site.ts 的展示值派生 */
const TEL = `tel:${STUDIO.phone.replace(/[^\d+]/g, "")}`;

/** ── 第 1 屏：上·工作室介绍 / 下·3D 图片环（居中、满幅）── */
function HeroScreen() {
  return (
    <section id="studio" className="screen hero">
      {/* 上半区：文案（版心与导航对齐；≥1024 分两栏，把竖向空间让给环） */}
      <div className="hero-copy">
        <div className="hero-head">
          <p className="label">Creative Studio — Since {STUDIO.since}</p>

          <h1 className="display hero-title">
            <span className="block">{STUDIO.nameCn}</span>
            <span className="hero-title-en">{STUDIO.name}</span>
          </h1>

          <div className="hairline hero-rule" />
        </div>

        <div className="hero-side">
          <p className="hero-intro">{STUDIO.intro}</p>

          {/* 联系方式：与第 3 屏同一份数据（site.ts），这里只负责「一眼能抄走」的排布。
              悬浮放大写在 globals.css 的 .hero-meta dd 里 */}
          <dl className="hero-meta">
            {[
              { k: "邮箱", v: STUDIO.email, href: `mailto:${STUDIO.email}` },
              { k: "电话", v: STUDIO.phone, href: TEL },
              { k: "微信", v: STUDIO.wechat, href: null },
            ].map((row) => (
              <div key={row.k}>
                <dt>{row.k}</dt>
                <dd>{row.href ? <a href={row.href}>{row.v}</a> : row.k === "微信" ? <WeChatTrigger account={row.v} /> : row.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* 下半区：环。满幅出血（不套版心），水平居中 */}
      <div className="hero-stage">
        <Ring3D />
      </div>
    </section>
  );
}

/** ── 第 2 屏：七类出品的 3D 卡片长卷（无黑色蒙版，卡片由 WORK_DECKS 驱动）── */
function CardsScreen() {
  return (
    <section className="screen cards-screen">
      <div className="cards-head mx-auto w-full max-w-[1680px] px-[clamp(1rem,4.5vw,2rem)]">
        <div>
          <p className="label">What We Do — 07 Capabilities</p>
          <h2 className="display cards-title">七种手艺，一套配方</h2>
        </div>
        <p className="cards-hint">
          拖拽浏览 · 点击置中<span>Drag / Click</span>
        </p>
      </div>

      {/* 长卷：满幅（不套版心），两端自然延伸到屏幕外。
          CardCarousel 返回两个兄弟节点：.band（3D 卡片带）+ .cards-caps（2D 卡名层） */}
      <div className="cards-stage">
        <CardCarousel />
      </div>
    </section>
  );
}

/** ── 第 3 屏：3D 品牌球（≥1280：球体左侧出血 + 右侧文案；窄屏上下堆叠）── */
function GlobeScreen() {
  return (
    <section
      id="clients"
      className="screen globe-screen relative flex min-h-[100svh] flex-col items-center justify-center overflow-clip xl:flex-row xl:justify-end"
    >
      <GlobeGallery />
      {/* 三段式与第 3 屏一致：label / display / lede。
          外层容器与其它屏的版心同构（同一 max-width + 同一 padding），
          左右缘才与导航 logo / 菜单对齐 */}
      <div className="partners-row mx-auto w-full max-w-[1680px] px-[clamp(1rem,4.5vw,2rem)]">
        <p className="label">Our Partners</p>
        <h2 className="display partners-title">一起出品的伙伴</h2>
        <p className="partners-lede">
          从连锁餐饮到独立品牌，我们的配方进过不少厨房。他们把想法端上来，我们把火候调准，让出品稳定、可复现。
        </p>
      </div>
    </section>
  );
}

/** ── 第 4 屏：联系方式 ── */
function ContactScreen() {
  return (
    <section
      id="contact"
      className="screen relative flex min-h-[100svh] items-center py-28"
    >
      <div className="mx-auto w-full max-w-[1680px] px-[clamp(1rem,4.5vw,2rem)]">
        <p className="label">Say Hello</p>

        <h2 className="display mt-5 max-w-[22ch] text-[clamp(2.2rem,5.6vw,4.6rem)]">
          把你的想法端上来
        </h2>

        <p className="mt-6 max-w-[64rem] text-[1.0625rem] leading-[1.85] text-mute">
          每次合作都从一次对话开始。把你的想法、难题和期待端上来，我们先理清品牌该说什么，再把策略、视觉与执行按火候配好。从一个标志、一套包装到完整的品牌系统，我们把零散需求收进同一套配方，让每个触点保持一致，让后续应用有章可循。<br /><span className="contact-emphasis">方向想透</span>，<span className="contact-emphasis">细节做实</span>，让每一份出品都能{" "}<span className="contact-emphasis">稳稳落定</span>，也留得下回味。
        </p>

        <div className="hairline my-14" />

        <dl className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {CONTACTS.map((c) => (
            <div key={c.label}>
              <dt className="font-mono text-[12px] tracking-[0.2em] text-mute">
                {c.label}
              </dt>
              <dd className="mt-2 text-[0.95rem] text-ink">
                {c.href ? (
                  <a
                    href={c.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {c.value}
                  </a>
                ) : c.label === "微信" ? (
                  <WeChatTrigger account={c.value} />
                ) : (
                  c.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <footer className="mt-24 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[12px] tracking-[0.2em] text-mute">
            © {new Date().getFullYear()} {STUDIO.name} {STUDIO.nameCn}
          </p>
          <p className="font-mono text-[12px] tracking-[0.2em] text-mute">
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
      <CardsScreen />
      <GlobeScreen />
      <ContactScreen />
    </>
  );
}
