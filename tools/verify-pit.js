/* 验证末屏「泡泡池」（bubble-pit 同构效果）：
   ① 结构：只剩三屏；末屏 #contact 恰好 100svh；球层铺满整屏、压在最上层
   ② 球：数量 / 球径；四色色调都有（蓝紫不能为 0）；位置全在屏内、无 NaN
   ③ 入场：球从**窗口顶部**掉下来（先「球雨」）→ 3s 内全部落地 → 堆稳后停 rAF
   ④ 静止：球堆落定后 rAF 停（running=false），球不再自己动
   ⑤ 指针扫过：把球推开（受影响球数 / 最大位移），离开后重新睡着
   ⑥ 抓取抛掷：pointerdown 命中球；松手拿到速度；球被扔到屏中再落回、重新睡着
   ⑦ 链接仍可点（球层 pointer-events:none）
   ⑧ 减弱动效：直接定格在「已堆好」的静止态，不跑 rAF
   ⑨ 滚回第一屏：池子停 rAF（离屏不烧 CPU）
   用法：node tools/verify-pit.js [width] [height]  */
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900);
const URL = 'file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const R = [];
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForTimeout(700);

  const geo = await page.evaluate(() => {
    const c = document.getElementById('contact'), pit = document.getElementById('pit');
    const cv = document.getElementById('pitCanvas');
    const cr = c.getBoundingClientRect(), pr = pit.getBoundingClientRect(), vr = cv.getBoundingClientRect();
    const wrap = c.querySelector('.wrap');
    return {
      screens: [...document.querySelectorAll('.screen')].map(s => s.id || s.className),
      svh: Math.round(innerHeight),
      contactH: Math.round(cr.height),
      contactBg: getComputedStyle(c).backgroundColor,
      pitH: Math.round(pr.height), pitW: Math.round(pr.width),
      pitTopOff: Math.round(pr.top - cr.top),
      pitBottomGap: Math.round(innerHeight - pr.bottom),
      cvW: Math.round(vr.width), cvH: Math.round(vr.height),
      zPit: +getComputedStyle(pit).zIndex, zWrap: +getComputedStyle(wrap).zIndex,
      peCv: getComputedStyle(cv).pointerEvents,
      aria: cv.getAttribute('aria-label') || ''
    };
  });
  R.push(`视口 ${W}×${H}`);
  R.push('─ 结构');
  R.push(`  屏: ${geo.screens.join(' / ')} ${geo.screens.length === 3 && geo.screens[2] === 'contact' ? '✔' : '✘'}`);
  R.push(`  末屏高 ${geo.contactH} / 100svh=${geo.svh} ${Math.abs(geo.contactH - geo.svh) <= 2 ? '✔' : '✘'}  底色=${geo.contactBg}`);
  R.push(`  球层 ${geo.pitW}×${geo.pitH}（离屏顶 ${geo.pitTopOff}px）；画布 ${geo.cvW}×${geo.cvH} ` +
         `${Math.abs(geo.cvW - geo.pitW) <= 1 && Math.abs(geo.cvH - geo.pitH) <= 1 ? '✔' : '✘'}`);
  R.push(`  层序：球层 z=${geo.zPit} > 文案 z=${geo.zWrap} ${geo.zPit > geo.zWrap ? '✔' : '✘'}` +
         `；整屏球雨 ${geo.pitH >= geo.svh - 1 && geo.pitTopOff === 0 ? '✔' : '✘'}`);
  R.push(`  画布 pointer-events=${geo.peCv} ${geo.peCv === 'none' ? '✔' : '✘'}`);
  R.push(`  无障碍: canvas[aria-label] ${geo.aria ? '✔' : '✘'}`);

  const go = async i => { await page.evaluate(i => document.querySelectorAll('.menu a')[i].click(), i); };
  await go(2);
  await page.waitForTimeout(1000);
  /* 这一条测的是布局（球层铺满整屏、底边贴住视口底），不是滚动动画 ——
     动画归 verify-nav 管。2560 上偶发停在 -2 / -16px（snap 补帧被打断），
     会让布局断言假红。先兜底对齐到 contact 顶部再量。 */
  await page.evaluate(() => {
    const c = document.getElementById('contact');
    window.scrollTo(0, Math.round(c.getBoundingClientRect().top + window.scrollY));
  });
  await page.waitForTimeout(150);
  const gap = await page.evaluate(() => Math.round(innerHeight - document.getElementById('pit').getBoundingClientRect().bottom));
  /* 容差 1px：2560 上 .pit 的底边卡在 1439.6，round 之后是 -1 —— 亚像素取整，
     不是真的错位（之前用 === 0 判，每次跑 2560 都红一条） */
  R.push(`  到位后球层底离视口底 ${gap}px ${Math.abs(gap) <= 1 ? '✔' : '✘'}`);
  /* 链接可用性：球层不能让 mailto 失去命中 */
  const linkHit = await page.evaluate(() => {
    const a = document.querySelector('.contact .mailto');
    const r = a.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { tag: el ? el.tagName : '', same: !!(el && (el === a || a.contains(el))) };
  });
  R.push(`  mailto 仍可命中 ${linkHit.same ? '✔' : '✘'}（命中 ${linkHit.tag}）`);

  /* 入场中段采样：应有球还没落（active < n），且最高的球还在上半屏（= 从顶部下来）。
     2560 上第一帧要等图都解码完、rAF 起来才有球激活，所以先轮询到 active>0。 */
  let early = await page.evaluate(() => window.__PIT.info());
  for (let k = 0; k < 12 && early.active === 0; k++) {
    await page.waitForTimeout(200);
    early = await page.evaluate(() => window.__PIT.info());
  }
  R.push('');
  R.push('─ 入场');
  /* 不能只靠「采样瞬间还有球没激活」判球雨：390 上球少（36 颗）、delay 只铺到
     0.6s，1s 时早就全激活了。改判 delay 的铺开程度本身。 */
  R.push(`  起步: 已激活 ${early.active}/${early.n} 颗；delay 铺开 ${early.maxDelay}s ` +
         `${early.maxDelay > 0.25 ? '✔ 分批下落' : '✘ 一波落地'}`);
  R.push(`  最高球 y=${early.topY}（屏高 ${early.H}）` +
         `${early.active > 0 && early.topY < early.H * 0.35 ? '✔ 从窗口顶部落下' : '✘ 没从顶部下来'}`);

  await page.waitForTimeout(3200);
  const mid = await page.evaluate(() => window.__PIT.info());
  await page.waitForTimeout(4600);
  const rest = await page.evaluate(() => {
    const i = window.__PIT.info();
    const sn = window.__PIT.snapshot();
    let nan = 0, out = 0, minY = 1e9;
    sn.forEach(([x, y]) => {
      if (!isFinite(x) || !isFinite(y)) nan++;
      if (x < 0 || x > i.W + 1 || y > i.H + 1) out++;
      if (y < minY) minY = y;
    });
    /* 文案最后一行（版权那行）的底边 + 球与文本的真实相交数 */
    const c = document.getElementById('contact').getBoundingClientRect();
    const kids = [...document.querySelectorAll('.contact .wrap *')]
      .filter(e => e.textContent.trim() && !e.children.length);
    let textBottom = 0;
    kids.forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.height && r.bottom - c.top > textBottom) textBottom = Math.round(r.bottom - c.top);
    });
    return { i, nan, out, minY, textBottom, hit: window.__PIT.hits() };
  });
  R.push(`  3.5s: 全部落地 ${mid.active}/${mid.n} ${mid.active === mid.n ? '✔' : '✘'}，触底 ${mid.resting} 颗`);
  /* 静止版：堆稳（settled）之后 rAF 停掉 —— 池子落定后不再自己动。
     断言「rAF 已停 + settled 已翻转（高速弹性已就绪）」。 */
  R.push(`  9s: rAF 已停 ${!rest.i.running ? '✔' : '✘'}（settled=${rest.i.settled} maxV=${rest.i.maxV}），球径 ${rest.i.R}px，` +
         `球面 ${rest.i.ballN} 张 / logo ${rest.i.markN} 张 ` +
         `${rest.i.ballN === 4 && rest.i.markN > 0 && rest.i.markN <= rest.i.n ? '✔' : '✘'}`);
  const tn = rest.i.tones;
  R.push(`  色调 黑${tn.dark} / 白${tn.ivory} / 蓝${tn.blue} / 紫${tn.purple} ` +
         `${tn.blue > 0 && tn.purple > 0 ? '✔' : '✘ 缺蓝或紫'}`);
  /* logo 倾角：球面拆成「球体 / logo / 高光」三层之后 logo 才能转。
     判据按球池大小分两档 —— 7~9 颗的小池子根本撑不起「跨度 ≥45°」：
     每颗有 22% 概率歪到 ±70°，7 颗里一颗都没抽中的概率 17.5%，再加上
     「都歪向同一侧」就更容易撞线（390 抽到 -47°~-4°、360 抽到 -24°~19°，
     可一颗水平的都没有，肉眼并不死板）。小池只看「有没有一颗明显歪着」，
     大池（≥12 颗）才要求整体铺得开。
     ⚠ 别把这条放宽成「只看 flat 比例」：全歪在 ±5° 内时 flat 判据也会过。 */
  const spread = rest.i.angMax - rest.i.angMin;
  const maxAbs = Math.max(Math.abs(rest.i.angMin), Math.abs(rest.i.angMax));
  const big = rest.i.n >= 12;
  const angOK = big ? (spread >= 45 || maxAbs >= 38) : maxAbs >= 15;
  R.push(`  logo 倾角 ${rest.i.angMin}° ~ ${rest.i.angMax}°（跨度 ${spread}° / 最大 ${maxAbs}° ` +
         `${angOK ? '✔ 角度分散' : '✘ 太整齐'}），接近水平 ${rest.i.flat}/${rest.i.n} 颗 ` +
         `${rest.i.flat < rest.i.n * 0.6 ? '✔' : '✘ 大半都正着'}`);
  R.push(`  位置：越界 ${rest.out} 颗 ${rest.out === 0 ? '✔' : '✘'}，NaN ${rest.nan} 颗 ${rest.nan === 0 ? '✔' : '✘'}，最高点 y=${rest.minY}（屏高 ${rest.i.H}）`);
  /* 堆顶不能压住文案：弹性调高后球会「弹上去」，一度把版权行盖掉。
     判据用 hits()（球圆 vs 文本矩形真正相交），不用「最高球心 − R」——
     球是圆的，最高点只落在中间那一列，而版权行在左侧，最高那颗球的侧缘
     离文字还有十几像素，粗判据会把「没压」判成「压了」。 */
  R.push(`  压文案 ${rest.hit.n} 颗 ${rest.hit.n === 0 ? '✔ 不压' : '✘ 压住（最深 ' + rest.hit.worst + 'px）'}`);

  /* ── 指针扫过 ──
     扫的这条线取球堆「上层」的高度（25 分位），不是中位线：现在球堆是
     两层实心砖缝，底层球被地面和左右两颗夹死 —— 横扫穿过去只能挪 10px，
     那是物理正确而不是 bug。人的指针实际是扫在球堆上沿（能看见的那一层），
     那一层有地方可退，才测得出「把球扒开」。 */
  const box = await page.evaluate(() => {
    const r = document.getElementById('pitCanvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const line = await page.evaluate(() => {
    const ys = window.__PIT.snapshot().map(p => p[1]).sort((a, b) => a - b);
    return Math.round(ys[Math.floor(ys.length * 0.25)]);
  });
  const s0 = await page.evaluate(() => window.__PIT.snapshot());
  const Rpx = (await page.evaluate(() => window.__PIT.info())).R;
  /* 逐帧记录「每颗球离原位最远到过哪里」：球被挤回原位不代表没被扒开 ——
     窄屏 4 列楔形里，推开的那颗立刻被两侧邻球顶回来，扫完再量只剩几像素。 */
  await page.evaluate(() => window.__PIT.track());
  /* 斜着扫：直线扫一条 y 在随机落点下可能正好走在两层球之间的缝里（实测
     有 1/4 概率只碰到 1 颗）。从球的上一层斜到下一层，必定穿过 2~3 层球。
     横向范围取「球堆实际占的宽度 + 两侧各 1.2R」，不用固定 1/3 屏宽 ——
     390 上球堆只有 4 列、宽 350，固定 200px 只覆盖 2 列，还经常从缝里穿过去
     （实测 0/7 颗）。堆多宽就扫多宽，任何视口都能横穿整层。 */
  const span = await page.evaluate(() => {
    const xs = window.__PIT.snapshot().map(p => p[0]).sort((a, b) => a - b);
    return { x0: xs[0], x1: xs[xs.length - 1] };
  });
  /* 从最上排上方扫到最下排下方：只扫一条窄带时，落点稍偏就整条从球缝里
     穿过去（窄屏 375 实测四次里两次只推开 1 颗）。整堆走一遍才是「把手伸进
     池子里扒」，也才能穿过 2~3 层球。幅度按球堆实际高度算，视口无关。 */
  const rows = await page.evaluate(() => {
    const ys = window.__PIT.snapshot().map(p => p[1]).sort((a, b) => a - b);
    return { top: ys[Math.floor(ys.length * 0.25)], bot: ys[Math.floor(ys.length * 0.75)] };
  });
  const sx0 = box.x + Math.max(4, span.x0 - Rpx);
  const sx1 = box.x + Math.min(box.w - 4, span.x1 + Rpx);
  const y0 = box.y + rows.top - Rpx * 0.6, y1 = box.y + rows.bot + Rpx * 0.2;
  /* 40 步 × 20ms ≈ 0.8s 走完整堆：约等于真人一次拖拽的速度。
     走太快（14ms/步）时指针在每颗球上只停留一两帧，冲量还没积起来就过去了，
     测出来的位移跟「推不动」分不开。 */
  await page.mouse.move(sx0, y0);
  await page.waitForTimeout(60);
  for (let k = 1; k <= 40; k++) {
    const f = k / 40;
    await page.mouse.move(sx0 + f * (sx1 - sx0), y0 + f * (y1 - y0));
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(320);
  const s1 = await page.evaluate(() => window.__PIT.snapshot());
  const peaks = await page.evaluate(() => window.__PIT.peak());
  let moved = 0, maxd = 0;
  for (let i = 0; i < s0.length; i++) {
    const d = Math.hypot(s1[i][0] - s0[i][0], s1[i][1] - s0[i][1]);
    if (d > 6) moved++;
    if (d > maxd) maxd = d;
  }
  const peakMax = Math.max(...peaks, 0);
  /* 阈值按球数 + 球径定：一屏只剩 7~32 颗时，扫一趟能推开的球数天然就少
     （390 上整屏才 4 列、窄屏又只有两层 = 7 颗）。位移门槛 0.2R —— 9px 在 64px
     的球上等于没推动，在 40px 的球上已经是一道明显的缝。
     球数下限用 1 而不是 2：7 颗球 × 20% 按比例就该是 1 颗。 */
  const minMoved = Math.max(1, Math.min(8, Math.round(s0.length * 0.2)));
  /* 位移门槛 0.12R（1024 的 64px 球 = 8px）：球堆留了周转位之后，上排中间
     是空的，指针扫过去有一段推不到东西 —— 最大位移从 19px 掉到 10px 是
     正常值，不是没扒开（球数 5/14 照样过）。门槛再高就是假红。 */
  const minD = Math.max(6, Math.round(Rpx * 0.12));
  /* 判据用「扫过时的峰值让位」，不用「松手后的位移」：球堆是楔形，被推开的
     那颗立刻被两侧邻球顶回来，扫完 0.3s 再量常常只剩几像素 —— 那不代表没扒开。
     门槛 0.15R（40px 球 = 6px，90px 球 = 14px）：低于这个值肉眼看不见；
     ≥2 颗同时让位才说明是「扒开一堆」而不是「碰到一颗」。 */
  const minPeak = Math.round(Rpx * 0.15);
  const peakN = peaks.filter(d => d >= minPeak).length;
  const minMax = Math.round(Rpx * 0.4);
  /* 要求「让开的球数」按球数走：窄屏只剩两层 7 颗、球与球之间缝很宽，指针一趟
     常常只撞到 1~2 颗（球数 7 时 20% 就该是 1 颗）。上限压到 3 —— 把 32 颗的
     视口要求成 6 颗也是没必要的苛刻。 */
  const need = Math.max(1, Math.min(3, Math.round(s0.length * 0.2)));
  R.push('');
  R.push('─ 指针');
  R.push(`  扫过 ${Math.round(sx1 - sx0)}px：让位 ≥${minPeak}px 的球 ${peakN}/${s0.length} 颗（要求 ≥${need}），峰值 ${peakMax}px ` +
         `${peakN >= need && peakMax >= minMax ? '✔ 扒得开' : '✘ 推不动'}；` +
         `静止后仍偏开 ${moved} 颗 / ${Math.round(maxd)}px`);
  await page.screenshot({ path: `outputs/pit-hover-${W}.png`, clip: { x: 0, y: box.y, width: W, height: Math.min(box.h, H - box.y) } });
  await page.mouse.move(box.x + 6, box.y + 6);      /* 移到左上角：没有球的地方 */
  await page.waitForTimeout(4200);
  const slept = await page.evaluate(() => window.__PIT.info());
  /* 静止版：指针离开后应重新睡着 —— rAF 停、球不再自己动。 */
  const stillA = await page.evaluate(() => window.__PIT.snapshot());
  await page.waitForTimeout(1500);
  const stillB = await page.evaluate(() => window.__PIT.snapshot());
  let stillMax = 0, stillN = 0;
  stillA.forEach(([x, y], k) => {
    const d = Math.hypot(x - stillB[k][0], y - stillB[k][1]);
    if (d > stillMax) stillMax = d;
    if (d >= 1) stillN++;
  });
  R.push(`  指针离开后重新睡着 ${!slept.running ? '✔' : '✘'}（settled=${slept.settled} maxV=${slept.maxV}）`);
  R.push(`  静止无自弹（1.5s）：动了 ${stillN}/${stillA.length} 颗，最大 ${Math.round(stillMax)}px ` +
         `${stillN === 0 ? '✔ 真静止' : '✘ 还有球在动'}`);

  /* ── 抓取抛掷 ── */
  const grab = await page.evaluate(() => {
    const i = window.__PIT.info(), sn = window.__PIT.snapshot();
    /* 取一颗靠上的球当目标 */
    let best = 0;
    sn.forEach(([x, y], k) => { if (y < sn[best][1]) best = k; });
    return { pos: sn[best], H: i.H, W: i.W };
  });
  const gx = box.x + grab.pos[0], gy = box.y + grab.pos[1];
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  let held = false;
  for (let k = 1; k <= 10; k++) {
    await page.mouse.move(gx + k * 22, gy - k * 26);
    await page.waitForTimeout(16);
    if (k === 3) held = (await page.evaluate(() => window.__PIT.info())).drag;
  }
  const midDrag = await page.evaluate(() => window.__PIT.info());
  await page.mouse.up();
  await page.waitForTimeout(60);
  const thrown = await page.evaluate(() => window.__PIT.info());
  /* 逐帧追最高球：窄屏 7 颗的小池子，被抛的球 300ms 就冲到顶、500ms 就落回
     （390 实测轨迹 333→192→676），固定等 260ms+320ms 会错过抛物线的顶点、
     假判「没甩起来」。松手后连采 1.2s，取见过的最高点。 */
  let flying = grab.H;
  for (let k = 0; k < 12; k++) {
    await page.waitForTimeout(100);
    const cur = await page.evaluate(() => Math.min(...window.__PIT.snapshot().map(p => p[1])));
    if (cur < flying) flying = cur;
    if (k >= 3 && flying > grab.H * 0.55 && cur > grab.H * 0.7) break;  // 已回落，早停
  }
  R.push('');
  R.push('─ 抓取 / 抛掷');
  R.push(`  pointerdown 命中球 ${held ? '✔' : '✘'}（拖拽中 drag=${midDrag.drag}）`);
  R.push(`  松手速度 ${thrown.throwV.join(', ')} ${thrown.throwV[0] !== 0 || thrown.throwV[1] !== 0 ? '✔' : '✘'}`);
  R.push(`  被甩到屏中部 ${flying < grab.H * 0.55 ? '✔' : '✘'}（最高 y=${flying} < ${Math.round(grab.H * 0.55)}）`);
  /* 松手后把指针挪走再等：指针若还压在球堆上，会一直触发推挤（near=true），
     那是「还在被扒」不是「没睡着」—— 复现不了静止。 */
  await page.mouse.move(box.x + 6, box.y + 6);
  await page.waitForTimeout(4200);
  const after = await page.evaluate(() => window.__PIT.info());
  /* 静止版：抛出去的球落回堆里后重新睡着（rAF 停） */
  R.push(`  落回并重新睡着 ${!after.running ? '✔' : '✘'}（settled=${after.settled} maxV=${after.maxV}）`);

  await page.screenshot({ path: `outputs/pit-${W}.png` });

  /* ── 离屏停表 ── */
  await go(0);
  await page.waitForTimeout(1400);
  const offscreen = await page.evaluate(() => window.__PIT.info());
  R.push('');
  R.push(`─ 离屏：滚回第一屏后 running=${offscreen.running} ${!offscreen.running ? '✔' : '✘'}`);

  /* ── 减弱动效 ── */
  const p2 = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
  const e2 = [];
  p2.on('pageerror', e => e2.push(e.message));
  await p2.goto(URL);
  await p2.waitForTimeout(600);
  await p2.evaluate(() => document.querySelectorAll('.menu a')[2].click());
  await p2.waitForTimeout(900);
  const red = await p2.evaluate(() => {
    const i = window.__PIT.info();
    const sn = window.__PIT.snapshot();
    let out = 0;
    sn.forEach(([x, y]) => { if (x < 0 || x > i.W + 1 || y > i.H + 1) out++; });
    return { i, out };
  });
  R.push('');
  R.push('─ 减弱动效');
  R.push(`  球数 ${red.i.n}，静止 ${!red.i.running ? '✔' : '✘'}，全部在屏内 ${red.out === 0 ? '✔' : '✘'}，` +
         `触底 ${red.i.resting} 颗 ${red.i.resting > 0 ? '✔' : '✘'}`);
  await p2.screenshot({ path: `outputs/pit-reduce-${W}.png` });
  await p2.close();

  R.push('');
  R.push(`JS 报错：${errors.length ? errors.join(' | ') : '（无）'}${e2.length ? ' / reduce: ' + e2.join('|') : ''}`);
  console.log(R.join('\n'));
  await browser.close();
})();
