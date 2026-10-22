// Emoji and skin tone helpers (from Lexi). No React Native imports, so tools/test-logic.mjs can test them.

// Hermes has supported Unicode property escapes for a while, but keep a surrogate-range fallback so an
// older engine never crashes on boot.
function makeEmojiRe(): RegExp {
  try {
    return new RegExp('\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})*(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})*)*', 'gu');
  } catch {
    const unit = '(?:[\\u00A9\\u00AE\\u203C\\u2049\\u2122\\u2139\\u2194-\\u21AA\\u231A-\\u23FF\\u24C2\\u25AA-\\u27BF\\u2934\\u2935\\u2B05-\\u2B55\\u3030\\u303D\\u3297\\u3299]|\\uD83C[\\uDC00-\\uDFFF]|\\uD83D[\\uDC00-\\uDFFF]|\\uD83E[\\uDC00-\\uDFFF])';
    const mods = '(?:\\uFE0F|\\uD83C[\\uDFFB-\\uDFFF])*';
    return new RegExp(unit + mods + '(?:\\u200D' + unit + mods + ')*', 'g');
  }
}
const EMOJI_RE = makeEmojiRe();
const LEFTOVER_RE = /\uD83C[\uDFFB-\uDFFF]|[‍️]/g;
const MEDIUM_TONE = '\u{1F3FD}';

/** Swap the default medium skin tone for the one picked in settings ('' = yellow). */
export const tone = (s: string, t: string) => (t === MEDIUM_TONE ? String(s) : String(s).split(MEDIUM_TONE).join(t));

export function stripEmoji(t: string): string {
  EMOJI_RE.lastIndex = 0;
  return String(t).replace(EMOJI_RE, '').replace(LEFTOVER_RE, '').replace(/[ \t]{2,}/g, ' ').replace(/ *\n */g, '\n').trim();
}
/** What gets said out loud for a phrase: line breaks as ". ", emoji removed, runs of spaces collapsed. */
export function speechKey(t: string): string {
  EMOJI_RE.lastIndex = 0;
  return String(t).replace(EMOJI_RE, '').replace(LEFTOVER_RE, '').replace(/[ \t]*\n+\s*/g, '. ').replace(/\s{2,}/g, ' ').trim();
}
export function firstEmoji(s: string): string {
  EMOJI_RE.lastIndex = 0;
  const m = String(s).match(EMOJI_RE);
  return m ? m[0] : '';
}

/** The show screen's type size: as big as fits. Starts from the width, then steps down for longer messages so a
 *  phrase of up to 140 characters stays on screen without scrolling. Never below 28 px. */
export function showSize(chars: number, width: number, height: number): number {
  const byWidth = width / 7;
  // Roughly: each line holds width / (0.55 × px) characters, at 1.25 × px per line, in 70 % of the height.
  const byArea = Math.sqrt((width * height * 0.7) / Math.max(chars, 1) / (0.55 * 1.25));
  return Math.round(Math.max(28, Math.min(byWidth, byArea, 72)));
}
