// 验证：取消旋转 + 选中放大 1.25 + 缩小组距顶缩小
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
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top };
  });

  let sp = await stagePos();
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1600);

  const info = await page.evaluate(() => {
    const els = document.querySelectorAll('.card3d');
    const out = [];
    els.forEach((el, i) => {
      if (i < 7 || i > 13) return;
      const r = el.getBoundingClientRect();
      out.push({ i, transform: el.style.transform, w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    });
    return out;
  });

  console.log('--- 卡片 transform（应 rotateY(0deg)，选中卡 scale(1.25)）---');
  info.forEach(c => console.log(`卡#${c.i} 宽=${c.w}px 高=${c.h}px  ${c.transform}`));

  sp = await stagePos();
  console.log('\n缩小组舞台顶部 y=', sp.top.toFixed(1), '（进入作品集后）');

  // 验证切换分类后放大跟随
  await page.mouse.click(sp.x + 396, sp.y);
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => {
    const els = document.querySelectorAll('.card3d');
    const out = [];
    els.forEach((el, i) => { if (i >= 7 && i <= 13) out.push(+el.getBoundingClientRect().width.toFixed(1)); });
    return out;
  });
  console.log('点最右卡后宽度(#7..#13):', after.join(','), '（选中#13应≈110px）');

  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-flat.png' });
  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
