// Shutdown web: the phone app's board, edit mode and show mode for a browser. The phrases, list rules, type size
// and colours come from the phone app's own modules (lib/, built by tools/build-web.mjs), so the two can't drift.
// Phrases are kept in this browser's localStorage only.
import { EMOJI_SETS, GROUPS, MAX_PHRASE, SIGNALS } from './lib/content.js';
import { addPhrase, inGroup, movePhrase, normalize, removePhrase, searchPhrases } from './lib/phrases.js';
import { firstEmoji, showSize, speechKey } from './lib/text.js';
import { LOOKS, SHOW, SIGNAL_COLORS, resolveLook, withContrast } from './lib/tokens.js';

const $ = id => document.getElementById(id);
const KEY = 'shutdown.phrases';

/* ---------- state ---------- */
function load() {
  try { const v = localStorage.getItem(KEY); return normalize(v == null ? null : JSON.parse(v)); } catch { return normalize(null); }
}
const state = { phrases: load(), group: 'main', editing: false, adding: false, showing: null, flipped: false };
function save(next) {
  if (next === state.phrases) return;
  state.phrases = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { toast("Couldn't save that in this browser."); }
  render();
}

/* ---------- colours from tokens.ts ---------- */
const dark = matchMedia('(prefers-color-scheme: dark)');
const more = matchMedia('(prefers-contrast: more)');
function applyLook() {
  const c = withContrast(LOOKS[resolveLook('auto', dark.matches)], more.matches);
  const sh = c.dark ? SHOW.dark : SHOW.light;
  const vars = {
    canvas: c.canvas, surface: c.surface, sunken: c.sunken, raised: c.raised, card: c.dark ? c.raised : c.surface,
    ink: c.ink, 'ink-muted': c.inkMuted, accent: c.accent, 'on-accent': c.onAccent, 'accent-ink': c.accentInk, 'accent-tint': c.accentTint,
    'border-strong': c.borderStrong, hairline: c.hairline, 'show-bg': sh.bg, 'show-ink': sh.ink, 'show-edge': sh.edge,
  };
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty('--' + k, v);
}
dark.addEventListener('change', applyLook);
more.addEventListener('change', applyLook);

/* ---------- small DOM helpers ---------- */
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
    else if (k === 'class') n.className = v;
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid);
  return n;
}
const icon = name => { const s = el('span', { class: 'ico', 'aria-hidden': 'true' }); s.style.setProperty('--icon', 'url(lib/icons/' + name + '.png)'); return s; };
const label = text => el('span', { class: 'lbl' }, text);
function setIcons(root = document) {
  root.querySelectorAll('.ico[data-icon]').forEach(s => s.style.setProperty('--icon', 'url(lib/icons/' + s.dataset.icon + '.png)'));
}
let toastTimer = 0;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}
function announce(msg) { const l = $('live'); l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 50); }
const buzz = () => { try { navigator.vibrate?.(15); } catch {} };

/* ---------- the board ---------- */
function renderGroups() {
  const nav = $('groups');
  nav.replaceChildren(...GROUPS.map(g => el('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(state.group === g.key), 'aria-label': g.name + ' phrases',
    on: { click: () => { state.group = g.key; state.adding = false; render(); } },
  }, el('span', { class: 'e', 'aria-hidden': 'true' }, g.e), g.name)));
}

