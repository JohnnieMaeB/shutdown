// Text fields that emoji can be typed into, and the emoji picker's open/close state.
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { Keyboard, type TextInputSelectionChangeEvent } from 'react-native';

/** A text value that remembers the cursor, so 🙂 inserts where the person was typing. */
export function useField(initial = '') {
  const [value, setState] = useState(initial);
  const ref = useRef(initial);
  const sel = useRef({ start: initial.length, end: initial.length });
  const set = useCallback((v: string) => {
    ref.current = v; sel.current = { start: v.length, end: v.length }; setState(v);
  }, []);
  const insert = useCallback((em: string) => {
    const v = ref.current;
    const s = Math.min(sel.current.start, v.length), e = Math.min(sel.current.end, v.length);
    const next = v.slice(0, s) + em + v.slice(e);
    ref.current = next; sel.current = { start: s + em.length, end: s + em.length }; setState(next);
  }, []);
  /** For onChangeText: typing keeps the cursor wherever the keyboard put it. */
  const onChange = useCallback((v: string) => { ref.current = v; setState(v); }, []);
  const onSelectionChange = useCallback((e: TextInputSelectionChangeEvent) => {
    sel.current = e.nativeEvent.selection;
  }, []);
  return { value, ref, sel, set, onChange, insert, onSelectionChange };
}
export type Field = ReturnType<typeof useField>;

/* ---------- emoji picker ---------- */
export type EmojiTarget = { insert: (em: string) => void; single?: boolean; key: string };
let target: EmojiTarget | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useEmojiTarget(): EmojiTarget | null { useSyncExternalStore(subscribe, () => version); return target; }
export function getEmojiTarget() { return target; }
/** Open the picker for a field; tapping the same field's 🙂 again closes it. */
export function toggleEmoji(t: EmojiTarget) {
  target = target && target.key === t.key ? null : t;
  if (target) Keyboard.dismiss(); // the picker takes the keyboard's place
  emit();
}
export function closeEmoji() { if (target) { target = null; emit(); } }
