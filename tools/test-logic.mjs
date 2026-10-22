// Tests for the logic that has no React Native in it: the phrase list, the show screen's type size, emoji helpers
// and colour contrast. Runs on plain Node (18+): each .ts file is turned into JavaScript with the TypeScript
// compiler already in devDependencies, so there is nothing else to install.  npm test
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const cache = new Map();
/** A tiny CommonJS loader for src/*.ts files that import only each other. */
function load(rel) {
  const file = path.join(root, 'src', rel.replace(/^\.\//, '') + '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('exports', 'require', 'module', out)(mod.exports, r => (r.startsWith('./') ? load(r) : require(r)), mod);
  return mod.exports;
}

const { STARTERS, GROUP_KEYS, MAX_PHRASE } = load('content');
const P = load('phrases');
const { showSize, stripEmoji, speechKey, firstEmoji, tone } = load('text');
const { LOOKS, SHOW, DANGER, ON_DANGER, contrast } = load('tokens');

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; } catch (e) { console.error('FAIL ' + name + '\n  ' + e.message); process.exitCode = 1; } };

/* ---------- starters ---------- */
test('12 starter phrases, every group has some, all fit', () => {
  assert.equal(STARTERS.length, 12);
  for (const g of GROUP_KEYS) assert.ok(STARTERS.some(p => p.group === g), g + ' is empty');
  for (const p of STARTERS) assert.ok(p.text.length <= MAX_PHRASE && p.text.trim() === p.text, p.text);
});

/* ---------- normalize ---------- */
test('nothing saved gives the starters', () => {
  assert.equal(P.normalize(null).length, 12);
  assert.equal(P.normalize('junk').length, 12);
});
test('an empty saved list stays empty (deleting everything sticks)', () => assert.deepEqual(P.normalize([]), []));
test('bad items are dropped, unknown groups go to main, text is trimmed and capped', () => {
  const out = P.normalize([null, 5, { text: '  ' }, { id: 'a', text: '  hi  ', group: 'mars', e: 3 }, { id: 'b', text: 'x'.repeat(200), group: 'work' }]);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { id: 'a', e: '', text: 'hi', group: 'main' });
  assert.equal(out[1].text.length, MAX_PHRASE);
  assert.equal(out[1].group, 'work');
});
test('duplicate ids get new ones', () => {
  const out = P.normalize([{ id: 'a', text: 'one' }, { id: 'a', text: 'two' }]);
  assert.notEqual(out[0].id, out[1].id);
});

/* ---------- add / remove / move ---------- */
const base = () => P.starterPhrases();
test('add goes to the end of its own group, not the end of the list', () => {
  const list = P.addPhrase(base(), { e: '', text: ' new ', group: 'out' });
  const out = P.inGroup(list, 'out');
  assert.equal(out[out.length - 1].text, 'new');
  assert.equal(list.length, 13);
  assert.equal(list.findIndex(p => p.text === 'new'), 6); // right after the two Out starters
});
test('add to an empty group appends; blank text is ignored', () => {
  const list = P.addPhrase([], { e: '', text: 'a', group: 'home' });
  assert.equal(list.length, 1);
  assert.equal(P.addPhrase(list, { e: '', text: '   ', group: 'home' }), list);
});
test('remove drops only that phrase', () => {
  const list = base();
  const out = P.removePhrase(list, list[3].id);
  assert.equal(out.length, 11);
  assert.ok(!out.some(p => p.id === list[3].id));
});
test('move swaps within the group and skips other groups', () => {
  const list = [{ id: 'a', e: '', text: 'a', group: 'main' }, { id: 'x', e: '', text: 'x', group: 'out' }, { id: 'b', e: '', text: 'b', group: 'main' }];
  assert.deepEqual(P.movePhrase(list, 'b', -1).map(p => p.id), ['b', 'x', 'a']);
  assert.equal(P.movePhrase(list, 'a', -1), list); // already first
  assert.equal(P.movePhrase(list, 'b', 1), list);  // already last
  assert.equal(P.movePhrase(list, 'nope', 1), list);
});