function tile(p, first, last, withPlace = false) {
  const words = el('span', { class: 'words' }, p.text,
    // Search results say which place each phrase lives in.
    withPlace ? el('span', { class: 'place' }, GROUPS.find(g => g.key === p.group)?.name ?? '') : null);
  const top = el('span', { class: 'row1' }, p.e ? el('span', { class: 'e', 'aria-hidden': 'true' }, p.e) : null, words);
  if (!state.editing || withPlace) {
    return el('button', { type: 'button', class: 'tile', on: { click: () => openShow(p) } }, top);
  }
  return el('div', { class: 'tile' }, top,
    el('div', { class: 'row end' },
      // Labels name the phrase, so they're unique and focus can follow the phrase after a move.
      el('button', { type: 'button', class: 'btn round', 'aria-label': 'Move up: ' + p.text, disabled: first, on: { click: () => save(movePhrase(state.phrases, p.id, -1)) } }, upIcon()),
      el('button', { type: 'button', class: 'btn round', 'aria-label': 'Move down: ' + p.text, disabled: last, on: { click: () => save(movePhrase(state.phrases, p.id, 1)) } }, icon('chevron')),
      el('button', { type: 'button', class: 'btn danger', 'aria-label': 'Delete: ' + p.text, on: { click: () => confirmDelete(p) } }, icon('delete'), label('Delete'))));
}
const upIcon = () => { const s = icon('chevron'); s.style.transform = 'rotate(180deg)'; return s; };

function render() {
  renderGroups();
  const edit = $('edit');
  edit.className = 'btn' + (state.editing ? ' primary' : '');
  edit.replaceChildren(icon(state.editing ? 'check' : 'edit'), label(state.editing ? 'Done' : 'Edit'));
  edit.setAttribute('aria-label', state.editing ? 'Done editing' : 'Edit phrases');

  // Search (Enhancements #5) looks across every place.
  const query = $('search').value;
  if (query.trim()) {
    const found = searchPhrases(state.phrases, query);
    $('board').replaceChildren(
      el('p', { class: 'count-line', role: 'status' }, found.length ? found.length + (found.length === 1 ? ' phrase' : ' phrases') : 'No phrases match.'),
      el('div', { class: 'grid' }, found.map(p => tile(p, true, true, true))));
    return;
  }
  const list = inGroup(state.phrases, state.group);
  const name = GROUPS.find(g => g.key === state.group)?.name ?? '';
  const kids = [el('div', { class: 'grid' }, list.map((p, i) => tile(p, i === 0, i === list.length - 1)))];
  if (!list.length && !state.adding) kids.push(el('p', { class: 'empty' }, 'No phrases in ' + name + ' yet.'));
  if (state.editing || !list.length) {
    kids.push(state.adding ? adder(name) : el('button', { type: 'button', class: 'btn full', on: { click: () => { state.adding = true; render(); } } }, icon('add'), label('Add a phrase')));
  }
  // Keep focus on the same control across a redraw (moving a phrase shouldn't throw keyboard users to the top).
  const focusKey = document.activeElement?.getAttribute('aria-label');
  $('board').replaceChildren(...kids);
  if (focusKey) {
    const same = [...$('board').querySelectorAll('[aria-label]')].find(n => n.getAttribute('aria-label') === focusKey);
    // At the top or bottom the pressed button is now disabled; focus its partner instead of losing it.
    if (same?.disabled) same.parentElement?.querySelector('button:not([disabled])')?.focus(); else same?.focus();
  }
}

