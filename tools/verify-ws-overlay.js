// 验证：满幅 + 悬浮列表下的定位 / 切换 / 滚轮 / 退出 / 二级页回归
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const vp = { w: 1440, h: 900 };
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(900);
  await page.evaluate(h => window.scrollTo(0, h), vp.h);
  await page.waitForTimeout(1600);
  const sp = await page.evaluate(() => {
    const s = document.querySelector('.cards-stage'); const r = s.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1700);

  const probe = () => page.evaluate(() => {
    const feed = document.getElementById('wdFeed');
    const inEl = document.getElementById('wdFeedIn');
    const padL = parseFloat(getComputedStyle(inEl).paddingLeft);
    const cur = document.querySelector('#wdList .wd-l3b.is-on');
    const curWork = cur ? document.querySelector(`.wd-work[data-w="${cur.dataset.w}"]`) : null;
    const curSlugOn = document.querySelector('.card3d.is-on');
    return {
      padL: +padL.toFixed(1),
      sl: Math.round(feed.scrollLeft),
      max: Math.round(feed.scrollWidth - feed.clientWidth),
      scrollW: Math.round(feed.scrollWidth),
      curText: cur ? cur.textContent.trim() : null,
      curL: curWork ? +curWork.getBoundingClientRect().left.toFixed(1) : null,
      worksVisible: [...inEl.querySelectorAll('.wd-work')].filter(w => {
        const r = w.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth;
      }).length,
      isFading: document.getElementById('cardsWorks').className,
      selCard: curSlugOn ? curSlugOn.getAttribute('data-s') : null
    };
  });

  console.log('进入作品集:', JSON.stringify(await probe()));

  // 点第 5 张缩小组卡片（切换分类）
  const card = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.card3d')].slice(7, 14);
    const r = cards[4].getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  await page.mouse.click(card.x, card.y);
  await page.waitForTimeout(1200);
  console.log('切换分类后:', JSON.stringify(await probe()));

  // 滚轮向右浏览
  const feedPos = await page.evaluate(() => {
    const r = document.getElementById('wdFeed').getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  await page.mouse.move(feedPos.x, feedPos.y);
  const before = (await probe()).sl;
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(500);
  const after = (await probe()).sl;
  console.log(`滚轮向下: ${before} → ${after} (前进 ${after-before})`);

  // 左滑回滚
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(500);
  const back = (await probe()).sl;
  console.log(`滚轮向上: ${after} → ${back} (回滚 ${after-back})`);

  // 退出：先回到最左（模拟一直向左滚到头），再继续向左滑
  await page.evaluate(() => { document.getElementById('wdFeed').scrollLeft = 0; });
  await page.waitForTimeout(400);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(1600);
  const afterExit = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.card3d')].slice(0, 21);
    const centers = cards.map(c => { const r = c.getBoundingClientRect(); return +(r.left + r.width/2).toFixed(1); });
    const gaps = centers.slice(1).map((c,i) => +(c-centers[i]).toFixed(1)).filter(g => Math.abs(g) > 1);
    const l = document.getElementById('wdList');
    return {
      isWorks: document.querySelector('.cards-screen').classList.contains('is-works'),
      worksBoxHidden: document.getElementById('cardsWorks').hidden,
      listParent: l.parentElement.className,
      listW: +l.getBoundingClientRect().width.toFixed(1),
      listPos: getComputedStyle(l).position,
      gaps: [...new Set(gaps.map(g => Math.round(g)))],
      cardW: +cards[0].getBoundingClientRect().width.toFixed(1)
    };
  });
  console.log('退出后:', JSON.stringify(afterExit));

  // 二级页
  await page.evaluate(() => { location.hash = '#/works'; });
  await page.waitForTimeout(1500);
  const detail = await page.evaluate(() => {
    const l = document.getElementById('wdList').getBoundingClientRect();
    const f = document.getElementById('wdFeed').getBoundingClientRect();
    const inEl = document.getElementById('wdFeedIn');
    return {
      list: [Math.round(l.x), Math.round(l.width)],
      feed: [Math.round(f.x), Math.round(f.width)],
      pos: getComputedStyle(document.getElementById('wdList')).position,
      padIn: getComputedStyle(inEl).paddingLeft,
      overflowX: document.documentElement.scrollWidth > innerWidth + 1
    };
  });
  console.log('二级页:', JSON.stringify(detail));
  if (errors.length) console.log('JS 报错:', errors.join(' | '));
  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/v8-detail.png' });
  await browser.close();
})();
