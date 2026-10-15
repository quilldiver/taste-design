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
- **三栏宽度**：一级+二级栏固定 `220px`、三级栏 `clamp(176px,15.6vw,252px)`，两者间距 `80px`（原 `clamp(28px,13.6vw,220px)`）；剩下的宽度全部归 `.wd-feed` —— 它是三栏里唯一 `flex:1` 的项，所以**「把省下的空间给图片」不需要额外写规则**，反过来说也别给另外两栏加宽。实测图片列在 1024 / 1280 / 1440 / ≥1680 分别占版心 47 / 56 / 59 / 63%。
- **二级菜单是手风琴**：展开 / 收起用 `grid-template-rows: auto 0fr ↔ auto 1fr` 过渡（`--wd-acc`），不用猜内容高度；收起时同时把 `visibility` 关掉，否则 0 高的面板里那些按钮仍会被 Tab 到。
- **图片流里放的是全部 52 个作品**（按原作品集页码升序首尾相接），所以「滚到底自然接下一个作品」是数据结构本身的性质，不需要任何拼接逻辑。
- 反过来，**滚动位置是唯一的状态源**：菜单高亮由滚动位置反推（判定线在视口高度 42% 处）。这样点菜单跳转与手动滚动永远不会互相打架。
- 图片流用 `<img width height>` 占位、`loading="lazy"`（仅首图 eager），避免未解码时偏移表算错。
- **作品标题下不显示原作品集页码**（`P7-P9` 那类只在 `works.ts` 里留着当溯源标记）。
- `<1024px` 三栏改三行横向 chips，激活项会自动带进视野。

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