/* ---------- the new-phrase card ---------- */
function adder(groupName) {
  const words = el('textarea', { class: 'box', maxlength: MAX_PHRASE, placeholder: 'What you want to say', 'aria-label': 'What you want to say', rows: 2 });
  const emo = el('input', { class: 'box emo', maxlength: 16, placeholder: '🙂', 'aria-label': 'Emoji, optional' });
  const count = el('span', { class: 'count', 'aria-hidden': 'true' }, '0 / ' + MAX_PHRASE);
  const err = el('p', { class: 'err', role: 'alert', hidden: true });
  const pickerSlot = el('div');
  words.addEventListener('input', () => { count.textContent = words.value.length + ' / ' + MAX_PHRASE; });
  const close = () => { state.adding = false; render(); };
  const submit = () => {
    const text = words.value.trim();
    if (!text) { err.textContent = 'Type the words first.'; err.hidden = false; words.focus(); return; }
    save(addPhrase(state.phrases, { e: firstEmoji(emo.value), text, group: state.group }));
    state.adding = false; render(); announce('Added.');
  };
  words.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
  const pick = el('button', { type: 'button', class: 'chip', 'aria-expanded': 'false', on: { click: () => {
    const open = !pickerSlot.firstChild;
    pickerSlot.replaceChildren(...(open ? [picker(e => { emo.value = e; pickerSlot.replaceChildren(); pick.setAttribute('aria-expanded', 'false'); emo.focus(); })] : []));
    pick.setAttribute('aria-expanded', String(open));
  } } }, icon('emoji'), 'Pick an emoji');
  const card = el('div', { class: 'adder' },
    el('span', { class: 'title' }, 'New phrase in ' + groupName),
    words, count,
    el('div', { class: 'row' }, emo, pick),
    pickerSlot, err,
    el('div', { class: 'row end' },
      el('button', { type: 'button', class: 'btn', on: { click: close } }, 'Cancel'),
      el('button', { type: 'button', class: 'btn primary', on: { click: submit } }, icon('add'), label('Add'))));
  card.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  setTimeout(() => words.focus(), 0);
  return card;
}

function picker(onPick) {
  let tab = 0;
  const cells = el('div', { class: 'cells' });
  const tabs = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Emoji sets' });
  const draw = () => {
    tabs.replaceChildren(...EMOJI_SETS.map(([e, name], i) => el('button', { type: 'button', 'aria-label': name, 'aria-pressed': String(i === tab), on: { click: () => { tab = i; draw(); } } }, e)));
    cells.replaceChildren(...EMOJI_SETS[tab][2].split(' ').filter(Boolean).map(e => el('button', { type: 'button', 'aria-label': e, on: { click: () => onPick(e) } }, e)));
  };
  draw();
  return el('div', { class: 'picker' }, tabs, cells);
}

/* ---------- delete ---------- */
let pendingDelete = null;
function confirmDelete(p) {
  pendingDelete = p;
  $('confirm-text').textContent = p.text;
  $('confirm').showModal();
  $('confirm-keep').focus();
}
$('confirm-keep').addEventListener('click', () => $('confirm').close());
$('confirm-delete').addEventListener('click', () => {
  if (pendingDelete) save(removePhrase(state.phrases, pendingDelete.id));
  pendingDelete = null; $('confirm').close(); announce('Deleted.');
});

/* ---------- show mode ---------- */
let wake = null;
let returnFocus = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wake = await navigator.wakeLock.request('screen');
    else if (!on && wake) { await wake.release(); wake = null; }
  } catch { /* not allowed here (for example an http page on a phone): the screen may dim */ }
}
function sizeShow() {
  if (!state.showing) return;
  const msg = $('show-msg');
  const w = msg.clientWidth - 32, h = msg.clientHeight - 32;
  const px = showSize(state.showing.text.length, w, h);
  const text = $('show-text'), emoji = $('show-emoji'), shape = $('show-shape');
  // The emoji or signal shape is drawn a bit bigger than the words, like the phone app.
  const lead = size => {
    emoji.style.fontSize = Math.round(size * 1.4) + 'px';
    shape.style.width = shape.style.height = Math.round(size * 1.6) + 'px';
  };
  // Step down if a long word or font still overflows; showSize() is close but can't measure.
  let size = px;
  text.style.fontSize = size + 'px'; lead(size);
  while (size > 20 && msg.scrollHeight > msg.clientHeight + 1) { size -= 2; text.style.fontSize = size + 'px'; lead(size); }
}
/** Shows a phrase or typed words ({ text, e }), or a talk signal ({ text, signal }) in its own colours and shape. */
function openShow(p) {
  returnFocus = document.activeElement;
  state.showing = p; state.flipped = false;
  const sig = p.signal ? SIGNAL_COLORS[p.signal] : null;
  const showEl = $('show');
  // A signal looks the same in every look; otherwise the show colours from applyLook() apply.
  showEl.style.setProperty('--show-bg', sig ? sig.bg : '');
  showEl.style.setProperty('--show-ink', sig ? sig.ink : '');
  showEl.style.setProperty('--show-edge', sig ? sig.ink : '');
  if (!sig) ['--show-bg', '--show-ink', '--show-edge'].forEach(v => showEl.style.removeProperty(v));
  $('show-text').textContent = p.text;
  $('show-emoji').textContent = p.e || '';
  $('show-emoji').hidden = !p.e || !!sig;
  $('show-shape').hidden = !sig;
  if (sig) $('show-shape').style.setProperty('--icon', 'url(lib/icons/signal-' + p.signal + '.png)');
  $('flip').hidden = !!sig;
  $('send').hidden = !sig;
  $('hold-hint').hidden = true;
  $('show-msg').classList.remove('flipped');
  $('flip').querySelector('.lbl').textContent = 'Flip';
  showEl.hidden = false;
  $('app').inert = true; $('type').inert = true;
  sizeShow();
  buzz(); keepAwake(true); announce(p.text);
  $('done').focus();
}
function closeShow() {
  stopSpeaking();
  state.showing = null;
  $('show').hidden = true;
  $('app').inert = false; $('type').inert = false;
  keepAwake(false);
  returnFocus?.focus?.();
}

