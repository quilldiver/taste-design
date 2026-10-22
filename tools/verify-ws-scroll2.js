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
  await page.waitForTimeout(2000);

  const sp = await page.evaluate(() => {
    const s = document.querySelector('.cards-stage');
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1600);

  const state = () => page.evaluate(() => ({
    works: !!window.__worksMode,
    sl: Math.round(document.getElementById('wdFeed').scrollLeft)
  }));

  await page.mouse.move(700, 700);
  console.log('进入后:', JSON.stringify(await state()));

  // 先向下滚到最右（远离最左，确保有向左的空间）
  for (let k = 0; k < 5; k++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(30); }
  console.log('向右滚后:', JSON.stringify(await state()));

  // 向上滚一小段，确认只回滚不退出
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(200);
  console.log('向左回滚一小段(应仍 works=true):', JSON.stringify(await state()));

  // 连续向左回滚直到 0，再继续向上应退出
  let guard = 0;
  while (guard++ < 300) {
    const s = await state();
    if (!s.works) break;
    await page.mouse.wheel(0, -800);
    await page.waitForTimeout(10);
  }
  await page.waitForTimeout(1500);
  console.log('连续向左到底(应 works=false, sl=0):', JSON.stringify(await state()));

  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
