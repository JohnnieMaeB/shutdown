// Inputs: the themed text box and the phrase adder (an emoji and the words), from Lexi's Inputs.tsx.
import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type TextStyle } from 'react-native';
import { MAX_PHRASE, type GroupKey, type Phrase } from '../content';
import { closeEmoji, toggleEmoji, useField, type Field } from '../fields';
import { firstEmoji } from '../text';
import { R, useTheme } from '../theme';
import { Btn, Chip, Row, T } from '../ui';

type BoxProps = TextInputProps & { field: Field; style?: StyleProp<TextStyle>; lines?: number };
/** A text box (§10): sunken fill, a 1 px strong edge, 12 px corners, the person's font and spacing. */
export const Box = React.forwardRef<TextInputInstance, BoxProps>(function Box({ field, style, lines = 1, multiline, ...rest }, ref) {
  const t = useTheme();
  const base = t.txt('body');
  return (
    <TextInput
      ref={ref}
      value={field.value}
      onChangeText={field.onChange}
      onSelectionChange={field.onSelectionChange}
      placeholderTextColor={t.c.inkMuted}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[base, s.box, {
        borderColor: t.c.borderStrong, backgroundColor: t.c.sunken,
        minHeight: multiline ? (base.lineHeight as number) * lines + 20 : 48,
        paddingHorizontal: Math.round(t.fs * 0.75),
      }, style]}
      {...rest}
    />
  );
});

/** ➕ New phrase: the words, and an emoji to find it by. It joins the group on show. */
export function PhraseAdder({ group, groupName, onAdd, onClose }: {
  group: GroupKey; groupName: string; onAdd: (p: Omit<Phrase, 'id'>) => void; onClose: () => void;
}) {
  const t = useTheme();
  const [err, setErr] = useState('');
  const emo = useField(''), words = useField('');
  const wordsRef = useRef<TextInputInstance>(null);
  React.useEffect(() => { const h = setTimeout(() => wordsRef.current?.focus(), 50); return () => clearTimeout(h); }, []);
  const submit = () => {
    const text = words.ref.current.trim();
    if (!text) { setErr('Type the words first.'); return; }
    onAdd({ e: firstEmoji(emo.ref.current), text, group });
    emo.set(''); words.set(''); setErr(''); closeEmoji();
  };
  return (
    <View style={[s.adder, { borderColor: t.c.borderStrong }]}>
      <T v="label" w={600}>{'New phrase in ' + groupName}</T>
      <Box ref={wordsRef} field={words} multiline lines={2} maxLength={MAX_PHRASE} placeholder="What you want to say"
        accessibilityLabel="What you want to say" />
      <Row gap={8}>
        <Box field={emo} placeholder="🙂" accessibilityLabel="Emoji, optional" maxLength={16} style={{ width: Math.round(t.fs * 4.2), textAlign: 'center' }} />
        <Chip icon="emoji" label="Pick an emoji" onPress={() => toggleEmoji({ key: 'adder-emoji', insert: emo.set, single: true })} />
      </Row>
      {err ? <T v="label" color={t.danger.bg}>{err}</T> : null}
      <Row end>
        <Btn label="Cancel" height={48} onPress={() => { closeEmoji(); onClose(); }} />
        <Btn variant="primary" icon="add" label="Add" height={48} onPress={submit} />
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: R.md, paddingVertical: 10 },
  adder: { alignSelf: 'stretch', gap: 12, padding: 16, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: R.lg },
});
