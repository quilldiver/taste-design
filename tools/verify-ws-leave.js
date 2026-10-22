/* 验证「从作品页回到大卷」的退场：
   ① 缩小组保持排列（退场期间每张卡的 transform 一帧都不变）
   ② 整块舞台向下移 + 渐隐
   ③ 结束后回到大卷初始态（21 张卡全可见、is-works 撤掉、页头淡回来、作品集归位）
   用法：node tools/verify-ws-leave.js [width] [height]  */
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await page.waitForTimeout(1900);

  const sp = await page.evaluate(() => {
    const r = document.querySelector('.cards-stage').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1500);

  const snap = () => page.evaluate(() => {
    const st = document.querySelector('.cards-stage');
    const cs = getComputedStyle(st);
    const cards = [...document.querySelectorAll('.card3d')];
    const head = document.querySelector('.cards-head');
    return {
      op: +(+cs.opacity).toFixed(3),
      ty: (() => { const m = new DOMMatrixReadOnly(cs.transform); return +m.m42.toFixed(1); })(),
      tr: cards.map(c => c.style.transform),
      vis: cards.map(c => +(+c.style.opacity).toFixed(3)),
      headOp: +(+getComputedStyle(head).opacity).toFixed(2),
      cls: st.parentElement.className,
      worksMode: !!window.__worksMode,
      worksHidden: document.getElementById('cardsWorks').hidden,
      worksOp: +getComputedStyle(document.getElementById('cardsWorks')).opacity,
      cw: +(document.querySelector('.cards-screen').getBoundingClientRect().width ? getComputedStyle(document.querySelector('.cards-screen')).getPropertyValue('--cw') : 0)
    };
  });

  const before = await snap();
  await page.evaluate(() => { document.getElementById('wdFeed').scrollLeft = 0; });
  await page.waitForTimeout(120);
  await page.mouse.move(W * 0.5, H * 0.75);
  await page.mouse.wheel(0, -140);

  const steps = [];
  const t0 = Date.now();
  for (const t of [110, 210, 300, 360, 520, 760, 1100]) {
    const wait = t - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    steps.push({ t, ...(await snap()) });
  }

  const R = [];
  R.push(`─ ${W}×${H}`);
  for (const s of steps) {
    const changed = s.tr.filter((v, i) => v !== steps[0].tr[i]).length;
    R.push(`t≈${String(s.t).padStart(4)}  舞台op=${String(s.op).padEnd(5)} 下移=${String(s.ty).padStart(7)}  排列变动=${String(changed).padStart(2)}/21  页头op=${String(s.headOp).padEnd(4)} 作品集op=${s.worksOp.toFixed(2)} worksMode=${s.worksMode ? 'Y' : 'N'} hidden=${s.worksHidden ? 'Y' : 'N'}`);
  }
  /* 「退场期间」= 定时器触发前的帧。finishWorksExit 正好在 300ms 跑，
     采样点若卡在 300 会随机读到「已经换回大卷」的那一帧（排列变动 21/21），
     ① 会偶发假红；②（op 归零 / 下移到位）则要跨整个窗口取极值，
     否则同样会读到还没沉到底的中间态。 */
  const p1 = steps.filter(s => s.t <= 250);
  const p2 = steps.filter(s => s.t <= 400);
  const last = steps[steps.length - 1];
  const frozen = p1.every(s => JSON.stringify(s.tr) === JSON.stringify(p1[0].tr));
  const minOp = Math.min(...p2.map(s => s.op));
  const maxTy = Math.max(...p2.map(s => s.ty));
  R.push('');
  R.push(`① 退场期间排列冻结（t≤250 全部一致）：${frozen ? '✔' : '✘'}`);
  R.push(`② 下移 + 渐隐：op 最低 ${minOp}，下移最多 ${maxTy}px ${minOp < 0.1 && maxTy > 40 ? '✔' : '✘'}`);
  R.push(`③ 收尾：舞台 op=${last.op} 下移=${last.ty} is-works=${/is-works/.test(last.cls) ? 'Y' : 'N'} is-leaving=${/is-leaving-works/.test(last.cls) ? 'Y' : 'N'} 页头op=${last.headOp} 作品集hidden=${last.worksHidden ? 'Y' : 'N'} 可见卡=${last.vis.filter(v => v > 0.06).length}/21`);
  R.push(`JS 报错：${errors.length ? errors.join(' | ') : '（无）'}`);
  console.log(R.join('\n'));

  // 退场中途留证：确认是「整排一起往下、没有散开」
  await page.evaluate(() => { document.getElementById('wdFeed').scrollLeft = 0; });
  await page.waitForTimeout(1400);
  const sp2 = await page.evaluate(() => {
    const r = document.querySelector('.cards-stage').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(sp2.x, sp2.y);
  await page.waitForTimeout(1600);
  await page.evaluate(() => { document.getElementById('wdFeed').scrollLeft = 0; });
  await page.waitForTimeout(140);
  await page.mouse.wheel(0, -140);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `outputs/leave-mid-${W}.png` });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `outputs/leave-end-${W}.png` });
  console.log(`截图：outputs/leave-mid-${W}.png  outputs/leave-end-${W}.png`);

  await browser.close();
})();
