// 验证：作品集满幅 + 悬浮三级列表渐变 + 首屏满幅黑幕
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  for (const vp of [{w:2560,h:1200},{w:1920,h:1080},{w:1440,h:900},{w:1024,h:768},{w:768,h:1024},{w:390,h:844}]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
    await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
    await page.waitForTimeout(1000);
    // 首屏黑幕几何
    const hero = await page.evaluate(() => {
      const c = document.querySelector('.hero-copy');
      const cs = getComputedStyle(c, '::before');
      const h = document.querySelector('.hero').getBoundingClientRect();
      return { beforeL: cs.left, beforeW: cs.width, beforeH: cs.height, beforeTop: cs.top,
               heroH: h.height, vw: innerWidth,
               scrollW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth };
    });
    await page.evaluate(h => window.scrollTo(0, h), vp.h);
    await page.waitForTimeout(1800);
    const sp = await page.evaluate(() => {
      const s = document.querySelector('.cards-stage'); const r = s.getBoundingClientRect();
      return { x: r.x + r.width/2, y: r.y + r.height/2 };
    });
    await page.mouse.click(sp.x, sp.y);
    await page.waitForTimeout(1900);
    const d = await page.evaluate(() => {
      const box = document.getElementById('cardsWorks').getBoundingClientRect();
      const list = document.getElementById('wdList').getBoundingClientRect();
      const feed = document.getElementById('wdFeed');
      const fr = feed.getBoundingClientRect();
      const inEl = document.getElementById('wdFeedIn');
      const cur = document.querySelector('#wdList .wd-l3b.is-on');
      const firstWork = inEl.querySelector('.wd-work');
      const fw = firstWork.getBoundingClientRect();
      const imgs = [...inEl.querySelectorAll('.wd-work')].slice(0,3).map(w => +w.getBoundingClientRect().left.toFixed(0));
      return {
        vw: innerWidth,
        works: [Math.round(box.x), Math.round(box.width)],
        list: [Math.round(list.x), +list.width.toFixed(1)],
        feed: [Math.round(fr.x), Math.round(fr.width)],
        padL: getComputedStyle(inEl).paddingLeft,
        scrollLeft: Math.round(feed.scrollLeft),
        firstWorkL: +fw.left.toFixed(1),
        firstWorkOff: firstWork.offsetLeft,
        listBg: getComputedStyle(document.getElementById('wdList')).backgroundImage.slice(0,60),
        overflowX: document.documentElement.scrollWidth > innerWidth + 1,
        curText: cur ? cur.textContent.trim() : null,
        imgs
      };
    });
    console.log(`${vp.w}x${vp.h}`);
    console.log(`   首屏黑幕: left=${hero.beforeL} w=${hero.beforeW} h=${hero.beforeH} top=${hero.beforeTop} heroH=${Math.round(hero.heroH)} 横向溢出=${hero.scrollW>hero.vw}`);
    console.log(`   作品集: box=${d.works} list=${d.list} feed=${d.feed} padL=${d.padL} scrollLeft=${d.scrollLeft}`);
    console.log(`   首件左缘=${d.firstWorkL} offset=${d.firstWorkOff} 溢出=${d.overflowX} bg=${d.listBg}`);
    await page.screenshot({ path: `/Users/chenyuan/Documents/GitHub/taste-design/outputs/v8-works-${vp.w}.png` });
    if (errors.length) console.log('   JS 报错:', errors.join(' | '));
    await page.close();
  }
  await browser.close();
})();
