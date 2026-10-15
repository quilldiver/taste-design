# Taste Design 设计厨房

设计师工作室品牌官网。视觉主线：WebGL 着色器背景 + 三屏滚动吸附 + 第二屏的 3D 品牌球（84 张 logo 卡片铺满球面，可拖拽旋转、点击定格），以及一个三栏式的**作品索引页**（左 一级+二级 / 中 三级 / 右 可长滚的图片流）。

> ⚠️ **仓库里的两份网页一直是同步维护的，任何改动都要同时改两边**，详见下方「双交付」。
> Next 的构建命令请在**你自己的终端**里跑——AI 助手的内置沙箱会拦截它写 `.next/` 目录。

## 在线地址

推送到 `main` 后，GitHub Actions 会自动构建 Next 版本并发布：

<https://quilldiver.github.io/taste-design/>

对应工作流：`.github/workflows/deploy-pages.yml`（也可在 Actions 面板手动触发）。

## 一、仓库里有什么

```
taste-design.html          单文件交付版（双击即开，图片走同级的 logo/ carousel/ works/）
logo/                      第二屏球面素材 · 28 张 2000×1000 webp（14 品牌 × white/color）
carousel/                  首屏木马素材 · 14 张 1000×1250 webp
works/                     作品详情图 · 107 张 webp（多为 4001×2251）
assets/                    上述三批素材的归档副本（字节一致）
taste-design/              Next.js 交付版（源码）
└── src/
    ├── app/               路由：/（三屏首页）+ /works（作品页）+ /works/[slug]（作品索引页，7 个静态页）
    ├── components/        ShaderBackground / Carousel3D / GlobeGallery / SiteNav
    │                      WorksBrowser（作品页牌堆）/ WorkIndex（二级页三栏）/ PageSwipe（换页过渡）
    ├── fonts/             Alimama Agile VF（由 webpack 打包）
    └── lib/               site.ts（文案与 BASE）+ works.ts（作品目录数据）
└── public/{logo,carousel,works}/   Next 版读取的素材（与根目录同步）
.github/workflows/         自动构建 + 发布到 GitHub Pages
```

`.gitignore` 排除了 `node_modules/`、`.next/`、`out/`、`outputs/`（本地验证截图）与 `.workbuddy/`（本地工作记忆）。

## 二、为什么要「双交付」

| | `taste-design.html` | `taste-design/`（Next 版） |
|---|---|---|
| 运行方式 | 双击打开，无需 Node | `npm install && npm run dev` |
| 产物 | 本身就是成品 | 静态导出到 `taste-design/out/` |
| 适合 | 直接交付、发给客户、丢任意静态空间 | 长期维护、加页面、接数据 |
| 不足 | 单文件内全部代码 | 需要构建链路 |

两者视觉保持一致。**改任何一处，同一次改动必须落到另一处。**

## 三、作品索引页（`/works/<slug>`）

版式来自《排版参考》：**左**是一级菜单（英文大字 + 中文小字）与内联手风琴二级菜单，**中**是当前二级下的三级列表（即作品名），**右**是图片流。没有二级 / 三级就整列不展示。

