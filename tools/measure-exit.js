// 测量退出动画帧率 + 检查渐变元素
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

  // 进入作品集
  await page.mouse.click(stage.x, stage.y);
  await page.waitForTimeout(1300);

  // 注入帧率采样：监听 rAF，记录退出动画期间的帧间隔
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    function loop(t) {
      const d = t - last; last = t;
      if (window.__sampling) window.__frames.push(d);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });

  // 开始采样 + 触发退出
  await page.evaluate(() => { window.__frames = []; window.__sampling = true; });
  await page.mouse.move(stage.x, stage.y);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(1600);
  await page.evaluate(() => { window.__sampling = false; });

  const stats = await page.evaluate(() => {
    const f = window.__frames;
    // 去掉前几帧（滚轮触发前的静默帧）
    const anim = f.slice(1);
    const avg = anim.reduce((a, b) => a + b, 0) / anim.length;
    const over25 = anim.filter(d => d > 25).length; // 低于 40fps 的帧
    const over50 = anim.filter(d => d > 50).length; // 低于 20fps 的帧
    const max = Math.max(...anim);
    return {
      total: anim.length,
      avgMs: avg.toFixed(2),
      avgFps: (1000 / avg).toFixed(1),
      over25ms: over25,
      over50ms: over50,
      maxMs: max.toFixed(1)
    };
  });
  console.log('退出动画帧率:', JSON.stringify(stats));

  // 检查渐变元素
  const gradients = await page.evaluate(() => {
    const out = [];
    // .cards-works::after 底部黑渐变
    const works = document.querySelector('.cards-works');
    const after = getComputedStyle(works, '::after');
    out.push({ name: '.cards-works::after', bg: after.backgroundImage, display: after.content !== 'none' });
    // .wd-lq-tint 顶部黑渐变
    const tint = document.querySelector('.wd-lq-tint');
    if (tint) {
      const cs = getComputedStyle(tint);
      out.push({ name: '.wd-lq-tint', bg: cs.backgroundImage, display: cs.display });
    }
    // .wd-lq 上带（6层 blur）
    const lq = document.querySelector('.wd-lq');
    if (lq) {
      const cs = getComputedStyle(lq);
      out.push({ name: '.wd-lq', display: cs.display, opacity: cs.opacity });
    }
    return out;
  });
  console.log('渐变元素:', JSON.stringify(gradients, null, 2));
  console.log('JS报错:', errors.length ? errors.join(';') : '无');
  await browser.close();
})();
