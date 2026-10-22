// 验证：进入作品集 → 滚轮向上退出 → 大卷卡片排列是否正确
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(800);

  // 滚动到第二屏（.cards-screen 在 y=900）
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(2000); // 等入场动画完成 + 自动流动

  // 记录初始大卷卡片 x 位置（中间那份 r=1，即 i=7..13）
  const snap = () => page.evaluate(() => {
    const els = document.querySelectorAll('.card3d');
    const out = [];
    els.forEach((el, i) => {
      const t = el.style.transform || '';
      const m = t.match(/translate3d\((-?[\d.]+)px/);
      out.push({ i, x: m ? parseFloat(m[1]) : null });
    });
    return out;
  });

  const before = await snap();

  // 点击第二屏中间卡片（屏中心 x=720，卡片 y 约 900+315=1215）
  const stage = await page.evaluate(() => {
    const s = document.querySelector('.cards-stage');
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(stage.x, stage.y);
  await page.waitForTimeout(1300);

  const inWorks = await page.evaluate(() => !!window.__worksMode);
  console.log('进入作品集模式:', inWorks);

  // 新退出逻辑：先把图片流滚回最左（没有内容可向左看），向上滚才退出
  await page.evaluate(() => { document.getElementById('wdFeed').scrollLeft = 0; });
  await page.waitForTimeout(200);

  // 滚轮向上退出
  await page.mouse.move(stage.x, stage.y);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(1500);

  const after = await snap();
  const afterWorks = await page.evaluate(() => !!window.__worksMode);
  console.log('退出后 worksMode:', afterWorks);

  // 对比中间 7 张卡（i=7..13）的位置
  let maxDiff = 0;
  for (let i = 7; i <= 13; i++) {
    const a = before.find(c => c.i === i);
    const b = after.find(c => c.i === i);
    if (a && b && a.x != null && b.x != null) {
      const d = Math.abs(a.x - b.x);
      if (d > maxDiff) maxDiff = d;
    }
  }
  console.log('退出后与初始位置最大偏差(px):', maxDiff.toFixed(2));

  // 检查中间 7 张卡是否挤在一起（间距应接近大卷 gap ≈ cw*0.68）
  const mid = after.filter(c => c.i >= 7 && c.i <= 13).sort((a,b)=>a.i-b.i);
  const gaps = [];
  for (let i = 1; i < mid.length; i++) gaps.push(Math.abs(mid[i].x - mid[i-1].x));
  console.log('中间卡相邻间距(px):', gaps.map(g=>g.toFixed(1)).join(', '));

  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-exit-after.png' });

  console.log('--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
