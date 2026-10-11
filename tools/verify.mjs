// Real-Chrome check of the demo at two screen sizes: load, drag to move, resize, reassign,
// zoom, group, search, the over-allocation view, and a clean console. Screenshots go to shots/.
//   npm run serve                    (in another terminal)
//   CHROME=/usr/bin/google-chrome node tools/verify.mjs [http://localhost:8000/]
import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://localhost:8000/';
const CANDIDATES = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const executablePath = process.env.CHROME || CANDIDATES.find((p) => existsSync(p)) || CANDIDATES[0];
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
mkdirSync('shots', { recursive: true });

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
let failed = 0;
const check = (ok, what) => { if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };

async function drag(page, from, to, steps = 12) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
  await page.mouse.up();
  await sleep(300);
}
const centre = (page, selector) => page.evaluate((sel) => {
  const r = document.querySelector(sel).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, right: r.right, top: r.top };
}, selector);
const eventRow = (page, key) => page.evaluate((k) => globalThis.__scheduler().events.get(k), key);

async function run(width, height) {
  console.log(`--- ${width}x${height}`);
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning' || m.text().includes('[lattice]')) problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(url);
  await page.waitForSelector('.lat-sched__bar', { timeout: 30000 });
  await sleep(800);

  const count = await page.evaluate(() => {
    const s = globalThis.__scheduler();
    return { people: s.rows.count - 1, events: s.events.count };
  });
  check(count.people === 25 && count.events >= 150, `loaded ${count.people} people and ${count.events} assignments`);
  check(await page.evaluate(() => { let n = 0; globalThis.__scheduler().events.forEach((e) => { if (e.resourceId === 'unassigned') n += 1; }); return n >= 8; }), 'unassigned work is waiting for an owner');
  check(await page.evaluate(() => document.getElementById('over').textContent.startsWith('Over-allocated:')), 'over-allocated people are named');
  check(await page.evaluate(() => document.querySelectorAll('.lat-sched__load-bucket--over').length > 0), 'over-allocated weeks are marked in the workload strip');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), 'page has no scrollbars');
  await page.screenshot({ path: `shots/${width}-load.png` });

  // The edits run on the ungrouped list; grouped mode is checked below.
  await page.select('#group', '');
  await sleep(600);

  // Move: drag the first bar two weeks' worth of pixels to the right inside its row.
  const key = await page.evaluate(() => {
    const view = document.querySelector('.lat-sched__timeline').getBoundingClientRect();
    const bar = [...document.querySelectorAll('.lat-sched__bar')].find((b) => {
      const r = b.getBoundingClientRect();
      return r.top > view.top + 60 && r.bottom < view.bottom - 60 && r.left > view.left + 20 && r.width > 60 && r.height > 30 && r.right < view.right - 100;
    });
    return bar.dataset.key;
  });
  const first = `.lat-sched__bar[data-key="${key}"]`;
  const before = await eventRow(page, key);
  let c = await centre(page, first);
  await drag(page, c, { x: c.x + 60, y: c.y });
  const moved = await eventRow(page, key);
  check(moved.startDate !== before.startDate && moved.resourceId === before.resourceId, `drag to move: ${before.startDate} to ${moved.startDate}`);

  // Resize: pull the end edge of the same bar to the right.
  const handle = await page.evaluate((sel) => {
    const r = document.querySelector(`${sel} .lat-sched__handle--end`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, first);
  await drag(page, handle, { x: handle.x + 40, y: handle.y });
  const resized = await eventRow(page, key);
  check(resized.endDate > moved.endDate && resized.startDate === moved.startDate, `drag to resize: end ${moved.endDate} to ${resized.endDate}`);

  // Reassign: drop the bar on the next person's row.
  c = await centre(page, first);
  await page.evaluate((id) => { window.__own = id; }, before.resourceId);
  const rowBelow = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.lat-sched__row')];
    const own = rows.findIndex((x) => x.dataset.resource === window.__own);
    const next = rows[own + 1];
    const r = next.getBoundingClientRect();
    return { y: r.top + r.height / 2, id: next.dataset.resource };
  });
  await drag(page, c, { x: c.x, y: rowBelow.y });
  const reassigned = await eventRow(page, key);
  check(reassigned.resourceId === rowBelow.id, `drag to another person: now ${reassigned.resourceId}`);
  check(await page.evaluate(() => !document.getElementById('undo').disabled), 'edits can be undone');
  await page.click('#undo');
  check((await eventRow(page, key)).resourceId === before.resourceId, 'undo puts the work back');
  await page.screenshot({ path: `shots/${width}-edited.png` });

  await page.evaluate(() => { const t = document.querySelector('.lat-sched__timeline'); t.scrollTop = t.scrollHeight; });
  await sleep(500);
  await page.screenshot({ path: `shots/${width}-bottom.png` });
  await page.evaluate(() => { document.querySelector('.lat-sched__timeline').scrollTop = 0; });

  // Zoom.
  const pxs = {};
  for (const level of ['day', 'week', 'month', 'fit']) {
    await page.click(`[data-zoom="${level}"]`);
    await sleep(400);
    const px = await page.evaluate(() => globalThis.__scheduler().getZoom().px);
    pxs[level] = px;
    check(await page.evaluate((l) => document.querySelector(`[data-zoom="${l}"]`).getAttribute('aria-pressed') === 'true', level), `zoom ${level} (${px}px a day)`);
    await page.screenshot({ path: `shots/${width}-zoom-${level}.png` });
  }

  check(pxs.day > pxs.week && pxs.week > pxs.month && pxs.day > pxs.fit, `day is wider than fit (${pxs.day}px vs ${pxs.fit}px a day)`);

  // Group by team.
  await page.select('#group', 'team');
  await sleep(600);
  const groups = await page.evaluate(() => document.querySelectorAll('.lat-sched__group').length);
  const names = await page.evaluate(() => [...document.querySelectorAll('.lat-sched__group')].map((g) => g.dataset.group));
  const shown = await page.evaluate((list) => list.map((n) => [...document.querySelectorAll('.lat-sched__grid *')].filter((e) => e.children.length === 0 && e.textContent.trim() === n).length), names);
  check(names.length > 0 && shown.every((n) => n === 1), `each team name appears once: ${names.join(', ')}`);
  check(groups >= 3, `grouped by team: ${groups} group rows in view`);
  await page.screenshot({ path: `shots/${width}-grouped.png` });
  const clipped = await page.evaluate(() => [...document.querySelectorAll('.lat-sched__grid [role=gridcell], .lat-sched__grid [role=row] > *')].filter((e) => e.scrollWidth > e.clientWidth + 1 && !e.title).map((e) => e.textContent.trim()).slice(0, 5));
  check(clipped.length === 0, `no clipped names without a title ${clipped.join('|')}`);
  await page.select('#group', '');
  await sleep(400);

  // Search.
  const rowsBefore = await page.evaluate(() => document.querySelectorAll('.lat-sched__grid [role=row]').length);
  await page.type('#search', 'Marcus');
  await sleep(600);
  const found = await page.evaluate(() => [...document.querySelectorAll('.lat-sched__row')].map((r) => r.getAttribute('aria-label')));
  check(found.length === 1 && found[0] === 'Marcus Cole', `search narrows to ${found.join(', ')}`);
  await page.screenshot({ path: `shots/${width}-search.png` });
  await page.evaluate(() => { document.getElementById('search').value = ''; document.getElementById('search').dispatchEvent(new Event('input')); });
  await sleep(500);
  check((await page.evaluate(() => document.querySelectorAll('.lat-sched__grid [role=row]').length)) >= rowsBefore - 1, 'clearing the search brings everyone back');

  // Workload off and back on.
  await page.click('#workload');
  await sleep(500);
  check(await page.evaluate(() => document.querySelectorAll('.lat-sched__load').length === 0), 'workload strip hides');
  await page.click('#workload');
  await sleep(500);
  check(await page.evaluate(() => document.querySelectorAll('.lat-sched__load').length > 0), 'workload strip returns');

  check(problems.length === 0, `no console errors or [lattice] warnings ${problems.join(' / ')}`);
  await page.close();
}

try {
  await run(1440, 900);
  await run(1920, 1080);
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
