/* 探针：中间倾倒 —— 按时间采样「已激活球（y>0）的 x 范围」，
   应从画面中心向两侧逐步扩展（min 递减、max 递增，且最早激活的球 x 靠近 W/2）。 */
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
const W = +(process.argv[2] || 1440);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: 900 } });
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('.menu a')[2].click());
  await page.waitForTimeout(250);
  console.log(`─ 中间倾倒采样（W=${W}，中心≈${W / 2}）`);
  for (let k = 0; k < 12; k++) {
    const s = await page.evaluate(() => {
      const sn = window.__PIT.snapshot().filter(p => p[1] > 0);
      let mn = 1e9, mx = -1e9;
      sn.forEach(([x]) => { if (x < mn) mn = x; if (x > mx) mx = x; });
      return { n: sn.length, mn: sn.length ? Math.round(mn) : 0, mx: sn.length ? Math.round(mx) : 0 };
    });
    console.log(`  在屏 ${s.n} 颗：x 范围 [${s.mn}, ${s.mx}]`);
    if (s.n >= 19) break;
    await page.waitForTimeout(160);
  }
  await browser.close();
})();
