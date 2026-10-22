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

  // 读滚动条相关计算样式
  const bar = await page.evaluate(() => {
    const feed = document.getElementById('wdFeed');
    const cs = getComputedStyle(feed);
    return {
      scrollbarWidth: cs.scrollbarWidth,
      scrollbarColor: cs.scrollbarColor,
      overflowX: cs.overflowX,
      overflowY: cs.overflowY,
      scrollWidth: feed.scrollWidth,
      clientWidth: feed.clientWidth
    };
  });
  console.log('滚动条样式:', JSON.stringify(bar, null, 2));

  // 检查 ::-webkit-scrollbar 规则是否命中（通过匹配 document.styleSheets）
  const hasRule = await page.evaluate(() => {
    let found = [];
    for (const ss of document.styleSheets) {
      try {
        for (const r of ss.cssRules) {
          if (r.selectorText && r.selectorText.includes('wd-feed::-webkit-scrollbar')) {
            found.push(r.selectorText);
          }
        }
      } catch (e) {}
    }
    return found;
  });
  console.log('匹配到的滚动条规则:', hasRule.join(' | ') || '（未找到，可能被 CSS 提取限制）');

  // 截图看滚动条
  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-bar.png' });
  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
