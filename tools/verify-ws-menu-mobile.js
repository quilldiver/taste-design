const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{w:390,h:844},{w:768,h:1024}]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
    await page.waitForTimeout(700);
    await page.evaluate(h => window.scrollTo(0, h), vp.h);
    await page.waitForTimeout(1700);
    const sp = await page.evaluate(() => { const r = document.querySelector('.cards-stage').getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; });
    await page.mouse.click(sp.x, sp.y);
    await page.waitForTimeout(1600);
    const d = await page.evaluate(() => {
      const list = document.querySelector('#cardsWorks .wd-list');
      const lr = list.getBoundingClientRect();
      const on = list.querySelector('.wd-l3b.is-on');
      const r = on.getBoundingClientRect();
      return { listW: +lr.width.toFixed(0), listRight: +lr.right.toFixed(1), onRight: +r.right.toFixed(1), fs: getComputedStyle(on).fontSize, disp: getComputedStyle(list).display, txt: on.textContent.trim() };
    });
    console.log(`${vp.w}: 栏宽=${d.listW} 选中「${d.txt}」${d.fs} 右缘=${d.onRight} 栏右=${d.listRight} 溢出=${(d.onRight-d.listRight).toFixed(1)}px display=${d.disp}`);
    await page.screenshot({ path: `outputs/verify-ws-menu-${vp.w}.png` });
    await page.close();
  }
  await browser.close();
})();
