// The line icons: white PNGs made by tools/make-icons.mjs, tinted with the look's colours where they're used.
export const ICONS = {
  close: require('../assets/icons/close.png'),
  stop: require('../assets/icons/stop.png'),
  emoji: require('../assets/icons/emoji.png'),
  speaker: require('../assets/icons/speaker.png'),
  back: require('../assets/icons/back.png'),
  delete: require('../assets/icons/delete.png'),
  add: require('../assets/icons/add.png'),
  check: require('../assets/icons/check.png'),
  chevron: require('../assets/icons/chevron.png'),
  flip: require('../assets/icons/flip.png'),
  edit: require('../assets/icons/edit.png'),
  settings: require('../assets/icons/settings.png'),
} as const;
export type IconName = keyof typeof ICONS;
