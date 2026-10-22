// 验证：切换分类字号跟随 + 退出后卡名字号恢复（进入作品集后重新测舞台位置）
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

  let sp = await stagePos();
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1500);

  const readCaps = () => page.evaluate(() => {
    const caps = document.querySelectorAll('.cards-cap');
    const out = [];
    caps.forEach((c, i) => { if (i >= 7 && i <= 13) out.push(getComputedStyle(c).fontSize); });
    return out.join(',');
  });

  console.log('初始(选中#10):', await readCaps());

  sp = await stagePos();   // 重新量缩小组舞台位置
  await page.mouse.click(sp.x + 396, sp.y);   // 最右卡 #13
  await page.waitForTimeout(900);
  console.log('点最右卡后(选中#13):', await readCaps());

  await page.mouse.click(sp.x - 396, sp.y);   // 最左卡 #7
  await page.waitForTimeout(900);
  console.log('点最左卡后(选中#7):', await readCaps());

  // 滚轮向上退出
  await page.mouse.move(sp.x, sp.y);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(1500);
  const afterExit = await page.evaluate(() => ({
    works: !!window.__worksMode,
    bigFs: getComputedStyle(document.querySelectorAll('.cards-cap')[10]).fontSize
  }));
  console.log('退出后 worksMode:', afterExit.works, ' 大卷卡名字号(应24px):', afterExit.bigFs);

  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-font-exit.png' });
  console.log('--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
