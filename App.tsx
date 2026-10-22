// Shutdown: one-tap words for autistic adults when speech stops working (docs/PLAN.md). Built from Lexi's
// lexi-native parts. The app opens straight to the phrase board: no welcome screen, no account, nothing online.
import React, { useEffect, useMemo } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Per-weight imports so only the five faces in use are bundled.
import { Lexend_400Regular } from '@expo-google-fonts/lexend/400Regular';
import { Lexend_500Medium } from '@expo-google-fonts/lexend/500Medium';
import { Lexend_600SemiBold } from '@expo-google-fonts/lexend/600SemiBold';
import { AtkinsonHyperlegible_400Regular } from '@expo-google-fonts/atkinson-hyperlegible/400Regular';
import { AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible/700Bold';
import { Board, GroupBar } from './src/components/Board';
import { EmojiPicker, Toast } from './src/components/Overlays';
import { ShowScreen } from './src/components/ShowScreen';
import { TypeScreen } from './src/components/TypeScreen';
import { closeEmoji, getEmojiTarget } from './src/fields';
import { loadVoices, stopSpeaking } from './src/speech';
import { setEditing, setTyping, state, useApp } from './src/store';
import { ThemeContext, makeTheme, useTheme } from './src/theme';
import { Btn, T } from './src/ui';
import { moreContrast, reduceMotion } from './src/a11y';

SplashScreen.preventAutoHideAsync().catch(() => {});
loadVoices(); // so the first Speak already uses the best voice

export default function App() {
  const [loaded, error] = useFonts({ Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <Themed />
    </SafeAreaProvider>
  );
}

function Themed() {
  const st = useApp();
  const scheme = useColorScheme();
  // fontScale is the phone's text size; it changes live when the person changes it in system settings.
  const { width, fontScale } = useWindowDimensions();
  // Reduce Motion and higher contrast are read live (a11y.ts); a change makes a new theme so everything redraws.
  const theme = useMemo(() => makeTheme(st.settings, scheme === 'dark', width, fontScale, moreContrast),
    [st.settings, scheme, width, fontScale, moreContrast, reduceMotion]);
  return (
    <ThemeContext.Provider value={theme}>
      <Shell />
    </ThemeContext.Provider>
  );
}

/** Android back: does nothing on the show screen (the hand-over lock: only holding Done closes it), then closes
 *  the emoji picker, the type screen, and edit mode. */
function useBackButton() {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.showing) return true;
      if (getEmojiTarget()) { closeEmoji(); return true; }
      if (state.typing) { stopSpeaking(); setTyping(false); return true; }
      if (state.editing) { setEditing(false); return true; }
      return false;
    });
    return () => sub.remove();
  }, []);
}

function Shell() {
  const t = useTheme();
  const st = useApp();
  const insets = useSafeAreaInsets();
  useBackButton();
  return (
    <View style={{ flex: 1, backgroundColor: t.c.canvas }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.topbar, { paddingTop: insets.top + 6, paddingHorizontal: t.gutter }]}>
          <T v="title" accessibilityRole="header">Shutdown</T>
          <Btn icon={st.editing ? 'check' : 'edit'} label={st.editing ? 'Done' : 'Edit'} height={48}
            variant={st.editing ? 'primary' : 'secondary'} onPress={() => { closeEmoji(); setEditing(!st.editing); }}
            a11y={st.editing ? 'Done editing' : 'Edit phrases'} />
        </View>
        <GroupBar />
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <Board />
        </View>
      </KeyboardAvoidingView>
      <EmojiPicker />
      <TypeScreen />
      <ShowScreen />
      <Toast />
    </View>
  );
}

const s = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 60, paddingBottom: 6 },
});
