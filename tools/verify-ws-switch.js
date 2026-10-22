// 验证：点缩小组卡片直接切作品时的淡出/淡入过渡
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
  await page.waitForTimeout(1900);

  const stage = () => page.evaluate(() => {
    const r = document.querySelector('.cards-stage').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const snap = () => page.evaluate(() => ({
    works: !!window.__worksMode,
    switching: document.getElementById('cardsWorks').classList.contains('is-switching'),
    feedO: +getComputedStyle(document.getElementById('wdFeed')).opacity,
    inTr: getComputedStyle(document.querySelector('#wdFeed .wd-feed-in')).transform,
    sl: Math.round(document.getElementById('wdFeed').scrollLeft),
    dx: getComputedStyle(document.getElementById('cardsWorks')).getPropertyValue('--sw-dx').trim(),
    onCap: (() => { let t = null; document.querySelectorAll('.cards-cap').forEach((c, i) => { if (i >= 7 && i <= 13 && parseFloat(getComputedStyle(c).fontSize) > 18) t = c.textContent.trim().replace(/^\d+/, ''); }); return t; })()
  }));

  let sp = await stage();
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1500);
  console.log('进入后:', JSON.stringify(await snap()));

  sp = await stage();
  const wg = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.cards-screen')).getPropertyValue('--ws-gap-k')) || 1.5);

  for (const k of [3, -3]) {
    const before = await snap();
    await page.mouse.click(sp.x + k * 60, sp.y);
    const seq = [];
    const t0 = Date.now();
    for (let n = 0; n < 12; n++) {
      const s = await snap();
      seq.push(`${Date.now() - t0}ms o=${s.feedO.toFixed(2)} sw=${s.switching ? 1 : 0} sl=${s.sl}`);
      await page.waitForTimeout(45);
    }
    const after = await snap();
    console.log(`\n点击${k > 0 ? '右侧' : '左侧'}卡 → 选中「${after.onCap}」 dx=${before.dx || '-'}→${after.dx}`);
    console.log('  过渡采样: ' + seq.join(' | '));
    console.log(`  scrollLeft ${before.sl} → ${after.sl}  最终 opacity=${after.feedO} transform=${after.inTr}`);
    await page.waitForTimeout(500);
  }

  // 点当前已选中卡：应当完全不动
  const cur = await page.evaluate(() => {
    let idx = -1;
    document.querySelectorAll('.cards-cap').forEach((c, i) => { if (i >= 7 && i <= 13 && parseFloat(getComputedStyle(c).fontSize) > 18) idx = i - 7; });
    return idx;
  });
  const beforeSame = await snap();
  await page.mouse.click(sp.x + (cur - 3) * 60, sp.y);
  await page.waitForTimeout(120);
  const duringSame = await snap();
  console.log(`\n点当前选中卡(#${cur + 7}): 切换中=${duringSame.switching} opacity=${duringSame.feedO} sl ${beforeSame.sl}→${duringSame.sl}`);

  await page.waitForTimeout(300);
  await page.screenshot({ path: 'outputs/verify-ws-switch.png' });
  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