- **整页版心与第 3 屏的 `.wrap` 同构**：`.wd-in` 用同一套 `max-width:1680px` + `padding-inline:clamp(1rem,4.5vw,2rem)`，三栏全部落在版心之内，左栏左缘与导航 logo 对齐。
- **三栏宽度**：三个真源变量 `--wd-c1:220px`（一级+二级**内容**宽）、`--wd-c3:clamp(176px,15.6vw,252px)`（三级**内容**宽）、`--wd-gap:80px`（两栏之间的净距）。剩下的宽度全部归 `.wd-feed` —— 它是三栏里唯一 `flex:1` 的项，所以**「把省下的空间给图片」不需要额外写规则**，反过来说也别给另外两栏加宽。实测图片列在 1024 / 1440 / ≥1680 分别占版心 43 / 55 / 60%。
- **字号**：一级中文 `14px`、二级与三级 `16px`（用户指定，窄屏同值）；一级各项之间 `8px` 间距。
- **选中项放大 1.25 倍**（`--wd-pop: .4s` 缓动，一级 / 二级 / 三级一致）：都用 `transform: scale(1.25)` + `transform-origin: left center` —— 从左边长出去，文字左缘（与 logo 对齐的那条竖线）不动。窄屏 chips 行改成 `center` 原点并各自收一档（一级 1.2、二级 1.15、三级 1.15）：横排时左右各长一半，得给邻项留位。
  > ⚠️ 缩放的**水平余量留在 `padding-right` 里**（= 内容宽 × 0.25，盒宽用 `calc()` 算）。因为 `.wd-nav` / `.wd-list` 都是纵向滚动容器，`overflow-y:auto` 会把 `overflow-x` 强制算成 `auto`（写 `visible` 无效，`overflow-clip-margin` 实测对 `hidden` 也不生效），超出内容盒的部分会被裁；而**裁剪边界是 padding box**，所以把余量放进自己的 padding 就能画出来。代价是图片列在 1920 下由 1064 → 1001px。
  > **二级多一层麻烦**：`.wd-l2` 自己就是 `overflow:hidden`（手风琴必须裁），所以它的 padding box 才是裁剪边界，**用不了 `.wd-nav` 外侧那 55px**。于是 `padding-right` 也从 `.wd-l2` 自己的 padding 出（同样 `.25`，内容盒 199 → 144px，缩放后盒宽 180px，右缘离裁剪边界还有 19px）。这层 padding 是**向内缩**，不占外部空间，所以 `.wd-list` / `.wd-feed` 的宽度不受影响。
- **二级菜单是手风琴**：展开 / 收起用 `grid-template-rows: auto 0fr ↔ auto 1fr` 过渡（`--wd-acc`），不用猜内容高度；收起时同时把 `visibility` 关掉，否则 0 高的面板里那些按钮仍会被 Tab 到。
- **图片流里放的是全部 52 个作品**（按原作品集页码升序首尾相接），所以「滚到底自然接下一个作品」是数据结构本身的性质，不需要任何拼接逻辑。
- 反过来，**滚动位置是唯一的状态源**：菜单高亮由滚动位置反推（判定线在视口高度 42% 处）。这样点菜单跳转与手动滚动永远不会互相打架。
- 图片流用 `<img width height>` 占位、`loading="lazy"`（仅首图 eager），避免未解码时偏移表算错。
- **作品标题下不显示原作品集页码**（`P7-P9` 那类只在 `works.ts` 里留着当溯源标记）。
- `<1024px` 三栏改三行横向 chips，激活项会自动带进视野。
- **图片流上下边缘的渐进模糊**（Liquid Scroll 那一套，只在这一页）：浏览器没有「渐变 blur」，所以用 **6 层 `backdrop-filter` 叠出来** —— 每层 blur 固定（9 / 7 / 5.2 / 3.6 / 2.2 / 1 px），靠 `mask-image` 决定它从边缘起「能活多久」（最糊那层只覆盖最外 30%，最轻那层铺满全带）。带高 `--wd-lq-h: clamp(56px, 8vh, 100px)`。
  > ⚠️ 每层 blur 必须**递减**：`backdrop-filter` 是串联的（后一层模糊的是前一层的输出），等强叠 6 层会把模糊度乘成 √6 倍，边缘糊成一块死色。
  > ⚠️ 覆盖层必须放在**滚动容器外面**，放里面会跟着内容滚走，用 `sticky` 又会占文档流。`pointer-events:none` 保证不吃点击与滚轮。
