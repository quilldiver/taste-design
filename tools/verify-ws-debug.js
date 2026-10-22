const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => { if (m.type()==='log') console.log('[page]', m.text()); });

  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(2000);

  // 注入调试：监听 exitWorks 是否被调用
  await page.evaluate(() => {
    window.__dbg = [];
    const feed = document.getElementById('wdFeed');
    // 直接监测 scrollLeft 变化
  });

  const sp = await page.evaluate(() => {
    const s = document.querySelector('.cards-stage');
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1600);

  // 直接把 scrollLeft 滚到接近 0，然后滚一次看是否退出
  await page.evaluate(() => { document.getElementById('wdFeed').scrollLeft = 0; });
  await page.waitForTimeout(100);
  let st = await page.evaluate(() => ({ works: !!window.__worksMode, sl: document.getElementById('wdFeed').scrollLeft }));
  console.log('手动置 0 后:', JSON.stringify(st));

  // 向上滚一次（此时 sl 应已=0）
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(1500);
  st = await page.evaluate(() => ({ works: !!window.__worksMode, sl: document.getElementById('wdFeed').scrollLeft }));
  console.log('sl=0 时向上滚一次后(应退出 works=false):', JSON.stringify(st));

  await browser.close();
})();
