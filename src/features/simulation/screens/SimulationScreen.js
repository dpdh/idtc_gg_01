import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faTrash, faClone, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import ResponsiveContent from '../../../shared/components/ResponsiveContent';
import initialProjects from '../data/initialProjects';

export default function SimulationScreen() {
  const { width } = useWindowDimensions();
  const [simulations, setSimulations] = useState(initialProjects);
  const [projectName, setProjectName] = useState('');
  const compact = width < 600;

  const handleCreate = () => {
    const name = projectName.trim();
    if (!name) return;
    setSimulations((projects) => [...projects, { id: Date.now(), name, location: 'Selected location', assets: 0, status: 'New' }]);
    setProjectName('');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <ResponsiveContent>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PLAN AND OPTIMIZE</Text>
          <Text style={styles.title}>Twin simulations</Text>
          <Text style={styles.subtitle}>Manage your digital twin projects in one place.</Text>
        </View>

        <View style={[styles.createCard, compact && styles.createCardCompact]}>
          <View style={styles.createCopy}>
            <Text style={styles.createTitle}>Create a simulation</Text>
            <Text style={styles.createHint}>Give your new project a name to get started.</Text>
          </View>
          <View style={[styles.createControls, compact && styles.createControlsCompact]}>
            <TextInput
              value={projectName}
              onChangeText={setProjectName}
              placeholder="e.g. Riverside redevelopment"
              placeholderTextColor="#75839a"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity onPress={handleCreate} style={styles.createButton} accessibilityRole="button">
              <FontAwesomeIcon icon={faPlus} size={14} color="#fff" />
              <Text style={styles.createButtonText}>New project</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle}>Your projects</Text>
          <Text style={styles.projectCount}>{simulations.length} projects</Text>
        </View>

        <View style={styles.projectGrid}>
          {simulations.map((item) => (
            <View key={item.id} style={[styles.projectCard, { flexBasis: width < 620 ? '100%' : '47%' }]}>
              <View style={styles.projectTop}>
                <View style={styles.projectIcon}><FontAwesomeIcon icon={faClone} size={16} color="#8fc2ff" /></View>
                <View style={[styles.statusPill, item.status === 'Active' && styles.statusActive]}>
                  <View style={[styles.statusDot, item.status === 'Active' && styles.statusDotActive]} />
                  <Text style={[styles.statusText, item.status === 'Active' && styles.statusTextActive]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.projectName}>{item.name}</Text>
              <Text style={styles.projectLocation}>{item.location}</Text>
              <View style={styles.projectDivider} />
              <View style={styles.projectBottom}>
                <Text style={styles.assetCount}>{item.assets} assets</Text>
                <View style={styles.projectActions}>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Duplicate ${item.name}`} style={styles.iconButton}>
                    <FontAwesomeIcon icon={faClone} size={13} color="#8ea0b9" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSimulations((projects) => projects.filter((project) => project.id !== item.id))} accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`} style={styles.iconButton}>
                    <FontAwesomeIcon icon={faTrash} size={13} color="#f28b8b" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
        {simulations.length === 0 && (
          <View style={styles.emptyState}>
            <FontAwesomeIcon icon={faCircleCheck} size={24} color="#6b8bb5" />
            <Text style={styles.emptyText}>No projects yet. Create one to get started.</Text>
          </View>
        )}
      </ResponsiveContent>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090f1b' },
  scrollContent: { flexGrow: 1, paddingTop: 26, paddingBottom: 30 },
  heading: { marginBottom: 22 },
  eyebrow: { color: '#71839e', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  title: { color: '#f3f7ff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#8292aa', fontSize: 14, lineHeight: 21, marginTop: 6 },
  createCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.075)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.17)', shadowColor: '#6ab5ff', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  createCardCompact: { alignItems: 'stretch', flexDirection: 'column' },
  createCopy: { flexGrow: 1, flexBasis: 180 },
  createTitle: { color: '#eef4ff', fontSize: 16, fontWeight: '700' },
  createHint: { color: '#8292aa', fontSize: 12, lineHeight: 18, marginTop: 5 },
  createControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, flexGrow: 2, flexBasis: 340, justifyContent: 'flex-end' },
  createControlsCompact: { flexDirection: 'column', alignItems: 'stretch', flexBasis: 'auto' },
  input: { flexGrow: 1, flexBasis: 220, minWidth: 0, height: 44, paddingHorizontal: 13, borderRadius: 15, color: '#f5f8ff', backgroundColor: 'rgba(8,17,31,0.58)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.15)', fontSize: 13 },
  createButton: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 15, borderRadius: 17, backgroundColor: 'rgba(61,139,255,0.74)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.26)' },
  createButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  listHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 28, marginBottom: 13 },
  sectionTitle: { color: '#edf4ff', fontSize: 17, fontWeight: '700' },
  projectCount: { color: '#8497b1', fontSize: 12 },
  projectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  projectCard: { flexGrow: 1, minWidth: 0, padding: 17, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.065)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.15)', shadowColor: '#77baff', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  projectTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  projectIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(106,171,255,0.17)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.18)' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 15, backgroundColor: '#263043' },
  statusActive: { backgroundColor: '#17382f' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#98a5b7' },
  statusDotActive: { backgroundColor: '#42d6a0' },
  statusText: { color: '#aab5c5', fontSize: 10, fontWeight: '600' },
  statusTextActive: { color: '#83e6c1' },
  projectName: { color: '#eef4ff', fontSize: 15, fontWeight: '700' },
  projectLocation: { color: '#8292aa', fontSize: 12, marginTop: 5 },
  projectDivider: { height: 1, backgroundColor: '#223047', marginTop: 15, marginBottom: 11 },
  projectBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  assetCount: { color: '#91a1b8', fontSize: 11, fontWeight: '600' },
  projectActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#1a2638' },
  emptyState: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { color: '#8292aa', fontSize: 13, textAlign: 'center' },
});
