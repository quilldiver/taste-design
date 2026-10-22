// 验证：缩小组卡位更宽松 + 底部居中提示行
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{w:1440,h:900},{w:1920,h:1080},{w:1024,h:768},{w:768,h:1024},{w:390,h:844}]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
    await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
    await page.waitForTimeout(700);
    await page.evaluate(h => window.scrollTo(0, h), vp.h);
    await page.waitForTimeout(1800);
    const sp = await page.evaluate(() => {
      const s = document.querySelector('.cards-stage'); const r = s.getBoundingClientRect();
      return { x: r.x + r.width/2, y: r.y + r.height/2 };
    });
    await page.mouse.click(sp.x, sp.y);
    await page.waitForTimeout(1700);

    const d = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.card3d')].slice(7, 14);
      const rects = els.map(el => { const r = el.getBoundingClientRect(); return { l:+r.left.toFixed(1), r:+r.right.toFixed(1), w:+r.width.toFixed(1), cx:+(r.left+r.width/2).toFixed(1) }; });
      const centers = rects.map(r => r.cx);
      const gaps = centers.slice(1).map((c,i) => +(c-centers[i]).toFixed(1));
      const cs = getComputedStyle(document.getElementById('cardsWorks'), '::before');
      const feed = document.getElementById('wdFeed');
      const works = document.getElementById('cardsWorks').getBoundingClientRect();
      return {
        cardW: rects[0].w, gaps,
        rowL: Math.min(...rects.map(r=>r.l)), rowR: Math.max(...rects.map(r=>r.r)),
        tip: cs.content.replace(/"/g,''), tipFs: cs.fontSize, tipColor: cs.color,
        tipPos: cs.position, tipLeft: cs.left, tipBottom: cs.bottom, tipDisp: cs.display,
        feedH: feed.clientHeight, worksH: +works.height.toFixed(1),
        worksPadBottom: getComputedStyle(document.getElementById('cardsWorks')).paddingBottom,
        vw: innerWidth
      };
    });
    console.log(`${vp.w}x${vp.h}: 卡宽=${d.cardW} 中心间距=${d.gaps.join('/')} 整排=${(d.rowR-d.rowL).toFixed(0)}px(vw=${d.vw}) 越界=${d.rowL<0||d.rowR>d.vw}`);
    console.log(`   提示: "${d.tip}" ${d.tipFs} ${d.tipColor} pos=${d.tipPos} left=${d.tipLeft} bottom=${d.tipBottom} display=${d.tipDisp}`);
    console.log(`   作品区高=${d.worksH} 图片流高=${d.feedH} 底部padding=${d.worksPadBottom}`);
    if (vp.w === 1440) await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-gap.png' });
    if (errors.length) console.log('   JS 报错:', errors.join(' | '));
    await page.close();
  }
  await browser.close();
})();
