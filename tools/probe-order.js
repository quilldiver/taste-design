/* 探针：① 左→右掉落 —— 按时间分段采样「已激活球（y>0）的平均 x / 最右激活球」，
   应随时间右移；② 压文案的球在哪 —— 复算 hits 逻辑并输出球的坐标与半径。 */
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
const URL = 'file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto(URL);
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('.menu a')[2].click());
  await page.waitForTimeout(250);
  console.log('─ 左→右掉落采样（W=1440）');
  for (let k = 0; k < 12; k++) {
    const s = await page.evaluate(() => {
      const sn = window.__PIT.snapshot().filter(p => p[1] > 0);
      let avg = 0, mx = 0, mn = 1e9;
      sn.forEach(([x]) => { avg += x; if (x > mx) mx = x; if (x < mn) mn = x; });
      return { n: sn.length, avg: sn.length ? Math.round(avg / sn.length) : 0, mn, mx };
    });
    console.log(`  已落地/在屏 ${s.n} 颗：平均x=${s.avg} 最左=${s.mn} 最右=${s.mx}`);
    if (s.n >= 19) break;
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(6500);
  console.log('─ 压文案的球');
  const hit = await page.evaluate(() => {
    const c = document.getElementById('contact').getBoundingClientRect();
    const els = document.querySelectorAll('.contact .wrap *'), boxes = [];
    els.forEach(e => {
      if (!e.textContent.trim() || e.children.length) return;
      const r = e.getBoundingClientRect();
      if (r.width && r.height) boxes.push({ l: r.left - c.left, t: r.top - c.top, r: r.right - c.left, b: r.bottom - c.top, txt: e.textContent.trim().slice(0, 12) });
    });
    // 需要访问内部 bodies —— 用 snapshot + R 估算：球心到字框最近距离 < R 则算压
    const i = window.__PIT.info();
    const sn = window.__PIT.snapshot();
    const out = [];
    sn.forEach(([x, y]) => {
      boxes.forEach(q => {
        const cx = Math.max(q.l, Math.min(x, q.r)), cy = Math.max(q.t, Math.min(y, q.b));
        const d = Math.hypot(x - cx, y - cy);
        if (d < i.R - 1) out.push({ x, y, R: i.R, depth: Math.round(i.R - d), txt: q.txt });
      });
    });
    return out;
  });
  console.log(hit.length ? JSON.stringify(hit, null, 1) : '  无压文案');
  await browser.close();
})();