/* ---------- search ---------- */
test('search finds every typed word, in any place, ignoring case, accents and apostrophes', () => {
  const list = base();
  assert.deepEqual(P.searchPhrases(list, 'QUIET').map(p => p.group), ['main']);
  assert.equal(P.searchPhrases(list, 'cant talk').length, 2); // main and out, typed without the apostrophe
  assert.equal(P.searchPhrases(list, 'talk  hear').length, 1); // both words, any order
  assert.deepEqual(P.searchPhrases(list, '   '), []);
  assert.deepEqual(P.searchPhrases(list, 'zebra'), []);
  assert.equal(P.searchPhrases([{ id: 'x', e: '', text: 'Café noise', group: 'out' }], 'cafe').length, 1);
});

/* ---------- talk signal ---------- */
const { SIGNALS } = load('content');
const { SIGNAL_COLORS } = load('tokens');
test('three signals in badge order, each with its own shape and 7:1 colours', () => {
  assert.deepEqual(SIGNALS.map(s => s.key), ['green', 'yellow', 'red']);
  assert.equal(new Set(SIGNALS.map(s => s.shape)).size, 3);
  for (const s of SIGNALS) {
    const c = SIGNAL_COLORS[s.key];
    assert.ok(contrast(c.ink, c.bg) >= 7, s.key + ' ' + contrast(c.ink, c.bg).toFixed(2));
    assert.ok(s.share.toLowerCase().includes(s.key));
  }
});

/* ---------- show screen type size ---------- */
test('short phrases are big, long ones smaller, never under 28 px or over 72 px', () => {
  const [w, h] = [360, 600];
  const short = showSize(8, w, h), mid = showSize(60, w, h), long = showSize(140, w, h);
  assert.ok(short >= mid && mid >= long, [short, mid, long].join(' '));
  assert.ok(short <= 72 && long >= 28);
  assert.equal(showSize(140, 200, 200), 28);
});
test('every starter fits the show screen on a small phone (320 x 480)', () => {
  for (const p of STARTERS) {
    const px = showSize(p.text.length, 320, 480);
    const perLine = Math.floor(320 / (0.6 * px));       // a little wider than showSize assumes
    const lines = Math.ceil(p.text.length / perLine) + 1; // +1 for word wrap
    assert.ok(lines * px * 1.25 <= 480, p.text + ' at ' + px + 'px');
  }
});

/* ---------- text helpers ---------- */
test('emoji helpers', () => {
  assert.equal(stripEmoji('🤐 I can hear you 👍🏽'), 'I can hear you');
  assert.equal(speechKey('Hi 👋🏽\nthere'), 'Hi. there');
  assert.equal(firstEmoji('abc ✍🏽 x 🚪'), '✍🏽');
  assert.equal(tone('👍🏽', ''), '👍');
});

/* ---------- contrast ---------- */
test('show colours are the maximum contrast', () => {
  assert.equal(Math.round(contrast(SHOW.light.ink, SHOW.light.bg)), 21);
  assert.equal(Math.round(contrast(SHOW.dark.ink, SHOW.dark.bg)), 21);
});
test('every look: text 4.5:1 on canvas, surface and tint; primary button 4.5:1', () => {
  for (const [k, c] of Object.entries(LOOKS)) {
    for (const bg of [c.canvas, c.surface, c.sunken, c.raised, c.accentTint]) {
      assert.ok(contrast(c.ink, bg) >= 4.5, k + ' ink on ' + bg);
      assert.ok(contrast(c.inkMuted, bg) >= 4.5, k + ' muted on ' + bg);
    }
    assert.ok(contrast(c.onAccent, c.accent) >= 4.5, k + ' primary');
  }
  assert.ok(contrast(ON_DANGER, DANGER) >= 4.5);
});

/* ---------- the web app's copy of the logic ---------- */
// Build web/lib from src/ and load it as the browser would (ES modules), so a change that breaks the web build fails here.
const { execFileSync } = await import('node:child_process');
execFileSync(process.execPath, [path.join(root, 'tools', 'build-web.mjs')], { stdio: 'ignore' });
const web = await import(new URL('../web/lib/phrases.js', import.meta.url).href);
test('web build loads and matches', () => {
  assert.equal(web.normalize(null).length, 12);
  assert.deepEqual(web.normalize(null).map(p => p.text), P.normalize(null).map(p => p.text));
});

console.log(passed + ' passed' + (process.exitCode ? ', some failed' : ''));