- **上下两带的挂载层级不同**：**上带** `.wd-lq` 在 `.wd-feed-wrap` 里 → 只盖图片列；**下带** `.wd-lq-bot` 挂在 `.wdetail` 一级 → **横跨整个视口、压在三栏所有内容之上**（`z-index: 6`，实测带子宽 = 视口宽 100%，层叠探测 9 个点全命中它）。两条带共用 `.wd-lq-band` 那套层参数，只是容器不同。
  > 为什么不把上带也整页化：左栏一级菜单从 y≈116 就开始，而顶部带占 y=80~166 —— 整页化会直接糊掉「Logo 那一项」。下带在 y≈994~1080，桌面下左栏底部没有任何内容（7 个一级 + 展开的二级最高约 446px），整页化只让**背景**跟着一起渐隐，不会糊到字。
  > ⚠️ `.wdetail` 必须自带 `position: relative`：下带靠它把 `absolute; inset: 0` 锚在「整整一屏」上。不加的话会一路往上找到 `main`（同为 relative），`bottom: 0` 就落到整份文档的最末尾。
- **顶部另加一层黑色渐变，且只在「往下滚过」之后出现**（`.wd-feed-wrap.is-scrolled`，由滚动反推那一次 rAF 顺手切）。阈值取**第一个作品的 `offsetTop`** 而不是 0 —— 进页时图片流本身就带着 `offsetTop-10` 的偏移（logo 页是 10px），拿 0 判定会让首屏一进来就挂黑幕。
  > **顶部整组随滚动淡入、底部常驻**：静止时图片流顶上就是第一个作品的标题，常驻会一进页就把它糊掉；滚过之后顶上确实压着内容，模糊才成立。底部相反 —— 内容永远延伸到视口下方。
  > ⚠️ 淡入**不能写成 `.wd-lq-t { opacity: … }`**：`opacity < 1` 会把该元素变成 backdrop root，子孙的 `backdrop-filter` 就只采样它自己（空内容），模糊整体失效。所以让每个 `span` 自己 `transition: opacity`（实测 `opacity:.5` 时边缘能量 5.1，介于「全模糊 3.4」与「无模糊 11.0」之间，证明模糊仍在工作）。
  > 性能：真实 GPU 下 12 层 backdrop-filter 对滚动帧率**无可测影响**（Apple M5 无头 Metal 后端，开 / 关都是稳定 60fps）。软件光栅（SwiftShader）下才会掉到 30fps —— 那是无头沙箱的假象，不代表真机。`opacity:0` 的层浏览器会跳过绘制，所以静止时更省。

## 四、本地开发

```bash
cd taste-design
npm install
npm run dev        # http://localhost:3000
npm run build      # 静态导出到 out/（output: "export"）
npm run typecheck  # tsc --noEmit
```

## 五、部署相关的几个约定

- **静态导出**：`next.config.ts` 里 `output: "export"` + `trailingSlash: true`，站点没有任何服务端依赖。
  `/works/[slug]` 用 `generateStaticParams()` 在构建期列出 7 个分类。
- **子路径前缀**：Pages 项目站点地址带 `/taste-design`，所以 CI 注入 `NEXT_PUBLIC_BASE_PATH=/taste-design`，
  `next.config.ts` 用它设 `basePath`/`assetPrefix`，源码里手写的绝对路径再拼 `BASE`（`src/lib/site.ts`）。
  **如果改仓库名，必须同步改 `deploy-pages.yml` 里的 `NEXT_PUBLIC_BASE_PATH`**，否则图片与字体 404。
- **字体走 webpack 而不是 public/**：`public/` 里的资源在 CSS 中只能写根绝对路径，Next 不会给它补 `basePath`，
  子路径部署会 404。放进 `src/fonts/` 后会被输出到 `/_next/static/media/` 下，前缀自动生效。
- `public/.nojekyll`：防止 `_next` 这类下划线目录被 Jekyll 跳过。

## 六、素材

`logo/`、`carousel/`、`works/` 是三个真源，`taste-design/public/` 与 `assets/` 下各有一份同步副本。

素材一律**原样拷贝**：不做降采样、不裁切、不抠底、不内联 base64——包括 logo 的 color 版自带白底也保留。
球面卡片的 `IH = IW × 0.5 + 1`（`+1` 抵消左右各 1px 边框）跟着素材的 2:1 比例走，别单独改。