/* The hand-over lock (Enhancements #3): with a finger or mouse, Done must be held for a second, so someone holding
   the phone can't wander into the app. A quick tap shows the hint. Keyboards and screen readers (a click with no
   pointer press before it) close straight away; Escape does too. */
const HOLD_MS = 1000;
let holdTimer = 0, held = false, pressed = false;
const done = $('done');
function holdStart(e) {
  if (e.button > 0) return;
  pressed = true; held = false;
  done.classList.add('holding');
  try { done.setPointerCapture(e.pointerId); } catch {}
  holdTimer = setTimeout(() => { held = true; done.classList.remove('holding'); buzz(); closeShow(); }, HOLD_MS);
}
function holdEnd() {
  clearTimeout(holdTimer);
  done.classList.remove('holding');
}
done.addEventListener('pointerdown', holdStart);
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => done.addEventListener(ev, holdEnd));
done.addEventListener('contextmenu', e => e.preventDefault()); // a long press mustn't open the browser's menu
done.addEventListener('click', () => {
  if (!pressed) { closeShow(); return; } // keyboard or screen reader
  pressed = false;
  if (!held) $('hold-hint').hidden = false;
});
$('send').addEventListener('click', async () => {
  const s = SIGNALS.find(x => x.key === state.showing?.signal);
  if (!s) return;
  try {
    if (navigator.share) { await navigator.share({ text: s.share }); return; }
    await navigator.clipboard.writeText(s.share);
    toast('Copied. Paste it into a message.');
  } catch (e) {
    if (e?.name !== 'AbortError') toast("Couldn't share from this browser.");
  }
});
$('flip').addEventListener('click', () => {
  state.flipped = !state.flipped;
  $('show-msg').classList.toggle('flipped', state.flipped);
  $('flip').querySelector('.lbl').textContent = state.flipped ? 'Turn back' : 'Flip';
  $('flip').setAttribute('aria-label', state.flipped ? 'Turn the message back' : 'Flip the message for someone across from you');
});
$('speak').addEventListener('click', () => (speaking ? stopSpeaking() : speak(state.showing?.text || '')));
addEventListener('resize', sizeShow);
document.addEventListener('visibilitychange', () => { if (state.showing && document.visibilityState === 'visible') keepAwake(true); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (state.showing) { e.preventDefault(); closeShow(); }
  else if (!$('type').hidden) { e.preventDefault(); closeType(); }
  else if (state.editing && !state.adding && !$('confirm').open) { state.editing = false; render(); }
});

/* ---------- type to speak (Enhancements #4) ----------
   The words live only in the text box. Nothing is saved, logged or suggested from them; closing clears them.
   "Save as phrase" is the one way to keep them, and it's a choice the person makes. */
