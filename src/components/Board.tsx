// The phrase board (docs/PLAN.md "First version" §2): the place switcher and one big tile per phrase. A tap puts the
// phrase on the show screen. Edit mode adds move, delete and a new-phrase card; nothing else is ever in the way.
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GROUPS, type Phrase } from '../content';
import { inGroup } from '../phrases';
import { add, move, remove, setGroup, show, useApp } from '../store';
import { R, useTheme } from '../theme';
import { Btn, Chip, Ico, Icon, Press, T } from '../ui';
import { PhraseAdder } from './Inputs';

/** Columns for the tiles: one on a phone, two once each column still holds about 16 em. */
function useColumns() {
  const t = useTheme();
  const [w, setW] = useState(0);
  const gap = 12;
  const min = Math.round(t.em * 16);
  const cols = w ? Math.max(1, Math.floor((w + gap) / (min + gap))) : 1;
  return { gap, cols, tileW: w ? Math.floor((w - gap * (cols - 1)) / cols) : undefined, onLayout: (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width) };
}

/** The places wrap onto a second row rather than scroll sideways, so all five are always on screen. */
export function GroupBar() {
  const t = useTheme();
  const st = useApp();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: t.gutter, paddingVertical: 8 }}>
      {GROUPS.map(g => (
        <Chip key={g.key} emoji={g.e} label={g.name} selected={st.group === g.key} onPress={() => setGroup(g.key)}
          a11y={g.name + ' phrases'} style={{ paddingHorizontal: st.group === g.key ? 9 : 10, gap: 6 }} />
      ))}
    </View>
  );
}

export function Board() {
  const t = useTheme();
  const st = useApp();
  const cols = useColumns();
  const [adding, setAdding] = useState(false);
  const list = inGroup(st.phrases, st.group);
  const groupName = GROUPS.find(g => g.key === st.group)?.name ?? '';
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: t.gutter, paddingTop: 8, gap: 16 }}>
      <View onLayout={cols.onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: cols.gap }}>
        {list.map((p, i) => (
          <PhraseTile key={p.id} p={p} width={cols.tileW} editing={st.editing} first={i === 0} last={i === list.length - 1} />
        ))}
      </View>
      {!list.length && !adding ? (
        <T muted style={{ textAlign: 'center' }}>{'No phrases in ' + groupName + ' yet.'}</T>
      ) : null}
      {st.editing || !list.length ? (
        adding
          ? <PhraseAdder group={st.group} groupName={groupName} onAdd={p => { add(p); setAdding(false); }} onClose={() => setAdding(false)} />
          : <Btn icon="add" label="Add a phrase" onPress={() => setAdding(true)} full />
      ) : null}
    </ScrollView>
  );
}

function PhraseTile({ p, width, editing, first, last }: { p: Phrase; width?: number; editing: boolean; first: boolean; last: boolean }) {
  const t = useTheme();
  const emojiPx = Math.round(t.fs * 2);
  const body = (
    <View style={s.row}>
      {p.e ? <Ico e={p.e} size={emojiPx} /> : null}
      <T v="body" w={500} raw style={{ flex: 1 }}>{p.text}</T>
    </View>
  );
  if (!editing) {
    return (
      <Press onPress={() => show({ text: p.text, e: p.e })} accessibilityRole="button" accessibilityLabel={p.text}
        accessibilityHint="Shows it full screen" style={[s.tile, t.raised, { width, minHeight: Math.round(72 * Math.min(t.k, 1.6)) }]}>
        {body}
      </Press>
    );
  }
  const confirmDelete = () => Alert.alert('Delete this phrase?', p.text, [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(p.id) },
  ]);
  return (
    <View style={[s.tile, t.raised, { width, gap: 12 }]}>
      {body}
      <View style={[s.row, { justifyContent: 'flex-end', gap: 8 }]}>
        <MoveBtn up text={p.text} disabled={first} onPress={() => move(p.id, -1)} />
        <MoveBtn text={p.text} disabled={last} onPress={() => move(p.id, 1)} />
        <Btn variant="danger" label="Delete" height={48} onPress={confirmDelete} a11y={'Delete: ' + p.text} />
      </View>
    </View>
  );
}

/** Labels name the phrase ("Move up: …"), so a screen reader user knows which one moves. */
function MoveBtn({ up, text, disabled, onPress }: { up?: boolean; text: string; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={(up ? 'Move up: ' : 'Move down: ') + text} hitSlop={4}
      style={[s.round, { borderColor: t.c.borderStrong, backgroundColor: t.card, paddingHorizontal: t.icons ? 0 : 14 }]}>
      {t.icons
        ? <Icon name="chevron" style={up ? { transform: [{ rotate: '180deg' }] } : undefined} />
        : <T v="label">{up ? 'Up' : 'Down'}</T>}
    </Press>
  );
}

const s = StyleSheet.create({
  tile: { padding: 16, borderRadius: R.lg, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  round: { minWidth: 48, height: 48, borderRadius: R.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
