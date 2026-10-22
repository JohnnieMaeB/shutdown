// The phone's accessibility settings that change how Lexi looks and moves, kept live.
// Reduce Motion (DESIGN_WARM_PAPER §6): every movement becomes a short fade or nothing.
// Higher contrast (§1): iOS Increase Contrast or Android high-contrast text.
import { AccessibilityInfo, Easing, Platform } from 'react-native';
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
