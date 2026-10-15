# Taste Design 设计厨房

设计师工作室网站框架 — Next.js 15 (App Router) + TypeScript + Tailwind CSS v4。

## 启动

```bash
npm install
npm run dev        # http://localhost:3000
```

> ⚠️ 请在**你自己的终端**（Terminal.app / iTerm / VS Code Terminal）里运行，
> 不要用 AI 助手的内置 shell —— 后者的文件系统沙箱会拦截 Next 写 `.next/` 目录。

## 目录结构

```
src/
├── app/
│   ├── layout.tsx          根布局：字体 / 背景三层 / 导航
│   ├── page.tsx            首页（我们）：三屏
│   ├── works/page.tsx      作品页
│   └── globals.css         设计令牌 + 3D 木马样式 + 背景层
├── components/
│   ├── ShaderBackground.tsx  蓝色 shader（原生 WebGL，无依赖）
│   ├── Carousel3D.tsx        首页第一屏左侧的 3D 作品旋转木马
│   ├── SiteNav.tsx           顶部导航（我们 / 作品）
│   └── WorksBrowser.tsx      作品页类型筛选
└── lib/
    ├── site.ts             工作室信息 / 作品类型 / 联系方式（改这里）
    └── utils.ts            cn()
```

## 三屏结构（首页）

| 屏 | 内容 | 状态 |
|----|------|------|
| 1 | 左：3D 作品木马 / 右：工作室介绍 | 已完成 |
| 2 | 留白 | **预留**，见 `page.tsx` 的 `ReservedScreen` |
| 3 | 联系方式 | 已完成 |

作品页 `works/page.tsx` 已搭好类型筛选骨架，作品数据为空，见 `WorksBrowser.tsx`。

## 填内容的地方

1. **工作室信息 / 联系方式 / 作品类型** → `src/lib/site.ts`
2. **第二屏内容** → `src/app/page.tsx` 的 `ReservedScreen()`
3. **作品数据** → `src/components/WorksBrowser.tsx` 里的 `WORKS` 数组
4. **木马面板** → `src/components/Carousel3D.tsx` 里的 `PANELS`
   （现在用 CSS 生成占位视觉；换成真实图片/视频时替换 `.carousel-plate` 内部即可）

## 设计系统

- **配色**：70% 深蓝 `#030815`–`#0b1f4f` / 20% 中蓝流光 `#1b51bd` `#5c98f6` / 10% 炉火琥珀 `#e8a33d`
- **字体**：Fraunces（展示，开 WONK 轴）+ Instrument Sans（正文）+ Geist Mono（标签编号）
- **背景**：WebGL domain-warped FBM 流体，无 WebGL 时自动回落到 CSS 渐变

## 无障碍与性能

- 正文对比度在最亮的流光区域上仍 ≥ 4.5:1（靠 `.shader-scrim` 压暗层保证）
- `prefers-reduced-motion`：shader 只渲染一帧静态构图，木马停转
- shader DPR 上限 1.5；标签页不可见时暂停渲染
- 触摸目标 ≥ 44×44px；焦点态可见

## 脚本

```bash
npm run dev        # 开发
npm run build      # 生产构建
npm run start      # 启动生产服务
npm run typecheck  # TypeScript 检查
```
