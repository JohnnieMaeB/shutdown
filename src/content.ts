// What Shutdown says out of the box: the starter phrases (docs/PLAN.md "First version"), the places they're grouped
// by, the emoji picker's sets, and the reading settings carried over from Lexi.

/** Phrases are grouped by place. `main` opens first, so the phrases needed most are on the first screen. */
export type GroupKey = 'main' | 'out' | 'health' | 'work' | 'home';
export const GROUPS: { key: GroupKey; e: string; name: string }[] = [
  { key: 'main', e: '⭐', name: 'Main' },
  { key: 'out', e: '🛒', name: 'Out' },
  { key: 'health', e: '🩺', name: 'Health' },
  { key: 'work', e: '💼', name: 'Work' },
  { key: 'home', e: '🏠', name: 'Home' },
];
export const GROUP_KEYS = GROUPS.map(g => g.key);

export type Phrase = { id: string; e: string; text: string; group: GroupKey };

/** The 12 starter phrases. Plain, first person, and true in most moments; testers rewrite them (PLAN.md step 3). */
export const STARTERS: Omit<Phrase, 'id'>[] = [
  { group: 'main', e: '🤐', text: "I'm autistic. I can't talk right now, but I can hear you." },
  { group: 'main', e: '⌨️', text: 'Can I type my answers instead?' },
  { group: 'main', e: '🤫', text: 'I need a quiet place for a few minutes.' },
  { group: 'main', e: '⏳', text: "Please give me some time. I'll be okay." },
  { group: 'out', e: '✍🏽', text: 'Please write it down or show me.' },
  { group: 'out', e: '👍🏽', text: "I'm safe. I just can't talk right now." },
  { group: 'health', e: '✋🏽', text: 'Please tell me before you touch me.' },
  { group: 'health', e: '💡', text: 'The lights and noise are too much for me.' },
  { group: 'work', e: '💬', text: 'Can we talk about this by message later?' },
  { group: 'work', e: '🚪', text: 'I need to step out for a moment.' },
  { group: 'home', e: '🫂', text: "I'm not upset with you. My words have stopped." },
  { group: 'home', e: '🛋️', text: 'I need to be alone for a while.' },
];

/** Longest phrase a person can save: about what still fits the show screen in big type. */
export const MAX_PHRASE = 140;

export const EMOJI_SETS: [string, string, string][] = [
  ['😀', 'Feelings', '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😋 😛 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🫣 🤗 🫡 🤔 🫢 🤭 🤫 🤥 😶 😐 😑 😬 🫠 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵‍💫 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕'],
  ['✋🏽', 'People', '👋🏽 ✋🏽 👌🏽 ✌🏽 🤞🏽 🫰🏽 🤟🏽 🤙🏽 👈🏽 👉🏽 👆🏽 👇🏽 👍🏽 👎🏽 ✊🏽 👊🏽 👏🏽 🙌🏽 🫶🏽 👐🏽 🤲🏽 🤝 🙏🏽 ✍🏽 💪🏽 🧠 🫀 👀 👂🏽 👧🏽 👦🏽 🧒🏽 👩🏽 🧑🏽 👨🏽 👵🏽 🧓🏽 👴🏽 🙋🏽‍♀️ 🙆🏽‍♀️ 🙅🏽‍♀️ 💁🏽‍♀️ 🤷🏽‍♀️ 🤷🏽‍♂️ 🤦🏽‍♀️ 🤦🏽‍♂️ 🧘🏽‍♀️ 🚶🏽‍♀️ 🫂 👪'],
  ['🛒', 'Places', '🏠 🏡 🏫 🏢 🏥 🏪 🛒 🏦 🏛️ ⛪ 🚉 🚏 🚌 🚗 🚕 🚲 ✈️ 🧳 🚪 🛗 🚻 🛋️ 🛏️ 🚿 🌳 🏞️ 🏖️'],
  ['💡', 'Things', '📱 💻 ⌨️ 🖥️ 📷 💡 🕯️ 📓 📝 ✏️ 📅 ⏰ ⏳ 🎧 🔇 🔊 💊 🩺 🩹 🧸 🔑 💳 🪪 💰 🍽️ ☕ 💧 🎁 ⚙️ 🧰'],
  ['❤️', 'Symbols', '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 ✅ ✔️ ❌ ❓ ❗ ⚠️ ℹ️ 💤 💭 💬 🗨️ 🆘 🚫 ⭕ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ ➕ ➖ 🔁 ⏸️ 🤐 🤫'],
];

/* ---------- reading settings (from Lexi) ---------- */
export type FontKey = 'verdana' | 'lexend' | 'atkinson';
export type SizeKey = 's' | 'm' | 'l' | 'xl' | 'xxl';
export type SpacingKey = 'normal' | 'wide' | 'xwide';
/** Letter spacing. Word spacing grows with it, because letter spacing alone slows reading. */
export type LettersKey = 'normal' | 'roomy' | 'xroomy';
/** `auto` = Cream by day, Ember at night. `orange` is shown as Peach. */
export type ThemeKey = 'auto' | 'orange' | 'purple' | 'mint' | 'cream' | 'night' | 'ember';
export type Settings = {
  icons: boolean; font: FontKey; size: SizeKey; spacing: SpacingKey; letters: LettersKey; theme: ThemeKey; tone: string;
  /** Read-aloud voice identifier from expo-speech; '' = the best voice on this phone. */
  voice: string; rate: number; pitch: number;
};
export const DEFAULTS: Settings = {
  icons: true, font: 'verdana', size: 'm', spacing: 'wide', letters: 'normal', theme: 'auto', tone: '\u{1F3FD}',
  voice: '', rate: 0.95, pitch: 1,
};
// The phone's own text size multiplies these (Text keeps allowFontScaling on everywhere).
export const SIZES: Record<SizeKey, [string, number]> = { s: ['Small', 16], m: ['Medium', 18], l: ['Large', 20], xl: ['Extra large', 24], xxl: ['Huge', 28] };
export const SPACING: Record<SpacingKey, [string, number]> = { normal: ['Normal', 1.5], wide: ['Wide', 1.7], xwide: ['Extra wide', 2] };
/** [label, letter spacing em, extra word spacing em] */
export const LETTERS: Record<LettersKey, [string, number, number]> = { normal: ['Normal', 0.012, 0.08], roomy: ['Roomy', 0.06, 0.16], xroomy: ['Extra roomy', 0.12, 0.32] };
export const RATE_RANGE = [0.5, 2.0] as const;
export const PITCH_RANGE = [0.8, 1.2] as const;
