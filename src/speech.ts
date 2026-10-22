// 🔊 Speak a phrase in the most natural voice the phone has (expo-speech), from Lexi's speech.ts. Shutdown speaks
// the person's own words, so there are no recorded clips and no pause before the first sentence.
import { useSyncExternalStore } from 'react';
import * as Speech from 'expo-speech';
import { state } from './store';
import { speechKey } from './text';

export type RankedVoice = Speech.Voice & { score: number; english: boolean };

/* ---------- voices ---------- */
// Apple's novelty voices (Zarvox, Bubbles...) and other joke or formant voices sound the most robotic.
const NOVELTY = new Set(['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ',
  'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'fred', 'junior', 'kathy', 'ralph', 'deranged', 'hysterical', 'pipe organ']);

/** The person's locale, e.g. "en-GB". Other languages fall back to US English for now. */
export function userEnglishLocale(): string {
  let loc = 'en-US';
  try { loc = Intl.DateTimeFormat().resolvedOptions().locale || loc; } catch {}
  const [lang, region] = loc.replace('_', '-').split('-');
  return lang.toLowerCase() === 'en' && region ? 'en-' + region.toUpperCase() : 'en-US';
}
const normLang = (l: string) => (l || '').replace('_', '-').toLowerCase();

export function score(v: Speech.Voice, locale: string): number {
  const id = ((v.identifier || '') + ' ' + (v.name || '')).toLowerCase();
  const lang = normLang(v.language);
  let s = 0;
  if (v.quality === Speech.VoiceQuality.Enhanced) s += 40;
  if (/premium/.test(id)) s += 35;
  if (/enhanced/.test(id)) s += 25;
  if (/neural|natural/.test(id)) s += 30;
  if (/siri/.test(id)) s += 22;
  if (/google/.test(id)) s += 12;
  // Shutdown is often used with no signal (a basement, a bus), so voices on the phone beat network ones.
  if (/-local\b/.test(id)) s += 8;
  if (/-network\b/.test(id)) s -= 10;
  if (/compact/.test(id)) s -= 25;
  if (/espeak|eloquence|speech\.synthesis\.voice/.test(id) || NOVELTY.has((v.name || '').toLowerCase())) s -= 80;
  if (lang === locale.toLowerCase()) s += 60;
  else if (lang.startsWith('en')) s += 35;
  else s -= 120;
  return s;
}

let ranked: RankedVoice[] = [];
export function loadVoices(): Promise<RankedVoice[]> {
  const locale = userEnglishLocale();
  return Speech.getAvailableVoicesAsync()
    .then(vs => (ranked = (vs || [])
      .map(v => ({ ...v, score: score(v, locale), english: normLang(v.language).startsWith('en') }))
      .sort((a, b) => b.score - a.score)))
    .catch(e => { console.warn('voices', e); return (ranked = []); });
}
/** The chosen voice if it's still installed, otherwise the best one. */
export function currentVoice(): RankedVoice | undefined {
  const id = state.settings.voice;
  return (id && ranked.find(v => v.identifier === id)) || ranked.find(v => v.english) || ranked[0];
}

/* ---------- speaking ---------- */
let speaking = false;
let version = 0;
const listeners = new Set<() => void>();
function setSpeaking(on: boolean) {
  if (on === speaking) return;
  speaking = on; version++; listeners.forEach(l => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Whether a phrase is being spoken, so the Speak button can become Stop. */
export function useSpeaking(): boolean { useSyncExternalStore(subscribe, () => version); return speaking; }

/** Short pieces at sentence ends; long utterances get cut off on some engines. */
export function sentences(text: string): string[] {
  const t = speechKey(text);
  return (t.match(/[^.!?…\n]+(?:[.!?…]+["')\]]*|$)/g) || []).map(s => s.trim()).filter(s => /[^\s.!?…"'()[\]\-–—,:;]/.test(s));
}

let gen = 0;
/** Says a phrase, interrupting anything already being said. */
export function speak(text: string) {
  stopSpeaking();
  const g = gen;
  const parts = sentences(text);
  if (!parts.length) return;
  setSpeaking(true);
  const S = state.settings;
  const voice = currentVoice()?.identifier;
  parts.forEach((p, i) => {
    const last = i === parts.length - 1;
    const end = () => { if (g === gen && last) setSpeaking(false); };
    // Full volume, said outright: 7 of 12 interviewees find speech too quiet or unclear (Enhancements #7).
    try { Speech.speak(p, { voice, rate: S.rate, pitch: S.pitch, volume: 1.0, onDone: end, onStopped: end, onError: end }); }
    catch (e) { console.warn('speak', e); end(); }
  });
}
export function stopSpeaking() {
  gen++;
  setSpeaking(false);
  try { Speech.stop(); } catch {}
}
