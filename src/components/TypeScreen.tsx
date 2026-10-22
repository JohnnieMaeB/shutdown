// Type to speak (Enhancements #4): one big box, then Show or Speak. Nothing typed here is kept: the words live in
// this screen's own state and are gone when it closes. Keeping them is a choice the person makes, with "Save as
// phrase". (In interviews, 6 of 12 autistic AAC users never accepted apps learning from what they type.)
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GROUPS, MAX_PHRASE } from '../content';
import { useField } from '../fields';
import { speak, stopSpeaking } from '../speech';
import { add, setTyping, show, toast, useApp } from '../store';
import { useTheme } from '../theme';
import { Btn, Row, T } from '../ui';
import { Box } from './Inputs';

export function TypeScreen() {
  const st = useApp();
  if (!st.typing) return null;
  return <Typing />;
}

function Typing() {
  const t = useTheme();
  const st = useApp();
  const insets = useSafeAreaInsets();
  const words = useField('');
  const ref = useRef<TextInputInstance>(null);
  useEffect(() => { const h = setTimeout(() => ref.current?.focus(), 50); return () => clearTimeout(h); }, []);
  const text = words.value.trim();
  const place = GROUPS.find(g => g.key === st.group)?.name ?? 'Main';
  const close = () => { stopSpeaking(); setTyping(false); };
  const save = () => { add({ e: '', text, group: st.group }); toast('Saved to ' + place + '.'); };
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: t.c.canvas }]}>
      <View style={[s.head, { paddingTop: insets.top + 8, paddingHorizontal: t.gutter, borderBottomColor: t.c.hairline }]}>
        <T v="title" accessibilityRole="header">Type</T>
        <Btn icon="close" label="Close" height={48} onPress={close} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: t.gutter, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <Box ref={ref} field={words} multiline lines={4} maxLength={MAX_PHRASE} placeholder="Type what you want to say"
          accessibilityLabel="Type what you want to say" style={{ fontSize: t.fs * 1.333, lineHeight: Math.round(t.fs * 1.333 * 1.4) }} />
        <Row>
          <Btn variant="primary" label="Show" height={56} disabled={!text} onPress={() => { closeKeyboard(ref); show({ text, e: '' }); }} style={{ flexGrow: 1 }} />
          <Btn icon="speaker" label="Speak" height={56} disabled={!text} onPress={() => speak(text)} style={{ flexGrow: 1 }} />
        </Row>
        <Row>
          <Btn icon="add" label={'Save as phrase in ' + place} height={48} disabled={!text} onPress={save} />
          <Btn icon="delete" label="Clear" height={48} disabled={!words.value} onPress={() => { words.set(''); ref.current?.focus(); }} />
        </Row>
        <T v="caption" muted>Nothing you type here is kept unless you save it as a phrase.</T>
      </ScrollView>
    </View>
  );
}

const closeKeyboard = (ref: React.RefObject<TextInputInstance | null>) => ref.current?.blur();

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 10, borderBottomWidth: 1 },
});
