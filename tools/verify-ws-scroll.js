// 验证：向左滑动边界退出逻辑 + 滚动条样式
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

  const stagePos = () => page.evaluate(() => {
    const s = document.querySelector('.cards-stage');
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const sp = await stagePos();
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1600);

  const state = () => page.evaluate(() => ({
    works: !!window.__worksMode,
    sl: document.getElementById('wdFeed').scrollLeft
  }));

  console.log('进入后:', JSON.stringify(await state()));

  // 1) 向下滚一段，让图片流向右（scrollLeft 增大）
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  console.log('向下滚后(应 sl>0 且仍在作品集):', JSON.stringify(await state()));

  // 2) 向上滚一小段：应只向左回滚，不退出
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(300);
  console.log('向上滚一小段(应仍 works=true，sl 减小):', JSON.stringify(await state()));

  // 3) 连续向上滚直到最左，再向上应退出
  for (let k = 0; k < 20; k++) { await page.mouse.wheel(0, -500); await page.waitForTimeout(60); }
  await page.waitForTimeout(1500);
  console.log('连续向上滚到底(应 works=false):', JSON.stringify(await state()));

  await browser.close();
  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
})();
