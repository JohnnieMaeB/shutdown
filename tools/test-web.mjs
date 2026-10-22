// Browser test for the web app, in headless Chrome (or Edge) at phone size: install and offline, the talk signal,
// the hand-over lock's timing, type to speak (and that it keeps nothing), Save as phrase, and search.
// It builds web/lib, starts its own server on a spare port, and saves screenshots to test-results/web/.
//   npm run test:web
// Uses the Chrome or Edge already installed (puppeteer-core downloads no browser). Set CHROME_PATH to pick one.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'test-results', 'web');
fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- a browser ---------- */
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
].filter(Boolean);
const executablePath = CANDIDATES.find(p => fs.existsSync(p));
if (!executablePath) {
  console.error('No Chrome or Edge found. Set CHROME_PATH to a Chrome, Chromium or Edge executable.');
  process.exit(1);
}

/* ---------- build and serve ---------- */
execFileSync(process.execPath, [path.join(root, 'tools', 'build-web.mjs')], { stdio: 'ignore' });
const port = 5200 + Math.floor(Math.random() * 600);
const server = spawn(process.execPath, [path.join(root, 'tools', 'serve-web.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('server did not start')), 10000);
  server.stdout.on('data', d => { if (String(d).includes('localhost')) { clearTimeout(t); resolve(); } });
  server.on('exit', code => reject(new Error('server exited ' + code)));
});
const URL_ = 'http://localhost:' + port + '/';

/* ---------- checks ---------- */
const results = [];
const check = (name, ok, extra = '') => { results.push({ ok: !!ok, line: (ok ? 'PASS ' : 'FAIL ') + name + (extra && !ok ? '  (' + extra + ')' : '') }); };
const $hidden = (page, id) => page.evaluate(i => document.getElementById(i).hidden, id);

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(shots, '1-board.png') });
  check('board shows the four Main starters', await page.$$eval('#board .tile', t => t.length) === 4);

  /* install and offline */
  check('manifest has 192 and 512 px icons', await page.evaluate(async () => {
    const m = await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
    return ['192x192', '512x512'].every(s => m.icons.some(i => i.sizes === s)) && m.display === 'standalone';
  }));
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), { timeout: 10000 });
  await page.reload({ waitUntil: 'networkidle0' }); // now controlled by the service worker
  check('service worker controls the page', await page.evaluate(() => !!navigator.serviceWorker.controller));
  const cached = await page.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).length);
  check('app files cached', cached >= 28, cached + ' files');
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(800);
  check('opens offline with its phrases', await page.$$eval('#board .tile', t => t.length) === 4);
  check('icons load offline', await page.evaluate(async () => (await fetch('lib/icons/signal-red.png')).ok));
  await page.screenshot({ path: path.join(shots, '2-offline.png') });
  await page.setOfflineMode(false);
  await page.reload({ waitUntil: 'networkidle0' });

  /* talk signal */
  await page.click('#signals .signal:nth-child(3)');
  await sleep(300);
  const red = await page.evaluate(() => ({ bg: getComputedStyle(document.getElementById('show')).backgroundColor,
    send: !document.getElementById('send').hidden, flip: !document.getElementById('flip').hidden, shape: !document.getElementById('show-shape').hidden }));
  check('red signal: its colour, its shape, Send instead of Flip', red.bg === 'rgb(161, 34, 27)' && red.send && !red.flip && red.shape, JSON.stringify(red));
  const shapeW = await page.$eval('#show-shape', e => e.getBoundingClientRect().width);
  check('signal shape drawn big', shapeW >= 60, shapeW + 'px');
  await page.screenshot({ path: path.join(shots, '3-red.png') });

  /* hand-over lock */
  const box = await (await page.$('#done')).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await sleep(150); await page.mouse.up(); await sleep(200);
  check('quick tap on Done keeps it open and shows the hint', !(await $hidden(page, 'show')) && !(await $hidden(page, 'hold-hint')));
  await page.screenshot({ path: path.join(shots, '4-hint.png') });
  await page.mouse.down(); await sleep(500); await page.mouse.up(); await sleep(200);
  check('half-second hold keeps it open', !(await $hidden(page, 'show')));
  await page.mouse.down(); await sleep(1150);
  const closedWhileHeld = await $hidden(page, 'show');
  await page.mouse.up(); await sleep(200);
  check('one-second hold closes it', closedWhileHeld && await $hidden(page, 'show'));
  check('the board is usable again', await page.evaluate(() => !document.getElementById('app').inert));
  await page.click('#signals .signal:nth-child(1)'); await sleep(200);
  await page.focus('#done'); await page.keyboard.press('Enter'); await sleep(200);
  check('keyboard Enter on Done closes straight away', await $hidden(page, 'show'));

  /* type to speak */
  await page.click('#type-open'); await sleep(200);
  const start = await page.evaluate(() => ({ open: !document.getElementById('type').hidden, focus: document.activeElement.id, off: document.getElementById('type-show').disabled }));
  check('type screen opens focused, with Show off while empty', start.open && start.focus === 'type-text' && start.off, JSON.stringify(start));
  const before = await page.evaluate(() => localStorage.getItem('shutdown.phrases'));
  await page.type('#type-text', 'The bus was late and I need a minute.');
  await page.screenshot({ path: path.join(shots, '5-type.png') });
  await page.click('#type-show'); await sleep(300);
  check('typed words go to the show screen', await page.evaluate(() => document.getElementById('show-text').textContent === 'The bus was late and I need a minute.'));
  await page.focus('#done'); await page.keyboard.press('Enter'); await sleep(200);
  check('back on the type screen with the words', await page.evaluate(() => !document.getElementById('type').hidden && !!document.getElementById('type-text').value));
  check('typing stored nothing', await page.evaluate(b => localStorage.getItem('shutdown.phrases') === b, before));
  await page.click('#type-close'); await sleep(200);
  await page.click('#type-open'); await sleep(200);
  check('closing clears the words', await page.evaluate(() => document.getElementById('type-text').value === ''));
  await page.type('#type-text', 'Typed and saved');
  await page.click('#type-save'); await sleep(200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('shutdown.phrases')).filter(p => p.text === 'Typed and saved').map(p => p.group));
  check('Save as phrase keeps it in the current place', saved.length === 1 && saved[0] === 'main', JSON.stringify(saved));
  await page.click('#type-close'); await sleep(200);

  /* search */
  await page.type('#search', 'cant talk'); await sleep(200);
  const found = await page.evaluate(() => ({ count: document.querySelector('.count-line')?.textContent, places: [...document.querySelectorAll('#board .place')].map(p => p.textContent) }));
  check('search finds "can\'t talk" in Main and Out', found.count === '2 phrases' && found.places.join() === 'Main,Out', JSON.stringify(found));
  await page.screenshot({ path: path.join(shots, '6-search.png') });
  await page.click('#board .tile'); await sleep(200);
  check('a search result opens show mode', !(await $hidden(page, 'show')));
  await page.keyboard.press('Escape'); await sleep(150);
  await page.click('#search', { clickCount: 3 }); await page.keyboard.press('Backspace'); await sleep(150);
  check('clearing search brings the board back', await page.$$eval('#board .tile', t => t.length) === 5);

  check('no console errors', !errors.length, errors.join(' | '));
} finally {
  await browser.close();
  server.kill();
}

for (const r of results) console.log(r.line);
const failed = results.filter(r => !r.ok).length;
console.log((results.length - failed) + ' passed' + (failed ? ', ' + failed + ' failed' : '') + '. Screenshots: test-results/web/');
process.exitCode = failed ? 1 : 0;
