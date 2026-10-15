# Taste Design 设计厨房

设计师工作室品牌官网。视觉主线：WebGL 着色器背景 + 三屏滚动吸附 + 第二屏的 3D 品牌球（84 张 logo 卡片铺满球面，可拖拽旋转、点击定格）。

> ⚠️ **仓库里的两份网页一直是同步维护的，任何改动都要同时改两边**，详见下方「双交付」。
> Next 的构建命令请在**你自己的终端**里跑——AI 助手的内置沙箱会拦截它写 `.next/` 目录。

## 在线地址

推送到 `main` 后，GitHub Actions 会自动构建 Next 版本并发布：

<https://quilldiver.github.io/taste-design/>

对应工作流：`.github/workflows/deploy-pages.yml`（也可在 Actions 面板手动触发）。

## 一、仓库里有什么

```
taste-design.html          单文件交付版（150KB，双击即开，图片走同级 logo/）
logo/                      球面素材 · 28 张 2000×1000 webp（14 品牌 × white/color）
assets/logo-webp/          素材归档副本（与 logo/ 同一批，字节一致）
taste-design/              Next.js 交付版（源码）
└── src/
    ├── app/               路由：首页 + /works 作品页
    ├── components/        GlobeGallery（品牌球）/ SiteNav / ShaderBackground / Carousel3D / WorksBrowser
    ├── fonts/             Alimama Agile VF（由 webpack 打包）
    └── lib/site.ts        站点文案与配置 + BASE（子路径前缀）
└── public/logo/           Next 版本读取的素材（与 logo/ 同步）
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

## 三、本地开发

```bash
cd taste-design
npm install
npm run dev        # http://localhost:3000
npm run build      # 静态导出到 out/（output: "export"）
npm run typecheck  # tsc --noEmit
```

## 四、部署相关的几个约定

- **静态导出**：`next.config.ts` 里 `output: "export"` + `trailingSlash: true`，站点没有任何服务端依赖。
- **子路径前缀**：Pages 项目站点地址带 `/taste-design`，所以 CI 注入 `NEXT_PUBLIC_BASE_PATH=/taste-design`，
  `next.config.ts` 用它设 `basePath`/`assetPrefix`，源码里手写的绝对路径再拼 `BASE`（`src/lib/site.ts`）。
  **如果改仓库名，必须同步改 `deploy-pages.yml` 里的 `NEXT_PUBLIC_BASE_PATH`**，否则图片与字体 404。
- **字体走 webpack 而不是 public/**：`public/` 里的资源在 CSS 中只能写根绝对路径，Next 不会给它补 `basePath`，
  子路径部署会 404。放进 `src/fonts/` 后会被输出到 `/_next/static/media/` 下，前缀自动生效。
- `public/.nojekyll`：防止 `_next` 这类下划线目录被 Jekyll 跳过。

## 五、素材

`logo/` 是目前唯一的真源，`taste-design/public/logo/` 和 `assets/logo-webp/` 是它的同步副本。

素材为 **2000×1000（2:1）** 原图，按要求不做任何降采样、裁切或抠底——包括 color 版自带的白底也要保留。
卡片高度 `IH = IW × 0.5 + 1`（`+1` 抵消左右各 1px 边框），这个公式跟着素材比例走，别单独改。
