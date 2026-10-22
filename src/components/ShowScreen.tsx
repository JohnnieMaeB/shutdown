// Show mode (docs/PLAN.md "First version" §3): the message fills the screen in the biggest type that fits, so someone
// else can read it at a glance. A phrase or typed words show black on white (white on black in dark looks); a talk
// signal shows in its own colour with its shape. Speaking is one more tap; Flip turns only the message for a person
// across a table. The hand-over lock (Enhancements #3): Done must be held for a second, so someone holding the phone
// can't wander into the app. Screen reader users close it with a normal double tap.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DUR, announce, savedHaptic } from '../a11y';
import type { IconName } from '../art';
import { SIGNALS } from '../content';
import { speak, stopSpeaking, useSpeaking } from '../speech';
import { show, toast, useApp, type Showing } from '../store';
import { showSize } from '../text';
import { SIGNAL_COLORS } from '../tokens';
import { R, useTheme } from '../theme';
import { FadeIn, Icon, Press, T } from '../ui';

/** How long Done must be held. */
export const HOLD_MS = 1000;
const HINT = 'Hold Done for a second to close.';

export function ShowScreen() {
  const st = useApp();
  if (!st.showing) return null;
  return <ShowingView s={st.showing} />;
}

function ShowingView({ s }: { s: Showing }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const speaking = useSpeaking();
  const [flipped, setFlipped] = useState(false);
  const [hint, setHint] = useState(false);
  const signal = s.signal ? SIGNALS.find(x => x.key === s.signal) : undefined;
  const C = signal ? { bg: SIGNAL_COLORS[signal.key].bg, ink: SIGNAL_COLORS[signal.key].ink, edge: SIGNAL_COLORS[signal.key].ink } : t.show;
  useKeepAwake(); // the screen mustn't dim while someone is reading it
  useEffect(() => {
    savedHaptic(); // a light buzz says it's up, with no sound
    announce(s.text);
    return () => stopSpeaking();
  }, [s.text]);
  const px = showSize(s.text.length, width - 32, height - insets.top - insets.bottom - 160);
  const close = () => { stopSpeaking(); show(null); };
  const send = () => { if (signal) Share.share({ message: signal.share }).catch(() => toast("Couldn't open sharing.")); };
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]}>
      <StatusBar hidden />
      <FadeIn duration={DUR.press} style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <View style={[s_.msg, flipped && { transform: [{ rotate: '180deg' }] }]}>
          {signal
            ? <Icon name={('signal-' + signal.key) as IconName} size={Math.round(px * 1.6)} color={C.ink} />
            : s.e && t.icons ? <Text accessible={false} style={t.emoji(Math.round(px * 1.4))}>{t.toned(s.e)}</Text> : null}
          {/* showSize() picks the size; shrink-to-fit only catches the odd font or emoji that runs long. */}
          <Text accessibilityRole="header" adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={12}
            style={[t.showText(px), { color: C.ink, textAlign: 'center' }]}>{t.spaced(s.text)}</Text>
        </View>
      </FadeIn>
      {hint ? <T v="label" color={C.ink} style={{ textAlign: 'center', paddingVertical: 6 }}>{HINT}</T> : null}
      <View style={[s_.bar, { paddingBottom: insets.bottom + 12, borderTopColor: C.edge }]}>
        <ShowBtn ink={C.ink} icon={speaking ? 'stop' : 'speaker'} label={speaking ? 'Stop' : 'Speak'} onPress={() => (speaking ? stopSpeaking() : speak(s.text))} />
        {signal
          ? <ShowBtn ink={C.ink} icon="share" label="Send" onPress={send} a11y="Send this signal to someone" />
          : <ShowBtn ink={C.ink} icon="flip" label={flipped ? 'Turn back' : 'Flip'} onPress={() => setFlipped(f => !f)}
              a11y={flipped ? 'Turn the message back' : 'Flip the message for someone across from you'} />}
        <HoldBtn ink={C.ink} onDone={close} onTooShort={() => { setHint(true); announce(HINT); }} />
      </View>
    </View>
  );
}

/** Buttons drawn in the show colours: an outlined pill with its word, always (no icon-only controls here). */
function ShowBtn({ ink, icon, label, onPress, a11y }: { ink: string; icon: IconName; label: string; onPress: () => void; a11y?: string }) {
  const t = useTheme();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} style={[s_.btn, { borderColor: ink }]}>
      {t.icons ? <Icon name={icon} color={ink} /> : null}
      <T v="label" w={600} color={ink}>{label}</T>
    </Press>
  );
}

/** Done, held for HOLD_MS while a fill grows behind the word. A quick tap shows the hint instead. With a screen
 *  reader on, an ordinary activation closes it (holding is hard to do through one). */
function HoldBtn({ ink, onDone, onTooShort }: { ink: string; onDone: () => void; onTooShort: () => void }) {
  const t = useTheme();
  const fill = useRef(new Animated.Value(0)).current;
  const done = useRef(false);
  const [sr, setSr] = useState(false);
  useEffect(() => { AccessibilityInfo.isScreenReaderEnabled().then(setSr).catch(() => {}); }, []);
  const start = () => {
    done.current = false;
    Animated.timing(fill, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start();
  };
  const end = () => { fill.stopAnimation(); fill.setValue(0); };
  return (
    <Press accessibilityRole="button" accessibilityLabel="Done" accessibilityHint={sr ? undefined : 'Press and hold to close'}
      onPress={() => { if (sr) onDone(); else if (!done.current) onTooShort(); }}
      onPressIn={sr ? undefined : start} onPressOut={end}
      onLongPress={sr ? undefined : () => { done.current = true; onDone(); }} delayLongPress={HOLD_MS}
      style={[s_.btn, { borderColor: ink, overflow: 'hidden' }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: ink, opacity: 0.25,
        width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      {t.icons ? <Icon name="close" color={ink} /> : null}
      <T v="label" w={600} color={ink}>Done</T>
    </Press>
  );
}

const s_ = StyleSheet.create({
  msg: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  btn: { flex: 1, minHeight: 56, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: R.full, paddingHorizontal: 8 },
});
