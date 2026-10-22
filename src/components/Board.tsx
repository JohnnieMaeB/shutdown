// The phrase board (docs/PLAN.md "First version" §2): the place switcher and one big tile per phrase. A tap puts the
// phrase on the show screen. Edit mode adds move, delete and a new-phrase card; nothing else is ever in the way.
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { IconName } from '../art';
import { GROUPS, SIGNALS, type Phrase } from '../content';
import { useField } from '../fields';
import { inGroup, searchPhrases } from '../phrases';
import { add, move, remove, setGroup, setTyping, show, useApp } from '../store';
import { R, useTheme } from '../theme';
import { SIGNAL_COLORS } from '../tokens';
import { Btn, Chip, Ico, Icon, IconBtn, Press, Row, T } from '../ui';
import { Box, PhraseAdder } from './Inputs';

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

/** Type, then the three talk signals (Enhancements #2, #4): always above the phrases, one tap each. */
function QuickRow() {
  const t = useTheme();
  return (
    <Row gap={8}>
      <Btn icon="keyboard" label="Type" height={48} onPress={() => setTyping(true)} a11y="Type something to show or say" />
      {SIGNALS.map(s => (
        <Press key={s.key} onPress={() => show({ text: s.text, e: '', signal: s.key })} accessibilityRole="button"
          accessibilityLabel={'Talk signal ' + s.name + ': ' + s.text}
          style={[s_.signal, { backgroundColor: SIGNAL_COLORS[s.key].bg }]}>
          <Icon name={('signal-' + s.key) as IconName} size={20} color={SIGNAL_COLORS[s.key].ink} />
          <T v="label" w={600} color={SIGNAL_COLORS[s.key].ink}>{s.name}</T>
        </Press>
      ))}
    </Row>
  );
}

export function Board() {
  const t = useTheme();
  const st = useApp();
  const cols = useColumns();
  const [adding, setAdding] = useState(false);
  const query = useField('');
  const searching = !!query.value.trim();
  const list = inGroup(st.phrases, st.group);
  const groupName = GROUPS.find(g => g.key === st.group)?.name ?? '';
  const header = (
    <View style={{ gap: 12 }}>
      <QuickRow />
      {/* Search (Enhancements #5): looks across every place, so you don't have to remember where a phrase lives. */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Box field={query} placeholder="Search all phrases" accessibilityLabel="Search all phrases" returnKeyType="search"
          autoCorrect={false} style={{ flex: 1 }} />
        {searching ? <IconBtn icon="close" label="Clear search" words="Clear" onPress={() => query.set('')} /> : null}
      </View>
    </View>
  );
  if (searching) {
    const found = searchPhrases(st.phrases, query.value);
    return (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: t.gutter, paddingTop: 8, gap: 16 }}>
        {header}
        <T v="caption" muted accessibilityLiveRegion="polite">{found.length ? found.length + (found.length === 1 ? ' phrase' : ' phrases') : 'No phrases match.'}</T>
        <View onLayout={cols.onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: cols.gap }}>
          {found.map(p => <PhraseTile key={p.id} p={p} width={cols.tileW} editing={false} first last place />)}
        </View>
      </ScrollView>
    );
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: t.gutter, paddingTop: 8, gap: 16 }}>
      {header}
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

function PhraseTile({ p, width, editing, first, last, place }: { p: Phrase; width?: number; editing: boolean; first: boolean; last: boolean; place?: boolean }) {
  const t = useTheme();
  const emojiPx = Math.round(t.fs * 2);
  const body = (
    <View style={s.row}>
      {p.e ? <Ico e={p.e} size={emojiPx} /> : null}
      <View style={{ flex: 1 }}>
        <T v="body" w={500} raw>{p.text}</T>
        {/* Search results say which place each phrase lives in. */}
        {place ? <T v="caption" muted>{GROUPS.find(g => g.key === p.group)?.name}</T> : null}
      </View>
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
const s_ = StyleSheet.create({
  signal: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 12, borderRadius: R.full },
});
