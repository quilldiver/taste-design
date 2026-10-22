/* 验证顶部导航改成「三个定位符」之后的行为：
   ① 三项顺序与文案：首页 / 作品 / 关于我们（不再是 我们 / 作品）
   ② 点击 → 滚到第 1 / 2 / 3 屏，地址栏同步 #home / #works / #contact
   ③ 当前屏高亮跟着滚动走（aria-current 只有一个）
   ④ 深链（带 hash 打开）直接落位；旧的 #/works 不再报错、回到第一屏
   ⑤ 作品集展开时点别的屏 → 先退场再滚走，回第二屏仍干净（21 张卡都在）
   ⑥ 窄屏三项不折行、不贴边
   用法：node tools/verify-nav.js [width] [height]  */
const { chromium } = require('/Users/chenyuan/.workbuddy/binaries/node/workspace/node_modules/playwright');
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900);
const URL = 'file:///Users/chenyuan/Documents/GitHub/taste-design/taste-design.html';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const R = [];
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForTimeout(700);

  const st = () => page.evaluate(() => ({
    y: Math.round(scrollY),
    hash: location.hash,
    labels: [...document.querySelectorAll('.menu a')].map(a => a.textContent.replace(/\s+/g, ' ').trim()),
    cur: [...document.querySelectorAll('.menu a')].filter(a => a.hasAttribute('aria-current'))
            .map(a => a.textContent.replace(/\s+/g, '')),
    works: !!window.__worksMode,
    cls: document.querySelector('.cards-screen').className,
    worksHidden: document.getElementById('cardsWorks').hidden,
    listParent: document.getElementById('wdList').parentElement.className,
    vis: [...document.querySelectorAll('.card3d')].filter(c => +c.style.opacity > 0.06).length,
    menuRight: Math.round(Math.max(...[...document.querySelectorAll('.menu a')].map(a => a.getBoundingClientRect().right))),
    lines: [...document.querySelectorAll('.menu .cn')].map(e => Math.round(e.getBoundingClientRect().height)),
    overflowX: document.documentElement.scrollWidth > innerWidth
  }));

  const clickNav = async i => {
    await page.evaluate(i => document.querySelectorAll('.menu a')[i].click(), i);
    /* 1200ms：Chrome 平滑滚动的时长随距离增长（2560×1440 从第 3 屏回第 1 屏约 720ms），
       900ms 采样会读到「还差十几 px」的中间态 */
    await page.waitForTimeout(1200);
  };

  /* 各屏实际顶边（末屏在窄屏上可能高于一屏，不能写死 2*H） */
  const tops = await page.evaluate(() => [...document.querySelectorAll('.screen')].map(s => Math.round(s.getBoundingClientRect().top + scrollY)));

  const init = await st();
  R.push('─ 初始');
  R.push(`  项: ${init.labels.join(' | ')}`);
  R.push(`  高亮: ${init.cur.join(',')}  scrollY=${init.y}  hash=${init.hash || '(空)'}`);
  R.push(`  导航右缘 ${init.menuRight} / ${W}，中文行高 ${init.lines.join('/')}px，横向溢出=${init.overflowX}`);

  R.push('');
  R.push('─ 点击定位');
  const expect = [[1, tops[1], '#works', '作品'], [2, tops[2], '#contact', '关于我们'], [0, tops[0], '#home', '首页']];
  expect.forEach(async () => {});
  for (const [i, top, hash, name] of expect) {
    await clickNav(i);
    const s = await st();
    R.push(`  点「${name}」→ scrollY=${s.y}（期望 ${top}）hash=${s.hash} 高亮=${s.cur.join(',')} ` +
           `${s.y === top && s.hash === hash ? '✔' : '✘'}`);
  }

  await clickNav(1);
  const sp = await page.evaluate(() => {
    const r = document.querySelector('.cards-stage').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(1400);
  const inWorks = await st();
  await clickNav(2);
  const away = await st();
  await clickNav(1);
  await page.waitForTimeout(400);
  const back = await st();
  R.push('');
  R.push('─ 作品集 ↔ 导航');
  R.push(`  进入作品集: works=${inWorks.works} class=${inWorks.cls.includes('is-works')} 列表寄主=${inWorks.listParent}`);
  const awayOK = !away.works && Math.abs(away.y - tops[2]) <= 2 && away.listParent === 'wd-in' && away.worksHidden;
  R.push(`  点「关于我们」: scrollY=${away.y} works=${away.works} 列表已移回=${away.listParent === 'wd-in'} ` +
           `作品集已收起=${away.worksHidden} class=${away.cls.replace('screen cards-screen ', '')} ${awayOK ? '✔' : '✘'}`);
  const backOK = !back.works && back.vis === 21 && !/is-works|is-leaving-works|is-revealing-works|is-entering-works/.test(back.cls);
  R.push(`  回「作品」: works=${back.works} 可见卡=${back.vis}/21 舞台干净=${!/is-works|is-leaving-works|is-revealing-works|is-entering-works/.test(back.cls)} ` +
           `${backOK ? '✔' : '✘'}`);

  R.push('');
  R.push('─ 深链 / 旧地址');
  for (const h of ['#contact', '#works', '#/works', '']) {
    const p = await browser.newPage({ viewport: { width: W, height: H } });
    const e2 = []; p.on('pageerror', e => e2.push(e.message));
    await p.goto(URL + h);
    await p.waitForTimeout(700);
    const s = await p.evaluate(() => ({
      y: Math.round(scrollY),
      cur: [...document.querySelectorAll('.menu a')].filter(a => a.hasAttribute('aria-current')).map(a => a.textContent.replace(/\s+/g, ''))
    }));
    R.push(`  ${h || '(空)'} → scrollY=${s.y} 高亮=${s.cur.join(',') || '无'} 报错=${e2.length ? e2.join('|') : '无'}`);
    await p.close();
  }

  R.push('');
  R.push(`JS 报错：${errors.length ? errors.join(' | ') : '（无）'}`);
  console.log(R.join('\n'));
  await browser.close();
})();
