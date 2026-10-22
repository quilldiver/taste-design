// 验证：作品集模式下 7 张缩小组卡片的朝向与投影宽度是否一致（右侧卡片是否拉伸）
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
  await page.waitForTimeout(1500);

  const inWorks = await page.evaluate(() => !!window.__worksMode);
  console.log('进入作品集模式:', inWorks);

  // 等收拢过渡完全结束（wsDur=720ms + 余量）
  await page.waitForTimeout(800);

  // 读 7 张中间卡（i=7..13）的渲染结果：投影矩形宽高 + transform
  const cards = await page.evaluate(() => {
    const els = document.querySelectorAll('.card3d');
    const out = [];
    els.forEach((el, i) => {
      if (i < 7 || i > 13) return;
      const r = el.getBoundingClientRect();
      const t = el.style.transform || '';
      out.push({
        i,
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
        x: +r.x.toFixed(1),
        cx: +(r.x + r.width / 2).toFixed(1),
        transform: t
      });
    });
    return out;
  });

  // 按 i 排序打印
  cards.sort((a, b) => a.i - b.i);
  console.log('\n--- 7 张缩小组卡投影（宽×高，中心 x，transform）---');
  const widths = cards.map(c => c.w);
  cards.forEach(c => {
    console.log(`卡#${c.i}  宽=${c.w}px 高=${c.h}px  中心x=${c.cx}  ${c.transform}`);
  });

  // 左右对称性：中间卡是 #10，对比 #7 与 #13、#8 与 #12、#9 与 #11 的投影宽度
  console.log('\n--- 左右对称性（投影宽度对比）---');
  const pairs = [[7, 13], [8, 12], [9, 11]];
  let maxAsym = 0;
  pairs.forEach(([l, r]) => {
    const cl = cards.find(c => c.i === l);
    const cr = cards.find(c => c.i === r);
    if (cl && cr) {
      const asym = Math.abs(cl.w - cr.w);
      maxAsym = Math.max(maxAsym, asym);
      console.log(`左#${l}(宽${cl.w}) vs 右#${r}(宽${cr.w})  差值=${asym.toFixed(1)}px`);
    }
  });
  const wMax = Math.max(...widths), wMin = Math.min(...widths);
  console.log(`\n投影宽度范围: ${wMin} ~ ${wMax}px  极差=${(wMax - wMin).toFixed(1)}px`);
  console.log(`最大左右不对称: ${maxAsym.toFixed(1)}px`);

  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-cards.png' });

  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
