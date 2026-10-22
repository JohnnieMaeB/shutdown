// App state plus on-phone storage. Everything lives in expo-sqlite's key-value store: the phrases and the reading
// settings. No account, nothing leaves the phone.
import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { DEFAULTS, LETTERS, PITCH_RANGE, RATE_RANGE, SIZES, type GroupKey, type Phrase, type Settings } from './content';
import { addPhrase, movePhrase, normalize, removePhrase } from './phrases';

type State = {
  settings: Settings;
  phrases: Phrase[];
  group: GroupKey;
  editing: boolean;
  /** The phrase on the show screen, or null. */
  showing: { text: string; e: string } | null;
  toast: { msg: string; n: number } | null;
};

const KEYS = { settings: 'shutdown.settings', phrases: 'shutdown.phrases' };

function readKv<T>(k: string, d: T): T {
  try { const v = Storage.getItemSync(k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; }
}
function writeKv(k: string, v: unknown) {
  Storage.setItem(k, JSON.stringify(v)).catch(e => { console.warn('kv save', k, e); toast("Couldn't save that on this phone. Try again."); });
}

const THEME_KEYS: Settings['theme'][] = ['auto', 'orange', 'purple', 'mint', 'cream', 'night', 'ember'];
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));
function loadSettings(): Settings {
  const s: Settings = { ...DEFAULTS, ...(readKv<Partial<Settings>>(KEYS.settings, {}) || {}) };
  if (!THEME_KEYS.includes(s.theme)) s.theme = 'auto';
  if (!(s.size in SIZES)) s.size = 'm';
  if (!(s.letters in LETTERS)) s.letters = 'normal';
  s.rate = clamp(Number(s.rate) || DEFAULTS.rate, RATE_RANGE);
  s.pitch = clamp(Number(s.pitch) || DEFAULTS.pitch, PITCH_RANGE);
  return s;
}

// Read synchronously, so the board is drawn with the person's own phrases on the very first frame.
export const state: State = {
  settings: loadSettings(),
  phrases: normalize(readKv<unknown>(KEYS.phrases, null)),
  group: 'main',
  editing: false,
  showing: null,
  toast: null,
};

let version = 0;
const listeners = new Set<() => void>();
export function emit() { version++; listeners.forEach(l => { try { l(); } catch (e) { console.error(e); } }); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Re-render on any state change. The app is small enough that one shared version counter is fine. */
export function useApp(): State { useSyncExternalStore(subscribe, () => version); return state; }

export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  state.settings = { ...state.settings, [k]: v };
  writeKv(KEYS.settings, state.settings); emit();
}

/* ---------- phrases ---------- */
function savePhrases(next: Phrase[]) {
  if (next === state.phrases) return;
  state.phrases = next;
  writeKv(KEYS.phrases, next); emit();
}
export const add = (p: Omit<Phrase, 'id'>) => savePhrases(addPhrase(state.phrases, p));
export const remove = (id: string) => savePhrases(removePhrase(state.phrases, id));
export const move = (id: string, dir: -1 | 1) => savePhrases(movePhrase(state.phrases, id, dir));

/* ---------- ui ---------- */
export function setGroup(g: GroupKey) { state.group = g; emit(); }
export function setEditing(on: boolean) { state.editing = on; emit(); }
export function show(p: { text: string; e: string } | null) { state.showing = p; emit(); }

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string) {
  state.toast = { msg, n: (state.toast?.n || 0) + 1 }; emit();
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; emit(); }, 3200);
}
