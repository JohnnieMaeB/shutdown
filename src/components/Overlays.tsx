// Things that float above the app: the emoji picker and the toast (from Lexi).
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EMOJI_SETS } from '../content';
import { closeEmoji, useEmojiTarget } from '../fields';
import { useApp } from '../store';
import { R, useTheme } from '../theme';
import { T } from '../ui';

export function EmojiPicker() {
  const t = useTheme();
  const target = useEmojiTarget();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState(0);
  if (!target) return null;
  const pick = (em: string) => { target.insert(em); if (target.single) closeEmoji(); };
  const bottom = insets.bottom + 16;
  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={closeEmoji} accessibilityLabel="Close emoji picker" accessibilityRole="button" />
      <View accessibilityViewIsModal accessibilityLabel="Pick an emoji"
        style={[s.pop, t.overlay, { bottom, maxHeight: Math.min(height * 0.48, 390) }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: t.c.hairline }}
          contentContainerStyle={{ gap: 4, padding: 8 }} keyboardShouldPersistTaps="always">
          {EMOJI_SETS.map(([icon, name], i) => (
            <Pressable key={name} onPress={() => setTab(i)} accessibilityRole="tab" accessibilityLabel={name} accessibilityState={{ selected: i === tab }}
              style={[s.tab, { backgroundColor: i === tab ? t.c.accentTint : 'transparent' }]}>
              <Text style={t.emoji(26)}>{t.toned(icon)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <T v="caption" muted style={{ paddingHorizontal: 16, paddingTop: 8 }}>{EMOJI_SETS[tab][1]}</T>
        <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={s.grid}>
          {EMOJI_SETS[tab][2].split(' ').filter(Boolean).map(em => (
            <Pressable key={em} onPress={() => pick(t.toned(em))} accessibilityRole="button" accessibilityLabel={t.toned(em)}
              style={({ pressed }) => [s.cell, { backgroundColor: pressed ? t.c.accentTint : 'transparent' }]}>
              <Text style={t.emoji(32)}>{t.toned(em)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

export function Toast() {
  const t = useTheme();
  const st = useApp();
  const insets = useSafeAreaInsets();
  if (!st.toast) return null;
  return (
    <View pointerEvents="none" style={[s.toastWrap, { bottom: insets.bottom + 96 }]}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[s.toast, t.overlay]}>
        <T v="label">{st.toast.msg}</T>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pop: { position: 'absolute', left: 16, right: 16, borderRadius: R.xl, overflow: 'hidden' },
  tab: { minWidth: 48, height: 48, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 2 },
  cell: { width: 52, height: 52, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: R.full },
});
