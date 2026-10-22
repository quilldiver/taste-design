const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{w:1440,h:900},{w:1024,h:768},{w:768,h:1024},{w:390,h:844}]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
    await page.waitForTimeout(700);
    await page.evaluate((h) => window.scrollTo(0, h), vp.h);
    await page.waitForTimeout(1800);
    const sp = await page.evaluate(() => {
      const s = document.querySelector('.cards-stage'); const r = s.getBoundingClientRect();
      return { x: r.x + r.width/2, y: r.y + r.height/2 };
    });
    await page.mouse.click(sp.x, sp.y);
    await page.waitForTimeout(1600);
    const d = await page.evaluate(() => {
      const els = document.querySelectorAll('.card3d');
      const rects = [];
      els.forEach((el,i)=>{ if(i>=7&&i<=13){ const r=el.getBoundingClientRect(); rects.push({i,w:+r.width.toFixed(1),x:+r.x.toFixed(1),right:+r.right.toFixed(1)}); } });
      const caps = document.querySelectorAll('.cards-cap');
      const cr = [];
      caps.forEach((c,i)=>{ if(i>=7&&i<=13){ const r=c.getBoundingClientRect(); cr.push({i,left:+r.left.toFixed(1),right:+r.right.toFixed(1),fs:getComputedStyle(c).fontSize,disp:getComputedStyle(c).display}); } });
      const feed=document.getElementById('wdFeed');
      return { rects, caps: cr, feedH: feed.clientHeight, vw: innerWidth };
    });
    const rowLeft = Math.min(...d.rects.map(r=>r.x));
    const rowRight = Math.max(...d.rects.map(r=>r.right));
    let overlap = 0;
    for (let i=1;i<d.caps.length;i++){
      if (d.caps[i].disp!=='none' && d.caps[i].left < d.caps[i-1].right - 0.5) overlap = Math.max(overlap, d.caps[i-1].right - d.caps[i].left);
    }
    console.log(`${vp.w}x${vp.h}: 卡宽=${d.rects[0].w} 整排=${(rowRight-rowLeft).toFixed(0)}px 视口=${d.vw} 越界=${rowLeft<0||rowRight>d.vw} 图片流高=${d.feedH} 卡名重叠=${overlap.toFixed(1)}px 卡名显示=${d.caps[0].disp}`);
    await page.screenshot({ path: `/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-size-${vp.w}.png` });
    await page.close();
  }
  await browser.close();
})();
