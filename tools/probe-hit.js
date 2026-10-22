/* 反复 spawn 定位压文案的球：输出压文案球的 x（相对画布）、y、R、depth、以及
   它是否靠近两侧（|x-中心| 很大）。 */
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('.menu a')[2].click());
  for (let trial = 0; trial < 12; trial++) {
    await page.evaluate(() => window.__PIT.settle());   // 直接跑 600 步到静止
    const hit = await page.evaluate(() => {
      const c = document.getElementById('contact').getBoundingClientRect();
      const els = document.querySelectorAll('.contact .wrap *'), boxes = [];
      els.forEach(e => {
        if (!e.textContent.trim() || e.children.length) return;
        const r = e.getBoundingClientRect();
        if (r.width && r.height) boxes.push({ l: r.left - c.left, t: r.top - c.top, r: r.right - c.left, b: r.bottom - c.top, txt: e.textContent.trim().slice(0, 10) });
      });
      const i = window.__PIT.info(), sn = window.__PIT.snapshot(), out = [];
      sn.forEach(([x, y], idx) => {
        boxes.forEach(q => {
          const cx = Math.max(q.l, Math.min(x, q.r)), cy = Math.max(q.t, Math.min(y, q.b));
          const d = Math.hypot(x - cx, y - cy);
          if (d < i.R - 1) out.push({ x, y, R: Math.round(i.R), depth: Math.round(i.R - d), txt: q.txt, idx });
        });
      });
      return out;
    });
    if (hit.length) {
      console.log(`trial ${trial}: 压文案 ${hit.length} 颗`);
      hit.forEach(h => console.log(`   x=${h.x}（中心偏 ${Math.round(h.x - W / 2)}）y=${h.y} R=${h.R} depth=${h.depth} 文本=${h.txt}`));
    }
    await page.reload();
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelectorAll('.menu a')[2].click());
  }
  await browser.close();
})();
