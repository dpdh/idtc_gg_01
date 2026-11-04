import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faCube, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import ResponsiveContent from '../../../shared/components/ResponsiveContent';
import glbModels from '../data/glbModels';

export default function ThreeDLibrary({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const filteredModels = glbModels.filter((model) => model.name.toLowerCase().includes(searchText.trim().toLowerCase()));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <ResponsiveContent>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>MODEL ASSETS</Text>
          <Text style={styles.title}>GLB library</Text>
          <Text style={styles.subtitle}>Choose a model to open its interactive 3D preview.</Text>
        </View>
        <View style={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} size={15} color="#8292aa" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search GLB models"
            placeholderTextColor="#8292aa"
            style={styles.searchInput}
          />
        </View>
        <View style={styles.grid}>
          {filteredModels.map((model) => (
            <TouchableOpacity
              key={model.id}
              onPress={() => navigation?.navigate('Viewer', { model })}
              accessibilityRole="button"
              style={styles.card}
            >
              <View style={styles.modelVisual}>
                <View style={styles.orbGlow} />
                <FontAwesomeIcon icon={faCube} size={30} color="#a8d4ff" />
                <View style={styles.formatPill}><Text style={styles.formatText}>GLB · 3D</Text></View>
              </View>
              <View style={styles.modelDetails}>
                <Text style={styles.modelName}>{model.name}</Text>
                <Text style={styles.modelDescription}>{model.description}</Text>
                <View style={styles.modelMeta}>
                  <Text style={styles.modelSize}>{model.size}</Text>
                  <View style={styles.openButton}>
                    <Text style={styles.openText}>Open model</Text>
                    <FontAwesomeIcon icon={faArrowRight} size={11} color="#dcecff" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {filteredModels.length === 0 && <Text style={styles.emptyText}>No GLB models match your search.</Text>}
        </View>
      </ResponsiveContent>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090f1b' },
  scrollContent: { flexGrow: 1, paddingTop: 26, paddingBottom: 30 },
  heading: { marginBottom: 20 },
  eyebrow: { color: '#71839e', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  title: { color: '#f3f7ff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#8292aa', fontSize: 14, lineHeight: 20, marginTop: 6 },
  searchBox: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.16)', marginBottom: 18 },
  searchInput: { flex: 1, minWidth: 0, color: '#f5f8ff', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { flexGrow: 1, flexBasis: '30%', minWidth: 240, overflow: 'hidden', borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.065)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.15)' },
  modelVisual: { height: 170, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#13243b' },
  orbGlow: { position: 'absolute', width: 126, height: 126, borderRadius: 63, backgroundColor: '#398ef5', opacity: 0.18 },
  formatPill: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(8,17,31,0.58)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.14)' },
  formatText: { color: '#bbdcff', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  modelDetails: { padding: 16 },
  modelName: { color: '#edf4ff', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  modelDescription: { color: '#8292aa', fontSize: 11, lineHeight: 17, marginTop: 5, minHeight: 34 },
  modelMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 13 },
  modelSize: { color: '#9aabc2', fontSize: 11, fontWeight: '600' },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(61,139,255,0.26)', borderWidth: 1, borderColor: 'rgba(145,198,255,0.24)' },
  openText: { color: '#dcecff', fontSize: 10, fontWeight: '700' },
  emptyText: { width: '100%', color: '#8292aa', padding: 20, textAlign: 'center' },
});
