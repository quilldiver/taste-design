// 验证：三级菜单选中项不再横向溢出 + 作品集进入动画
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
  await page.waitForTimeout(1800);

  const sp = await page.evaluate(() => { const r = document.querySelector('.cards-stage').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.click(sp.x, sp.y);

  // —— 进入动画采样 ——
  const sample = async (t) => page.evaluate(() => {
    const l = document.querySelector('#cardsWorks .wd-list');
    const f = document.querySelector('#cardsWorks .wd-feed-wrap');
    const tip = getComputedStyle(document.getElementById('cardsWorks'), '::before');
    return {
      list: l ? { o: +getComputedStyle(l).opacity, tr: getComputedStyle(l).transform } : null,
      feed: f ? { o: +getComputedStyle(f).opacity, tr: getComputedStyle(f).transform } : null,
      tipO: tip.opacity
    };
  });
  const seq = [];
  for (const wait of [40, 160, 300, 500, 900]) {
    await page.waitForTimeout(wait === 40 ? 40 : 0);
    if (wait !== 40) await page.waitForTimeout(wait - seq[seq.length-1].t);
    const s = await sample();
    seq.push({ t: wait, ...s });
  }
  await page.waitForTimeout(900);
  console.log('--- 进入动画采样（t=ms 后的 opacity / transform）---');
  for (const s of seq) console.log(`t≈${s.t}ms  list=${s.list && s.list.o.toFixed(2)} ${s.list && s.list.tr}  feed=${s.feed && s.feed.o.toFixed(2)}  tip=${s.tipO}`);

  // —— 三级菜单溢出检查 ——
  const menu = await page.evaluate(() => {
    const list = document.querySelector('#cardsWorks .wd-list');
    const lr = list.getBoundingClientRect();
    const cs = getComputedStyle(list);
    const items = [...list.querySelectorAll('.wd-l3b')];
    const rows = items.map(b => {
      const r = b.getBoundingClientRect();
      const s = getComputedStyle(b);
      return { txt: b.textContent.trim().slice(0, 10), w: +r.width.toFixed(1), right: +r.right.toFixed(1), fs: s.fontSize, tr: s.transform, sw: b.scrollWidth, cw: b.clientWidth };
    });
    const on = items.find(b => b.classList.contains('is-on'));
    const onR = on && on.getBoundingClientRect();
    return {
      listRight: +lr.right.toFixed(1), listW: +lr.width.toFixed(1),
      padRight: cs.paddingRight, overflowX: cs.overflowX,
      onFs: on && getComputedStyle(on).fontSize, onTr: on && getComputedStyle(on).transform,
      onRight: onR && +onR.right.toFixed(1),
      worstRight: Math.max(...rows.map(r => r.right)),
      worstText: rows.sort((a, b) => b.right - a.right)[0]
    };
  });
  console.log('\n--- 三级菜单 ---');
  console.log('栏 right=' + menu.listRight + ' 宽=' + menu.listW + ' padding-right=' + menu.padRight + ' overflowX=' + menu.overflowX);
  console.log('选中项 font-size=' + menu.onFs + ' transform=' + menu.onTr + ' 右缘=' + menu.onRight);
  console.log('最靠右的项: ' + menu.worstText.txt + ' 右缘=' + menu.worstRight + ' → 溢出=' + (menu.worstRight - menu.listRight).toFixed(1) + 'px');

  // 切换到另一个长标题分类，再检查一次
  await page.evaluate(() => { const f = document.getElementById('wdFeed'); f.scrollLeft = 20000; });
  await page.waitForTimeout(600);
  const menu2 = await page.evaluate(() => {
    const list = document.querySelector('#cardsWorks .wd-list');
    const lr = list.getBoundingClientRect();
    const on = list.querySelector('.wd-l3b.is-on');
    const r = on.getBoundingClientRect();
    return { txt: on.textContent.trim(), right: +r.right.toFixed(1), listRight: +lr.right.toFixed(1), fs: getComputedStyle(on).fontSize, lines: Math.round(r.height / parseFloat(getComputedStyle(on).lineHeight)) };
  });
  console.log(`滚动后选中「${menu2.txt}」${menu2.fs} 右缘=${menu2.right} 栏右=${menu2.listRight} 溢出=${(menu2.right - menu2.listRight).toFixed(1)}px 行数=${menu2.lines}`);

  await page.screenshot({ path: 'outputs/verify-ws-menu.png' });
  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
