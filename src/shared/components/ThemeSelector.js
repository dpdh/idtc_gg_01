import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function ThemeSelector({ onClose }) {
  const { theme, themeId, themes, setTheme, themeIds } = useTheme();

  const selectTheme = useCallback(
    (id) => {
      setTheme(id);
      if (onClose) onClose();
    },
    [setTheme, onClose],
  );

  const themeList = themeIds.map((id) => themes[id]);

  return (
    <View style={styles.modal}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pilih Tema Aplikasi</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Tutup"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>10 konfigurasi tema tersedia</Text>

        <View style={styles.grid}>
          {themeList.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.card,
                themeId === t.id && styles.cardActive,
              ]}
              onPress={() => selectTheme(t.id)}
              accessibilityRole="button"
              accessibilityLabel={`Pilih tema ${t.name}`}
              accessibilityState={{ selected: themeId === t.id }}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: t.colors.primary },
                ]}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{t.name}</Text>
                <Text style={styles.cardId}>{t.id}</Text>
              </View>
              {themeId === t.id && (
                <View style={styles.check}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.currentBar}>
          <Text style={styles.currentLabel}>Tema aktif:</Text>
          <Text style={styles.currentValue}>
            {theme.name} ({theme.id})
          </Text>
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={styles.doneButton}
          accessibilityRole="button"
          accessibilityLabel="Selesai"
        >
          <Text style={styles.doneText}>Selesai</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#121a2b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(224,240,255,0.15)',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#f2f6fd',
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  closeText: {
    color: '#f2f6fd',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8292aa',
    fontSize: 13,
    marginBottom: 18,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    width: '48%',
    aspectRatio: 1.35,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(224,240,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActive: {
    borderColor: 'rgba(143,194,255,0.45)',
    backgroundColor: 'rgba(143,194,255,0.08)',
  },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardInfo: {
    alignItems: 'center',
  },
  cardName: {
    color: '#f2f6fd',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardId: {
    color: '#8292aa',
    fontSize: 9,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#42d6a0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#090f1b',
    fontSize: 12,
    fontWeight: '900',
  },
  currentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(224,240,255,0.12)',
  },
  currentLabel: {
    color: '#8292aa',
    fontSize: 11,
    fontWeight: '600',
  },
  currentValue: {
    color: '#f2f6fd',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 180,
  },
  doneButton: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(40,118,232,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(143,194,255,0.4)',
  },
  doneText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});