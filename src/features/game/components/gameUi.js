import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const C = {
  bg: '#060c18', panel: '#0d1729', panel2: '#12213a', line: 'rgba(120,170,230,0.18)', text: '#e8f2ff', muted: '#8ea3bf',
  cyan: '#5fd3ff', blue: '#3d8bff', gold: '#f2c45f', green: '#6ee7a8', red: '#ff7f91', purple: '#b898ff',
};

export const STATUS_COLOR = { LOCKED: '#6c7f99', AVAILABLE: C.cyan, ACTIVE: C.gold, COMPLETED: C.green, FAILED: C.red };
export const STATUS_LABEL = { LOCKED: 'TERKUNCI', AVAILABLE: 'TERSEDIA', ACTIVE: 'AKTIF', COMPLETED: 'SELESAI', FAILED: 'GAGAL' };
export const RARITY_COLOR = { common: '#9fb4c8', rare: '#5fd3ff', epic: '#b898ff', legendary: '#f2c45f' };
export const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
export const REDEMPTION_LABEL = { PENDING: 'Menunggu review', CONFIRMED: 'Dikonfirmasi', PROCESSING: 'Diproses', SHIPPED: 'Dikirim', DELIVERED: 'Diterima', REDEEMED: 'Voucher aktif', CANCELLED: 'Dibatalkan' };

export const formatNumber = (n) => Number(n || 0).toLocaleString('id-ID');

export function Pill({ label, color = C.cyan }) {
  return <View style={[ui.pill, { borderColor: `${color}66`, backgroundColor: `${color}18` }]}><Text style={[ui.pillText, { color }]}>{label}</Text></View>;
}

export function ProgressBar({ ratio, color = C.cyan, height = 6 }) {
  return <View style={[ui.track, { height }]}><View style={[ui.fill, { width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, backgroundColor: color }]} /></View>;
}

export function Button({ label, onPress, kind = 'primary', disabled, small, accessibilityLabel }) {
  const styleFor = { primary: ui.btnPrimary, ghost: ui.btnGhost, danger: ui.btnDanger, gold: ui.btnGold }[kind];
  const textFor = kind === 'ghost' ? ui.btnTextLight : ui.btnTextDark;
  return <TouchableOpacity onPress={onPress} disabled={disabled} style={[ui.btn, styleFor, small && ui.btnSmall, disabled && ui.btnDisabled]} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled: !!disabled }}>
    <Text style={[textFor, small && ui.btnTextSmall]}>{label}</Text>
  </TouchableOpacity>;
}

export function Segmented({ options, value, onChange }) {
  return <View style={ui.segment}>{options.map(([id, label]) => <TouchableOpacity key={id} onPress={() => onChange(id)} style={[ui.segmentItem, value === id && ui.segmentActive]} accessibilityRole="tab" accessibilityState={{ selected: value === id }}>
    <Text numberOfLines={1} style={[ui.segmentText, value === id && ui.segmentTextActive]}>{label}</Text>
  </TouchableOpacity>)}</View>;
}

export const ui = StyleSheet.create({
  card: { backgroundColor: C.panel, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.text, fontSize: 15, fontWeight: '800' },
  body: { color: C.muted, fontSize: 12.5, lineHeight: 18 },
  small: { color: C.muted, fontSize: 11 },
  eyebrow: { color: C.cyan, fontSize: 10.5, fontWeight: '900', letterSpacing: 1.4 },
  h1: { color: C.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
  pill: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  pillText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },
  track: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  btn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  btnPrimary: { backgroundColor: C.cyan },
  btnGold: { backgroundColor: C.gold },
  btnDanger: { backgroundColor: C.red },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.line },
  btnDisabled: { opacity: 0.45 },
  btnTextDark: { color: '#04111d', fontWeight: '900', fontSize: 13 },
  btnTextLight: { color: C.text, fontWeight: '800', fontSize: 13 },
  btnTextSmall: { fontSize: 11.5 },
  segment: { flexDirection: 'row', backgroundColor: C.panel, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: C.line, marginVertical: 12 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: C.panel2 },
  segmentText: { color: C.muted, fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: C.cyan },
  input: { backgroundColor: '#08111f', color: C.text, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, marginTop: 4, marginBottom: 10 },
  label: { color: C.muted, fontSize: 11.5, fontWeight: '700' },
  error: { color: '#ffc1cb', backgroundColor: '#3a1520', borderRadius: 10, padding: 10, fontSize: 12.5, marginVertical: 6 },
  success: { color: '#b6f5d2', backgroundColor: '#10301f', borderRadius: 10, padding: 10, fontSize: 12.5, marginVertical: 6 },
});
