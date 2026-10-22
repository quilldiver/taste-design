const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ w: 390, h: 844 }, { w: 768, h: 1024 }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
    await page.waitForTimeout(700);
    await page.evaluate(h => window.scrollTo(0, h), vp.h);
    await page.waitForTimeout(1700);
    let sp = await page.evaluate(() => { const r = document.querySelector('.cards-stage').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.tap('.cards-stage');
    await page.waitForTimeout(1500);
    sp = await page.evaluate(() => { const r = document.querySelector('.cards-stage').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const before = await page.evaluate(() => Math.round(document.getElementById('wdFeed').scrollLeft));
    await page.touchscreen.tap(sp.x + 90, sp.y);
    await page.waitForTimeout(80);
    const mid = await page.evaluate(() => ({ sw: document.getElementById('cardsWorks').classList.contains('is-switching'), o: +getComputedStyle(document.getElementById('wdFeed')).opacity }));
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({ sl: Math.round(document.getElementById('wdFeed').scrollLeft), o: +getComputedStyle(document.getElementById('wdFeed')).opacity, sw: document.getElementById('cardsWorks').classList.contains('is-switching') }));
    console.log(`${vp.w}: 切换中(80ms)=${JSON.stringify(mid)} → 完成=${JSON.stringify(after)}  sl ${before}→${after.sl}  报错=${errors.length ? errors.join('|') : '无'}`);
    await page.screenshot({ path: `outputs/verify-ws-switch-${vp.w}.png` });
    await page.close();
  }
  await browser.close();
})();
