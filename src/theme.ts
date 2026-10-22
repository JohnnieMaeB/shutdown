// Warm paper (from Lexi's docs/DESIGN_WARM_PAPER.md): the colour tokens from tokens.ts plus type (§2), spacing and
// targets (§3), shape (§4) and elevation (§5). Big type, quiet colour: colour belongs to the emoji and one primary
// button.
import { createContext, useContext } from 'react';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type { FontKey, Settings } from './content';
import { LETTERS, SIZES, SPACING } from './content';
import { stripEmoji, tone } from './text';
import { DANGER, LOOKS, ON_DANGER, SHOW, alpha, resolveLook, withContrast } from './tokens';

/* ---------- fonts ----------
   Lexend (the interface font, 400 / 500 / 600) and Atkinson Hyperlegible ship with the app (Google Fonts, OFL).
   Verdana is a Microsoft font that iOS includes and Android does not, so on Android "Verdana" falls back to
   Atkinson Hyperlegible. Custom fonts pick their weight by family name, not fontWeight. */
const FACE = {
  lexend: { 400: 'Lexend_400Regular', 500: 'Lexend_500Medium', 600: 'Lexend_600SemiBold' },
  atkinson: { 400: 'AtkinsonHyperlegible_400Regular', 700: 'AtkinsonHyperlegible_700Bold' },
};
export const verdanaIsNative = Platform.OS === 'ios';
export type Weight = 400 | 500 | 600 | 700;
function face(font: FontKey, w: Weight): TextStyle {
  if (font === 'verdana' && verdanaIsNative) return { fontFamily: 'Verdana', fontWeight: w >= 600 ? '700' : '400' };
  if (font === 'lexend') return { fontFamily: w >= 600 ? FACE.lexend[600] : w === 500 ? FACE.lexend[500] : FACE.lexend[400] };
  return { fontFamily: w >= 600 ? FACE.atkinson[700] : FACE.atkinson[400] };
}

/** Type roles (§2). Sizes scale with the person's text size (18 px at Medium); nothing is under 16 px. */
export type Role = 'caption' | 'label' | 'body' | 'title' | 'headline' | 'display';
const ROLES: Record<Role, { em: number; w: Weight; lh: number | null; ui: boolean }> = {
  caption: { em: 0.889, w: 500, lh: 1.45, ui: true },
  label: { em: 1, w: 500, lh: 1.3, ui: true },
  body: { em: 1, w: 400, lh: null, ui: false },
  title: { em: 1.222, w: 600, lh: 1.3, ui: true },
  headline: { em: 1.556, w: 600, lh: 1.25, ui: true },
  display: { em: 2, w: 600, lh: 1.2, ui: true },
};

/** Shape (§4). */
export const R = { xs: 6, sm: 8, md: 12, lg: 20, xl: 28, full: 999 } as const;

// RN has no word-spacing style, so Roomy / Extra roomy add a thin (≈0.2 em) or thin + hair (≈0.3 em) space after
// each space in displayed text. Typed text in inputs is left alone.
const WORD_GAP: Record<Settings['letters'], string> = { normal: '', roomy: ' ', xroomy: '  ' };

export type Theme = ReturnType<typeof makeTheme>;

/** `fontScale` is the phone's text size setting. Text scales by itself (allowFontScaling stays on everywhere),
 *  so layout that holds text or emoji (tiles) is multiplied by it too. */
