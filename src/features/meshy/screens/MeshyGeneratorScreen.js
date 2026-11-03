import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faCube, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED']);

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
  return data;
}

export default function MeshyGeneratorScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [texturePrompt, setTexturePrompt] = useState('buatlah beberapa karakter untuk Digital Twin');
  const [mode, setMode] = useState('text');
  const [task, setTask] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const compact = width < 640;

  useEffect(() => () => clearTimeout(timer.current), []);

  const pollTask = async (taskId) => {
    try {
      const apiBase = `/api/meshy/${mode === 'image' ? 'image-to-3d' : 'text-to-3d'}`;
      const data = await readResponse(await fetch(`${apiBase}/${encodeURIComponent(taskId)}`));
      setTask(data);
      if (TERMINAL_STATES.has(data.status)) {
        setBusy(false);
        if (data.status !== 'SUCCEEDED') setError(data.task_error?.message || `Generation ${data.status.toLowerCase()}.`);
        return;
      }
      timer.current = setTimeout(() => pollTask(taskId), 3000);
    } catch (requestError) {
      setBusy(false);
      setError(requestError.message || 'Unable to check generation status.');
    }
  };

  const generate = async () => {
    const cleanPrompt = prompt.trim();
    if (busy || (mode === 'text' && !cleanPrompt) || (mode === 'image' && !imageUrl.trim())) return;
    setError('');
    setTask(null);
    setBusy(true);
    try {
      const apiBase = `/api/meshy/${mode === 'image' ? 'image-to-3d' : 'text-to-3d'}`;
      const payload = mode === 'image'
        ? {
          image_url: imageUrl.trim(), texture_prompt: texturePrompt.trim(),
          texture_resolution: '8k', pose_mode: 't-pose', target_formats: ['glb'],
          enable_pbr: true, moderation: true, geometry_resolution: '4k',
          should_remesh: true, save_pre_remeshed_model: true,
        }
        : {
          mode: 'preview', prompt: cleanPrompt, model_type: 'standard', pose_mode: '',
          target_formats: ['glb'], should_remesh: false,
        };
      const created = await readResponse(await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }));
      if (!created.result) throw new Error('Meshy did not return a task ID.');
      setTask({ id: created.result, status: 'PENDING', progress: 0 });
      pollTask(created.result);
    } catch (requestError) {
      setBusy(false);
      setError(requestError.message || 'Unable to start generation.');
    }
  };

  const status = task?.status || '';
  const glbUrl = task?.model_urls?.glb;
  const thumbnail = task?.thumbnail_url;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: compact ? 18 : 32 }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.inner, { maxWidth: 900 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button">
          <FontAwesomeIcon icon={faArrowLeft} size={14} color="#eaf3ff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.heading}>
          <View style={styles.icon}><FontAwesomeIcon icon={faWandMagicSparkles} size={19} color="#a9d4ff" /></View>
          <Text style={styles.eyebrow}>MESHY AI · {mode === 'image' ? 'IMAGE TO 3D' : 'TEXT TO 3D'}</Text>
          <Text style={[styles.title, { fontSize: compact ? 30 : 38 }]}>Imagine it. Make it 3D.</Text>
          <Text style={styles.subtitle}>{mode === 'image' ? 'Turn a reference image into a detailed GLB model.' : 'Describe an object and generate an interactive GLB preview.'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.modeSwitch}>
            {['text', 'image'].map((value) => <TouchableOpacity key={value} disabled={busy} onPress={() => { clearTimeout(timer.current); setMode(value); setError(''); setTask(null); }} style={[styles.modeButton, mode === value && styles.modeButtonActive, busy && styles.disabled]} accessibilityRole="button">
              <Text style={[styles.modeText, mode === value && styles.modeTextActive]}>{value === 'text' ? 'Text to 3D' : 'Image to 3D'}</Text>
            </TouchableOpacity>)}
          </View>
          {mode === 'text' ? <>
            <Text style={styles.label}>YOUR PROMPT</Text>
            <TextInput
              value={prompt} onChangeText={setPrompt} multiline maxLength={800}
              placeholder="A small futuristic wooden cabin, warm lights, clean stylized details..."
              placeholderTextColor="#7889a2" style={styles.input} textAlignVertical="top"
              accessibilityLabel="Describe the 3D model to generate"
            />
          </> : <>
            <Text style={styles.label}>IMAGE URL</Text>
            <TextInput value={imageUrl} onChangeText={setImageUrl} placeholder="https://example.com/reference-image.png" placeholderTextColor="#7889a2" style={styles.urlInput} autoCapitalize="none" keyboardType="url" accessibilityLabel="Reference image URL" />
            <Text style={[styles.label, { marginTop: 16 }]}>TEXTURE DESCRIPTION</Text>
            <TextInput value={texturePrompt} onChangeText={setTexturePrompt} multiline maxLength={600} placeholder="Describe the desired character textures..." placeholderTextColor="#7889a2" style={[styles.input, styles.textureInput]} textAlignVertical="top" accessibilityLabel="Texture prompt" />
            <Text style={styles.imageOptions}>GLB · T-pose · PBR · 4K geometry · 8K textures</Text>
          </>}
          <View style={styles.formFooter}>
            <Text style={styles.counter}>{mode === 'text' ? `${prompt.length}/800` : 'Image reference'}</Text>
            <TouchableOpacity onPress={generate} disabled={busy || (mode === 'text' ? !prompt.trim() : !imageUrl.trim())} style={[styles.generateButton, (busy || (mode === 'text' ? !prompt.trim() : !imageUrl.trim())) && styles.disabled]} accessibilityRole="button">
              {busy ? <ActivityIndicator size="small" color="#071321" /> : <FontAwesomeIcon icon={faWandMagicSparkles} size={14} color="#071321" />}
              <Text style={styles.generateText}>{busy ? 'Generating…' : 'Generate preview'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        {!!task && <View style={styles.resultCard}>
          {thumbnail ? <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" /> : <View style={styles.placeholder}><FontAwesomeIcon icon={faCube} size={26} color="#85bcff" /></View>}
          <View style={styles.resultCopy}>
            <Text style={styles.label}>GENERATION STATUS</Text>
            <Text style={styles.status}>{status.replace('_', ' ') || 'Pending'}</Text>
            <Text style={styles.progress}>{task.progress ?? 0}% complete</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }]} /></View>
          </View>
          {!!glbUrl && <TouchableOpacity onPress={() => navigation.navigate('Viewer', { model: { name: (mode === 'image' ? 'Meshy Image Model' : prompt.trim()).slice(0, 64), description: 'AI generated model by Meshy', uri: glbUrl } })} style={styles.viewButton} accessibilityRole="button">
            <FontAwesomeIcon icon={faCube} size={14} color="#071321" /><Text style={styles.generateText}>View 3D model</Text>
          </TouchableOpacity>}
        </View>}
        <Text style={styles.note}>Generation uses Meshy {mode === 'image' ? 'Image to 3D' : 'Text to 3D preview'} mode. Results are provided by Meshy and may take a few minutes.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090f1b' },
  content: { flexGrow: 1 },
  inner: { width: '100%', alignSelf: 'center' },
  back: { alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(225,239,255,0.13)' },
  backText: { color: '#dceaff', fontSize: 12, fontWeight: '600' },
  heading: { alignItems: 'center', marginTop: 34, marginBottom: 26 },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: 'rgba(90,157,255,0.16)', marginBottom: 14 },
  eyebrow: { color: '#8abfff', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#f1f6ff', fontWeight: '800', textAlign: 'center', marginTop: 9 },
  subtitle: { color: '#93a4bc', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  card: { padding: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.065)', borderWidth: 1, borderColor: 'rgba(225,239,255,0.15)' },
  modeSwitch: { flexDirection: 'row', padding: 4, borderRadius: 15, backgroundColor: 'rgba(5,12,23,0.6)', marginBottom: 20 },
  modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 12 },
  modeButtonActive: { backgroundColor: 'rgba(125,181,255,0.2)' },
  modeText: { color: '#8d9db4', fontSize: 12, fontWeight: '700' },
  modeTextActive: { color: '#bfddff' },
  label: { color: '#8296b2', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  input: { minHeight: 150, color: '#eef5ff', fontSize: 14, lineHeight: 22, marginTop: 12, padding: 15, borderRadius: 16, backgroundColor: 'rgba(5,12,23,0.56)', borderWidth: 1, borderColor: 'rgba(225,239,255,0.12)' },
  urlInput: { minHeight: 48, color: '#eef5ff', fontSize: 13, marginTop: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(5,12,23,0.56)', borderWidth: 1, borderColor: 'rgba(225,239,255,0.12)' },
  textureInput: { minHeight: 94 },
  imageOptions: { color: '#8498b3', fontSize: 10, marginTop: 10 },
  formFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  counter: { color: '#8292aa', fontSize: 11 },
  generateButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#9dcbff' },
  disabled: { opacity: 0.55 },
  generateText: { color: '#071321', fontSize: 12, fontWeight: '800' },
  errorBox: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,100,100,0.12)', borderWidth: 1, borderColor: 'rgba(255,130,130,0.28)' },
  errorText: { color: '#ffc0c0', fontSize: 12, lineHeight: 18 },
  resultCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.065)', borderWidth: 1, borderColor: 'rgba(225,239,255,0.15)' },
  thumbnail: { width: 86, height: 86, borderRadius: 16, backgroundColor: '#131e30' },
  placeholder: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(90,157,255,0.12)' },
  resultCopy: { flex: 1, minWidth: 150 },
  status: { color: '#f1f6ff', fontSize: 16, fontWeight: '700', marginTop: 6 },
  progress: { color: '#94a7c0', fontSize: 11, marginTop: 5 },
  progressTrack: { height: 5, overflow: 'hidden', borderRadius: 4, backgroundColor: '#26354a', marginTop: 9 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#8bc3ff' },
  viewButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#9dcbff' },
  note: { color: '#71839c', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 18 },
});
