// 验证：缩小组卡序 = 作品集分类顺序；卡片 0.75 倍；图片高度增大
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

  const sp = await page.evaluate(() => {
    const s = document.querySelector('.cards-stage');
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1700);

  const info = await page.evaluate(() => {
    const caps = document.querySelectorAll('.cards-cap');
    const order = [];
    caps.forEach((c, i) => { if (i >= 7 && i <= 13) order.push(c.textContent.trim().replace(/^\d+/, '')); });
    const card0 = document.querySelectorAll('.card3d')[10];
    const feed = document.getElementById('wdFeed');
    const img = document.querySelector('#wdFeed .wd-img');
    const stage = document.querySelector('.cards-stage').getBoundingClientRect();
    return {
      capOrder: order,
      cardW: +card0.getBoundingClientRect().width.toFixed(1),
      cardH: +card0.getBoundingClientRect().height.toFixed(1),
      feedH: feed.clientHeight,
      imgH: img ? +img.getBoundingClientRect().height.toFixed(1) : null,
      stageH: +stage.height.toFixed(1),
      stageTop: +stage.top.toFixed(1),
      wsImgH: getComputedStyle(document.getElementById('cardsWorks')).getPropertyValue('--ws-img-h')
    };
  });
  console.log('缩小组卡序:', info.capOrder.join(' → '));
  console.log('卡片尺寸:', info.cardW + '×' + info.cardH, '(应为 66×99 左右)');
  console.log('舞台高:', info.stageH, ' 顶部 y:', info.stageTop);
  console.log('图片流高:', info.feedH, ' 图片高:', info.imgH, ' --ws-img-h:', info.wsImgH);

  // 验证选中卡与左侧 L3 一致（进入默认分类）
  const sel = await page.evaluate(() => {
    const caps = document.querySelectorAll('.cards-cap');
    let t = null;
    caps.forEach((c, i) => { if (i >= 7 && i <= 13 && parseFloat(getComputedStyle(c).fontSize) > 18) t = c.textContent.trim().replace(/^\d+/, ''); });
    const on = document.querySelector('.wd-list .wd-l3b.is-on');
    return { selCap: t, l3: on ? on.textContent.trim() : null, l3sec: on ? on.dataset.sec : null };
  });
  console.log('选中卡:', sel.selCap, ' L3:', sel.l3, '(sec=' + sel.l3sec + ')');

  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-order.png' });
  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
