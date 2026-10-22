/* 验证「滚到最后一个作品再继续滚 → 翻到第三屏」这条路：退场后状态要干净
   （worksMode=false、列表已挪回二级页、退场类全部撤掉，回到第二屏不空白）
   用法：node tools/verify-ws-leave-next.js [width] [height] */
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await page.waitForTimeout(1800);

  const sp = await page.evaluate(() => {
    const r = document.querySelector('.cards-stage').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1500);
  await page.mouse.move(W * 0.5, H * 0.75);

  // 一路滚到最后一个作品
  for (let k = 0; k < 300; k++) {
    const at = await page.evaluate(() => {
      const f = document.getElementById('wdFeed');
      return f.scrollLeft >= f.scrollWidth - f.clientWidth - 3;
    });
    if (at) break;
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(16);
  }
  // 继续向下：应退出作品集并翻到第三屏
  for (let k = 0; k < 3; k++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(60); }
  await page.waitForTimeout(1600);

  const st = await page.evaluate(() => {
    const st = document.querySelector('.cards-stage');
    const cs = getComputedStyle(st);
    return {
      y: Math.round(window.scrollY),
      works: !!window.__worksMode,
      hidden: document.getElementById('cardsWorks').hidden,
      parentHidden: !document.getElementById('wdList').closest('#page-detail'),
      cls: st.parentElement.className,
      op: +(+cs.opacity).toFixed(2),
      visibleCards: [...document.querySelectorAll('.card3d')].filter(c => +c.style.opacity > 0.06).length
    };
  });

  // 再滚回第二屏，确认不是一片空白
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight, behavior: 'auto' }));
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.cards-stage'));
    return { op: +(+cs.opacity).toFixed(2), headOp: +(+getComputedStyle(document.querySelector('.cards-head')).opacity).toFixed(2), cards: [...document.querySelectorAll('.card3d')].filter(c => +c.style.opacity > 0.06).length };
  });

  console.log(`─ ${W}×${H}`);
  console.log('翻屏后:', JSON.stringify(st));
  console.log('滚回第二屏:', JSON.stringify(back));
  console.log('判定:',
    st.works === false && st.hidden === true && !/is-works|is-leaving-works/.test(st.cls) && st.op === 1 ? '退场收尾干净 ✔' : '退场收尾不干净 ✘',
    back.op === 1 && back.cards === 21 ? '回屏不空白 ✔' : '回屏异常 ✘');
  console.log('JS 报错：', errors.length ? errors.join(' | ') : '（无）');
  await browser.close();
})();
