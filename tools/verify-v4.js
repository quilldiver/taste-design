// 综合验证：布局 + 渐变 + 退出动画帧率
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(2200);

  const stage = await page.evaluate(() => {
    const r = document.querySelector('.cards-stage').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  await page.mouse.click(stage.x, stage.y);
  await page.waitForTimeout(1400);

  // 检查布局
  const layout = await page.evaluate(() => {
    const works = document.querySelector('.cards-works');
    const list = document.querySelector('.cards-works .wd-list');
    const feed = document.querySelector('.cards-works .wd-feed-wrap');
    const feedEl = document.querySelector('.cards-works .wd-feed');
    const l3 = document.querySelector('.cards-works .wd-l3');
    const wr = works.getBoundingClientRect();
    const lr = list.getBoundingClientRect();
    const fr = feed.getBoundingClientRect();
    return {
      worksFlexDir: getComputedStyle(works).flexDirection,
      listLeft: lr.left, listRight: lr.right, listWidth: lr.width,
      feedLeft: fr.left, feedRight: fr.right,
      // 三级列表是否在左侧
      listIsLeftOfFeed: lr.right <= fr.left + 1,
      // 图片流横向滚动
      feedOverflowX: getComputedStyle(feedEl).overflowX,
      feedOverflowY: getComputedStyle(feedEl).overflowY,
      // 三级列表竖排
      l3Display: getComputedStyle(l3).display,
      l3FlexDir: getComputedStyle(l3).flexDirection
    };
  });
  console.log('布局:', JSON.stringify(layout, null, 2));

  // 检查渐变是否去掉
  const grad = await page.evaluate(() => {
    const works = document.querySelector('.cards-works');
    const after = getComputedStyle(works, '::after');
    const tint = document.querySelector('.cards-works .wd-lq-tint');
    const tintDisplay = tint ? getComputedStyle(tint).display : 'none(不存在)';
    return {
      worksAfterDisplay: after.content === 'none' ? 'none' : after.display,
      tintDisplay: tintDisplay
    };
  });
  console.log('渐变:', JSON.stringify(grad));

  // 退出动画帧率
  await page.evaluate(() => {
    window.__frames = []; window.__sampling = false;
    let last = performance.now();
    function loop(t) { const d = t - last; last = t; if (window.__sampling) window.__frames.push(d); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
  });
  await page.evaluate(() => { window.__frames = []; window.__sampling = true; });
  await page.mouse.move(stage.x, stage.y);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(1600);
  await page.evaluate(() => { window.__sampling = false; });

  const stats = await page.evaluate(() => {
    const f = window.__frames.slice(1);
    const avg = f.reduce((a, b) => a + b, 0) / f.length;
    return {
      total: f.length,
      avgFps: (1000 / avg).toFixed(1),
      over25ms: f.filter(d => d > 25).length,
      over50ms: f.filter(d => d > 50).length,
      maxMs: Math.max(...f).toFixed(1)
    };
  });
  console.log('退出动画帧率:', JSON.stringify(stats));

  // 退出后大卷是否正常
  const afterExit = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.card3d')];
    const xs = els.map(el => { const m = (el.style.transform || '').match(/translate3d\((-?[\d.]+)px/); return m ? parseFloat(m[1]) : 0; });
    const g = []; for (let i = 1; i < xs.length; i++) g.push(Math.abs(xs[i] - xs[i-1]).toFixed(1));
    return { worksMode: !!window.__worksMode, gaps: g.slice(6, 10).join(',') };
  });
  console.log('退出后:', JSON.stringify(afterExit));

  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-v4-layout.png' });
  console.log('JS报错:', errors.length ? errors.join(';') : '无');
  await browser.close();
})();