export function makeTheme(S: Settings, systemDark: boolean, windowWidth: number, fontScale = 1, moreContrast = false) {
  const key = resolveLook(S.theme, systemDark);
  const c = withContrast(LOOKS[key], moreContrast);
  const dark = c.dark;
  const fs = (SIZES[S.size] || SIZES.m)[1];
  const lh = (SPACING[S.spacing] || SPACING.wide)[1];
  const [, ls] = LETTERS[S.letters] || LETTERS.normal;
  const gap = WORD_GAP[S.letters] || '';
  const k = Math.max(1, Math.min(fontScale || 1, 3));
  const icons = S.icons;
  const uiFont: FontKey = S.font === 'verdana' ? 'lexend' : S.font;
  const narrow = windowWidth < 380;
  // §3: a 20 px gutter (16 px under 380 px).
  const gutter = narrow ? 16 : 20;
  const contentW = windowWidth - gutter * 2;
  const em = fs * k;
  const ios = Platform.OS === 'ios';

  /* §5 elevation. Light looks: surface, a hairline and a soft ink shadow. Dark looks: surface tone, no shadow. */
  const raised: ViewStyle = dark
    ? { backgroundColor: c.raised, borderWidth: 1, borderColor: c.hairline }
    : { backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline,
        ...(ios ? { boxShadow: '0 1px 2px ' + alpha(c.ink, 0.06) + ', 0 4px 12px ' + alpha(c.ink, 0.06) } : { elevation: 1, shadowColor: c.ink }) };
  const overlay: ViewStyle = dark
    ? { backgroundColor: c.raised, borderWidth: 1, borderColor: c.borderStrong, ...(ios ? { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' } : { elevation: 4, shadowColor: '#000000' }) }
    : { backgroundColor: c.surface, ...(ios ? { boxShadow: '0 2px 6px ' + alpha(c.ink, 0.08) + ', 0 12px 32px ' + alpha(c.ink, 0.12) } : { elevation: 4, shadowColor: c.ink }) };

  const t = {
    c, key, dark, fs, lh, icons, k, em, narrow, gutter, contentW,
    /** The surface tiles and cards sit on: `raised` on dark looks. */
    card: dark ? c.raised : c.surface,
    raised, overlay,
    scrim: dark ? 'rgba(0,0,0,0.6)' : alpha(c.ink, 0.45),
    danger: { bg: DANGER, ink: ON_DANGER },
    show: dark ? SHOW.dark : SHOW.light,
    /** A text style in one of the type roles (§2). Every role keeps the person's letter spacing; body keeps
     *  their line spacing too. `w` changes the weight (600 for active labels, 700 only for emphasis in body). */
    txt(role: Role = 'body', o: { color?: string; w?: Weight; em?: number } = {}): TextStyle {
      const r = ROLES[role];
      const raw = role === 'caption' ? Math.max(16, fs * r.em) : fs * r.em * (o.em ?? 1);
      const size = Math.round(raw * 10) / 10;
      return {
        ...face(r.ui ? uiFont : S.font, o.w ?? r.w),
        fontSize: size, lineHeight: Math.round(size * (r.lh ?? lh)), letterSpacing: size * ls,
        color: o.color ?? c.ink,
      };
    },
    /** The show screen's message: the reading font at a given pixel size, bold, the person's letter spacing. */
    showText(px: number): TextStyle {
      return { ...face(S.font, 700), fontSize: px, lineHeight: Math.round(px * 1.25), letterSpacing: px * ls };
    },
    /** Emoji at a fixed pixel size (they don't shrink with the text size). */
    emoji(px: number): TextStyle { return { fontSize: px, lineHeight: Math.round(px * 1.22), color: c.ink, textAlign: 'center' }; },
    /** Apply the skin tone, hide emoji when icons are off, and widen word gaps. */
    rich(s: string): string {
      const toned = tone(s, S.tone);
      const out = icons ? toned : stripEmoji(toned);
      return gap ? out.replace(/ /g, ' ' + gap) : out;
    },
    toned(s: string): string { return tone(s, S.tone); },
    /** Only the wider word gaps, for words the person typed (their emoji stay as they are). */
    spaced(s: string): string { return gap ? s.replace(/ /g, ' ' + gap) : s; },
  };
  return t;
}

export const ThemeContext = createContext<Theme | null>(null);
export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('ThemeContext missing');
  return t;
}
