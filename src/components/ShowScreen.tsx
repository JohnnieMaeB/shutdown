// Show mode (docs/PLAN.md "First version" §3): the phrase fills the screen in the biggest type that fits, black on
// white (or white on black), so someone else can read it at a glance. Speaking it is one more tap; Flip turns only
// the message upside down for a person across a table, so the buttons stay the right way up for the owner.
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DUR, savedHaptic } from '../a11y';
import type { IconName } from '../art';
import { speak, stopSpeaking, useSpeaking } from '../speech';
import { show, useApp } from '../store';
import { showSize } from '../text';
import { R, useTheme } from '../theme';
import { FadeIn, Icon, Press, T } from '../ui';

export function ShowScreen() {
  const st = useApp();
  if (!st.showing) return null;
  return <Showing text={st.showing.text} e={st.showing.e} />;
}

function Showing({ text, e }: { text: string; e: string }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const speaking = useSpeaking();
  const [flipped, setFlipped] = useState(false);
  useKeepAwake(); // the screen mustn't dim while someone is reading it
  useEffect(() => {
    savedHaptic(); // a light buzz says it's up, with no sound
    AccessibilityInfo.announceForAccessibility(text);
    return () => stopSpeaking();
  }, [text]);
  const C = t.show;
  const msgW = width - 32;
  const px = showSize(text.length, msgW, height - insets.top - insets.bottom - 120);
  const close = () => { stopSpeaking(); show(null); };
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]}>
      <StatusBar hidden />
      <FadeIn duration={DUR.press} style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <View style={[s.msg, flipped && { transform: [{ rotate: '180deg' }] }]}>
          {e && t.icons ? <Text accessible={false} style={t.emoji(Math.round(px * 1.4))}>{t.toned(e)}</Text> : null}
          {/* showSize() picks the size; shrink-to-fit only catches the odd font or emoji that runs long. */}
          <Text accessibilityRole="header" adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={12} style={[t.showText(px), { color: C.ink, textAlign: 'center' }]}>{t.spaced(text)}</Text>
        </View>
      </FadeIn>
      <View style={[s.bar, { paddingBottom: insets.bottom + 12, borderTopColor: C.edge }]}>
        <ShowBtn icon={speaking ? 'stop' : 'speaker'} label={speaking ? 'Stop' : 'Speak'} onPress={() => (speaking ? stopSpeaking() : speak(text))} />
        <ShowBtn icon="flip" label={flipped ? 'Turn back' : 'Flip'} onPress={() => setFlipped(f => !f)}
          a11y={flipped ? 'Turn the message back' : 'Flip the message for someone across from you'} />
        <ShowBtn icon="close" label="Done" onPress={close} />
      </View>
    </View>
  );
}

/** Buttons drawn in the show colours: an outlined pill with its word, always (no icon-only controls here). */
function ShowBtn({ icon, label, onPress, a11y }: { icon: IconName; label: string; onPress: () => void; a11y?: string }) {
  const t = useTheme();
  const C = t.show;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      style={[s.btn, { borderColor: C.edge }]}>
      {t.icons ? <Icon name={icon} color={C.ink} /> : null}
      <T v="label" w={600} color={C.ink}>{label}</T>
    </Press>
  );
}

const s = StyleSheet.create({
  msg: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  btn: { flex: 1, minHeight: 56, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: R.full, paddingHorizontal: 8 },
});
