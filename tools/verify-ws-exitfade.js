const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(1800);
  const sp = await page.evaluate(() => { const r = document.querySelector('.cards-stage').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1400);
  // 滚到最左再退出
  await page.evaluate(() => { document.getElementById('wdFeed').scrollLeft = 0; });
  await page.waitForTimeout(150);
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, -120);
  const ops = [];
  for (const t of [60, 200, 400, 800]) { await page.waitForTimeout(t - (ops.length ? [60,200,400][ops.length-1] : 0)); ops.push({ t, o: +(await page.evaluate(() => +getComputedStyle(document.getElementById('cardsWorks')).opacity)).toFixed(2) }); }
  console.log('退出时作品集 opacity:', ops.map(o => `t≈${o.t}=${o.o}`).join('  '));
  await page.waitForTimeout(900);
  console.log('退出后 worksMode=', await page.evaluate(() => !!window.__worksMode), ' hidden=', await page.evaluate(() => document.getElementById('cardsWorks').hidden));
  console.log('JS 报错:', errors.length ? errors.join(' | ') : '（无）');
  await browser.close();
})();
