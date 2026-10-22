const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  // 1) 正常：shader 是否编译、画面是否真有内容
  const browser = await chromium.launch();
  for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }, { w: 2560, h: 1440 }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 120)); });
    await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
    await page.waitForTimeout(2200);
    const st = await page.evaluate(() => {
      const c = document.getElementById('shader');
      return { w: c.width, h: c.height, cssH: c.clientHeight, heroBefore: getComputedStyle(document.querySelector('.hero-copy'), '::before').backgroundImage.slice(0, 40) };
    });
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: vp.w, height: Math.min(vp.h, 500) } });
    require('fs').writeFileSync(`outputs/bg-verify-${vp.w}.png`, shot);
    console.log(`${vp.w}x${vp.h}: canvas=${st.w}x${st.h} veil=${st.heroBefore ? 'on' : 'off'} 报错=${errs.join('|') || '无'}`);
    await page.close();
  }
  await browser.close();

  // 2) 关掉 WebGL：看 CSS 兜底
  const b2 = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const p2 = await b2.newPage({ viewport: { width: 1440, height: 900 } });
  await p2.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: 'outputs/bg-fallback.png' });
  const hasGl = await p2.evaluate(() => !!document.getElementById('shader').getContext('webgl'));
  console.log('无 WebGL 时 getContext:', hasGl);
  await b2.close();

  // 3) prefers-reduced-motion：应停在静态帧，不跑 RAF
  const b3 = await chromium.launch();
  const p3 = await b3.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await p3.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await p3.waitForTimeout(1500);
  await p3.screenshot({ path: 'outputs/bg-reduced.png' });
  await b3.close();
})();
