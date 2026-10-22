// 验证：图片流滚动跨一级分类时，左侧三级菜单与顶部缩小组选中卡同步
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
  await page.waitForTimeout(1600);

  const read = () => page.evaluate(() => {
    const caps = document.querySelectorAll('.cards-cap');
    const sel = [];
    caps.forEach((c, i) => {
      if (i < 7 || i > 13) return;
      const fs = parseFloat(getComputedStyle(c).fontSize);
      if (fs > 18) sel.push({ i, text: c.textContent.trim().replace(/^\d+/, ''), fs });
    });
    const on = document.querySelector('.wd-list .wd-l3b.is-on');
    const onSec = on ? on.dataset.sec : null;
    const onTxt = on ? on.textContent.trim() : null;
    // 顶部缩小组中「一级分类」顺序 = ITEMS 顺序
    return { selectedCaps: sel, l3On: onTxt, l3Sec: onSec };
  });

  console.log('进入作品集:', JSON.stringify(await read()));

  // 找出与当前 sec 不同的作品，滚过去（模拟用户横向滚动）
  const targets = await page.evaluate(() => {
    const feed = document.getElementById('wdFeed');
    const works = [].slice.call(document.querySelectorAll('#wdFeed .wd-work'));
    const cur = document.querySelector('.wd-list .wd-l3b.is-on');
    const curSec = cur ? cur.dataset.sec : null;
    const out = [];
    const seen = {};
    works.forEach(w => {
      const b = w.querySelector('.wd-cap-t');
      // 从三级按钮里找对应 sec：用 index 对应
      const idx = +w.dataset.w;
      const btn = document.querySelector('.wd-l3b[data-w="' + idx + '"]');
      if (!btn) return;
      const sec = btn.dataset.sec;
      if (sec !== curSec && !seen[sec]) { seen[sec] = 1; out.push({ sec, idx, left: w.offsetLeft, name: b ? b.textContent : '' }); }
    });
    return out;
  });
  console.log('可滚到的其他分类:', targets.map(t => t.sec + '(' + t.name + ')').join(', '));

  // 依次滚到每个其他分类，检查同步
  for (const t of targets.slice(0, 6)) {
    await page.evaluate((left) => {
      const feed = document.getElementById('wdFeed');
      feed.scrollLeft = left + 10;
    }, t.left);
    await page.waitForTimeout(700);
    const r = await read();
    const capText = r.selectedCaps.map(c => c.text).join(',');
    const ok = r.l3Sec === t.sec;
    console.log(`滚到 ${t.sec}(${t.name}) → L3高亮=${r.l3On}[sec=${r.l3Sec}] 缩小组选中=${capText}  同步=${ok}`);
  }

  await page.screenshot({ path: '/Users/chenyuan/Documents/GitHub/taste-design/outputs/verify-ws-sync.png' });
  console.log('\n--- JS 报错 ---');
  console.log(errors.length ? errors.join('\n') : '（无）');
  await browser.close();
})();
