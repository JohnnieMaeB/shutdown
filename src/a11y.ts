// The phone's accessibility settings that change how the app looks and moves, kept live, plus the two screen
// reader helpers that work the same on both platforms.
// Reduce Motion (DESIGN_WARM_PAPER §6): every movement becomes a short fade or nothing.
// Higher contrast (§1): iOS Increase Contrast or Android high-contrast text.
import { AccessibilityInfo, Easing, Platform, type ViewProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { emit } from './store';

export let reduceMotion = false;
export let moreContrast = false;
const setReduceMotion = (v: boolean) => { reduceMotion = v; emit(); };
const setMoreContrast = (v: boolean) => { moreContrast = v; emit(); };

AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
if (Platform.OS === 'ios') {
  AccessibilityInfo.isDarkerSystemColorsEnabled().then(setMoreContrast).catch(() => {});
  AccessibilityInfo.addEventListener('darkerSystemColorsChanged', setMoreContrast);
} else if (Platform.OS === 'android') {
  AccessibilityInfo.isHighTextContrastEnabled().then(setMoreContrast).catch(() => {});
  AccessibilityInfo.addEventListener('highTextContrastChanged', setMoreContrast);
}

/** Says a message through VoiceOver or TalkBack. Use this, not `accessibilityLiveRegion`: live regions are Android
 *  only, so on iPhone they say nothing. One call on both platforms also means TalkBack never hears it twice. */
export function announce(msg: string) {
  try { AccessibilityInfo.announceForAccessibility(msg); } catch {}
}

/** Props that take a view out of the screen reader's reach while something covers it (the show or type screen).
 *  `accessibilityViewIsModal` on the cover only works on iOS; this is what makes TalkBack stay on the cover too,
 *  and it's what keeps the hand-over lock a lock. */
export function hiddenFromReaders(hidden: boolean): Pick<ViewProps, 'importantForAccessibility' | 'accessibilityElementsHidden'> {
  return { importantForAccessibility: hidden ? 'no-hide-descendants' : 'auto', accessibilityElementsHidden: hidden };
}

/** Motion (§6): 150 ms for press, toggle and tabs; 250 ms for a new line; 350 ms for sheets. No overshoot. */
export const DUR = { press: 150, line: 250, sheet: 350, saved: 500 } as const;
export const EASE = Easing.bezier(0.2, 0, 0, 1);

/** The "Saved" moment's one light haptic (§6). Android uses the view's own haptic feedback, which needs no permission. */
export function savedHaptic() {
  const go = Platform.OS === 'android'
    ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  go.catch(() => {});
}
