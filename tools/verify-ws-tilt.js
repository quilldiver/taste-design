// 验证：缩小组卡片向左倾斜 15° + 卡名字号 16px / 选中 20px
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

  const stage = await page.evaluate(() => {
    const s = document.querySelector('.cards-stage');
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(stage.x, stage.y);
  await page.waitForTimeout(1600);

  const info = await page.evaluate(() => {
    const els = document.querySelectorAll('.card3d');
    const caps = document.querySelectorAll('.cards-cap');
    const out = { cards: [], caps: [] };
    els.forEach((el, i) => {
      if (i < 7 || i > 13) return;
      const r = el.getBoundingClientRect();
      out.cards.push({ i, transform: el.style.transform, w: +r.width.toFixed(1) });
    });
    caps.forEach((c, i) => {
      if (i < 7 || i > 13) return;
      const fs = getComputedStyle(c).fontSize;
      out.caps.push({ i, fontSize: fs, text: c.textContent.trim().slice(0,4) });
    });
    return out;
  });

  console.log('--- 卡片 transform（应含 rotateY(15deg)，即向左偏）---');
  info.cards.forEach(c => console.log(`卡#${c.i} 宽=${c.w}px  ${c.transform}`));
  console.log('\n--- 卡名字号（选中卡应为 20px，其余 16px）---');
  info.caps.forEach(c => console.log(`卡#${c.i}  ${c.text}  fontSize=${c.fontSize}`));

  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-tilt.png' });
  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
