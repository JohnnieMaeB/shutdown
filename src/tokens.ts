// Warm paper colour tokens (from Lexi's docs/DESIGN_WARM_PAPER.md §1), plus the show screen's own colours.
// Plain data with no React Native imports, so tools/test-logic.mjs can check every text pair for contrast.
// theme.ts turns these into styles.
import type { ThemeKey } from './content';

export type LookKey = Exclude<ThemeKey, 'auto'>;
export type Palette = {
  canvas: string;        // behind everything, and the top bar
  surface: string;       // cards, tiles, secondary buttons on light looks
  sunken: string;        // inputs and segmented tracks
  raised: string;        // dark looks: tiles and cards (light looks use surface)
  ink: string; inkMuted: string;
  accent: string; onAccent: string;   // the one primary fill
  accentInk: string;     // rings, the picked group, links
  accentTint: string;    // selected fills
  borderStrong: string;  // inputs, chips, secondary buttons
  hairline: string;      // card edges
  dark: boolean;
};

export const LOOKS: Record<LookKey, Palette> = {
  cream: {
    canvas: '#F6EEE2', surface: '#FFFBF5', sunken: '#EFE5D6', raised: '#FFFBF5',
    ink: '#17130F', inkMuted: '#4E443B', accent: '#9C4A0B', onAccent: '#FFFBF5', accentInk: '#9C4A0B', accentTint: '#F3E6D9',
    borderStrong: '#8C7F70', hairline: '#E3D6C4', dark: false,
  },
  // "Peach" in Lexi; the key stays `orange` so the two apps share setting names.
  orange: {
    canvas: '#F9E3CC', surface: '#FFF9F2', sunken: '#F3DDC6', raised: '#FFF9F2',
    ink: '#2A1C12', inkMuted: '#5E4335', accent: '#A3480A', onAccent: '#FFF9F2', accentInk: '#93410A', accentTint: '#F4E4D6',
    borderStrong: '#957360', hairline: '#EBCDB0', dark: false,
  },
  purple: {
    canvas: '#F5F0F8', surface: '#FFFCFF', sunken: '#ECE6F1', raised: '#FFFCFF',
    ink: '#221A2E', inkMuted: '#574A6B', accent: '#6E3BC4', onAccent: '#FFFFFF', accentInk: '#6630BB', accentTint: '#EEE5F8',
    borderStrong: '#857A97', hairline: '#E3DAEC', dark: false,
  },
  mint: {
    canvas: '#EEF5EC', surface: '#FBFDF8', sunken: '#E4EDE2', raised: '#FBFDF8',
    ink: '#13261D', inkMuted: '#3A5346', accent: '#1F7A57', onAccent: '#FFFFFF', accentInk: '#1A6A4C', accentTint: '#E1EDE5',
    borderStrong: '#6F877A', hairline: '#D5E4D7', dark: false,
  },
  night: {
    canvas: '#17181D', surface: '#1F2027', sunken: '#121317', raised: '#272932',
    ink: '#ECE7DF', inkMuted: '#DDD7CE', accent: '#F2A65A', onAccent: '#1E1408', accentInk: '#F6B97A', accentTint: '#38302D',
    borderStrong: '#7C7A82', hairline: '#2E3038', dark: true,
  },
  ember: {
    canvas: '#201B17', surface: '#2B2520', sunken: '#1A1612', raised: '#352F2B',
    ink: '#F0E5DE', inkMuted: '#E2D2C6', accent: '#FFB877', onAccent: '#4C2700', accentInk: '#FFB877', accentTint: '#443729',
    borderStrong: '#9E8E82', hairline: '#44392F', dark: true,
  },
};

/** The show screen ignores the look: the most contrast a screen can give, so a stranger can read it at a glance
 *  in glare. Dark looks keep a dark screen, which is kinder in a dim room. */
export const SHOW = {
  light: { bg: '#FFFFFF', ink: '#000000', muted: '#3A3A3A', edge: '#000000' },
  dark: { bg: '#000000', ink: '#FFFFFF', muted: '#D0D0D0', edge: '#FFFFFF' },
};

/** Danger is the same in every look, and always comes with an icon and a word. */
export const DANGER = '#B42F1F', ON_DANGER = '#FFFBF5';

/** Match my device: Cream by day, Ember at night. */
export const resolveLook = (k: ThemeKey, systemDark: boolean): LookKey => (k === 'auto' ? (systemDark ? 'ember' : 'cream') : k);

/** Higher contrast (iOS Increase Contrast, Android high-contrast text): muted ink becomes ink, hairlines get strong. */
export function withContrast(p: Palette, more: boolean): Palette {
  return more ? { ...p, inkMuted: p.ink, hairline: p.borderStrong } : p;
}

/** `rgb(a / pct)` for shadows and scrims, from a #RRGGBB colour. */
export function alpha(hex: string, pct: number): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return 'rgba(' + r + ',' + g + ',' + b + ',' + pct + ')';
}

/** WCAG 2 contrast ratio between two #RRGGBB colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map(i => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
