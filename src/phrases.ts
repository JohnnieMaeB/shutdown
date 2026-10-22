// Phrase list logic with no React Native imports, so it can be tested in plain Node (tools/test-logic.mjs).
import { GROUP_KEYS, MAX_PHRASE, STARTERS, type GroupKey, type Phrase } from './content';

let seq = 0;
export const newId = () => 'p' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

export const starterPhrases = (): Phrase[] => STARTERS.map((p, i) => ({ ...p, id: 's' + i }));

/** Saved phrases, checked: anything malformed is dropped, an unknown group becomes `main`, text is trimmed and
 *  capped. Nothing saved yet (or unreadable) gives the starters; an empty saved list stays empty. */
export function normalize(raw: unknown): Phrase[] {
  if (!Array.isArray(raw)) return starterPhrases();
  const seen = new Set<string>();
  return raw.flatMap((p): Phrase[] => {
    if (!p || typeof p !== 'object') return [];
    const { id, e, text, group } = p as Partial<Phrase>;
    const t = typeof text === 'string' ? text.trim().slice(0, MAX_PHRASE) : '';
    if (!t) return [];
    let key = typeof id === 'string' && id ? id : newId();
    if (seen.has(key)) key = newId();
    seen.add(key);
    return [{ id: key, e: typeof e === 'string' ? e : '', text: t, group: GROUP_KEYS.includes(group as GroupKey) ? (group as GroupKey) : 'main' }];
  });
}

export const inGroup = (list: Phrase[], g: GroupKey) => list.filter(p => p.group === g);

/** Adds at the end of its group's run, so the board's order doesn't jump around. */
export function addPhrase(list: Phrase[], p: Omit<Phrase, 'id'>): Phrase[] {
  const text = p.text.trim().slice(0, MAX_PHRASE);
  if (!text) return list;
  const item: Phrase = { ...p, text, id: newId() };
  let last = -1;
  list.forEach((q, i) => { if (q.group === p.group) last = i; });
  return last < 0 ? [...list, item] : [...list.slice(0, last + 1), item, ...list.slice(last + 1)];
}

export const removePhrase = (list: Phrase[], id: string) => list.filter(p => p.id !== id);

/** Swaps a phrase with its neighbour in the same group (`dir` -1 = earlier). At either end nothing changes. */
export function movePhrase(list: Phrase[], id: string, dir: -1 | 1): Phrase[] {
  const i = list.findIndex(p => p.id === id);
  if (i < 0) return list;
  const g = list[i].group;
  let j = i + dir;
  while (j >= 0 && j < list.length && list[j].group !== g) j += dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