const typeBox = $('type-text');
function syncType() {
  const empty = !typeBox.value.trim();
  ['type-show', 'type-speak', 'type-save'].forEach(id => { $(id).disabled = empty; });
  $('type-clear').disabled = !typeBox.value;
  const place = GROUPS.find(g => g.key === state.group)?.name ?? 'Main';
  $('type-save').querySelector('.lbl').textContent = 'Save as phrase in ' + place;
}
function openType() {
  typeBox.value = ''; syncType();
  $('type').hidden = false; $('app').inert = true;
  typeBox.focus();
}
function closeType() {
  stopSpeaking();
  typeBox.value = '';
  $('type').hidden = true; $('app').inert = false;
  $('type-open').focus();
}
typeBox.addEventListener('input', syncType);
$('type-open').addEventListener('click', openType);
$('type-close').addEventListener('click', closeType);
$('type-show').addEventListener('click', () => openShow({ text: typeBox.value.trim(), e: '' }));
$('type-speak').addEventListener('click', () => speak(typeBox.value));
$('type-clear').addEventListener('click', () => { typeBox.value = ''; syncType(); typeBox.focus(); });
$('type-save').addEventListener('click', () => {
  const text = typeBox.value.trim();
  if (!text) return;
  save(addPhrase(state.phrases, { e: '', text, group: state.group }));
  toast('Saved to ' + (GROUPS.find(g => g.key === state.group)?.name ?? 'Main') + '.');
});

/* ---------- talk signal (Enhancements #2) ---------- */
function renderSignals() {
  $('signals').replaceChildren(...SIGNALS.map(s => {
    const b = el('button', { type: 'button', class: 'signal', 'aria-label': 'Talk signal ' + s.name + ': ' + s.text,
      on: { click: () => openShow({ text: s.text, e: '', signal: s.key }) } }, icon('signal-' + s.key), s.name);
    b.style.setProperty('--sig-bg', SIGNAL_COLORS[s.key].bg);
    b.style.setProperty('--sig-ink', SIGNAL_COLORS[s.key].ink);
    return b;
  }));
}
$('search').addEventListener('input', () => render());

/* ---------- speaking (Web Speech) ---------- */
const synth = 'speechSynthesis' in window ? speechSynthesis : null;
let speaking = false;
function setSpeaking(on) {
  speaking = on;
  $('speak').replaceChildren(icon(on ? 'stop' : 'speaker'), label(on ? 'Stop' : 'Speak'));
}
/** The phone app's preference, for browsers: a natural English voice on this device beats a network one. */
function bestVoice() {
  const vs = synth?.getVoices() || [];
  const loc = (navigator.language || 'en-US').toLowerCase();
  const score = v => {
    const n = (v.name + ' ' + v.voiceURI).toLowerCase(), lang = (v.lang || '').replace('_', '-').toLowerCase();
    let s = 0;
    if (/natural|neural|enhanced|premium/.test(n)) s += 30;
    if (v.localService) s += 10;
    if (/google/.test(n)) s += 8;
    if (lang === loc) s += 60; else if (lang.startsWith('en')) s += 35; else s -= 120;
    return s;
  };
  return [...vs].sort((a, b) => score(b) - score(a))[0];
}
function speak(text) {
  if (!synth) { toast("This browser can't speak out loud."); return; }
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(speechKey(text));
  const v = bestVoice();
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = 0.95;
  u.onend = u.onerror = () => setSpeaking(false);
  setSpeaking(true);
  synth.speak(u);
}
function stopSpeaking() { try { synth?.cancel(); } catch {} setSpeaking(false); }
synth?.addEventListener?.('voiceschanged', () => {});

/* ---------- start ---------- */
$('edit').addEventListener('click', () => { state.editing = !state.editing; state.adding = false; render(); });
applyLook();
setIcons();
renderSignals();
render();

/* ---------- offline and installable (Enhancements #1) ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('offline support unavailable', e));
}
