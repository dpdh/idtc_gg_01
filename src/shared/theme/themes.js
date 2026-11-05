export const THEMES = Object.freeze({
  // 1. Default Deep Space (original TWINI)
  default: {
    id: 'default',
    name: 'Deep Space',
    colors: {
      background: '#090f1b',
      surface: 'rgba(255,255,255,0.065)',
      surfaceStrong: 'rgba(24,39,61,0.72)',
      border: 'rgba(224,240,255,0.17)',
      primary: '#2876e8',
      primaryLight: '#8fc2ff',
      text: '#f2f6fd',
      textMuted: '#8292aa',
      success: '#42d6a0',
      danger: '#f28b8b',
    },
  },
  // 2. Midnight Navy
  midnightNavy: {
    id: 'midnightNavy',
    name: 'Midnight Navy',
    colors: {
      background: '#0b132b',
      surface: 'rgba(255,255,255,0.05)',
      surfaceStrong: 'rgba(16,27,53,0.8)',
      border: 'rgba(139,159,211,0.2)',
      primary: '#1c5d99',
      primaryLight: '#6ea8fe',
      text: '#e2e8f0',
      textMuted: '#94a3b8',
      success: '#38bdf8',
      danger: '#f87171',
    },
  },
  // 3. Cyber Neon
  cyberNeon: {
    id: 'cyberNeon',
    name: 'Cyber Neon',
    colors: {
      background: '#0a0a0a',
      surface: 'rgba(255,255,255,0.03)',
      surfaceStrong: 'rgba(20,20,25,0.85)',
      border: 'rgba(0,255,255,0.25)',
      primary: '#00f3ff',
      primaryLight: '#60ffff',
      text: '#ffffff',
      textMuted: '#7fd4d4',
      success: '#00ff88',
      danger: '#ff0055',
    },
  },
  // 4. Solar Flare
  solarFlare: {
    id: 'solarFlare',
    name: 'Solar Flare',
    colors: {
      background: '#1a1a0d',
      surface: 'rgba(255,255,255,0.04)',
      surfaceStrong: 'rgba(40,30,10,0.85)',
      border: 'rgba(255,165,0,0.25)',
      primary: '#ffaa00',
      primaryLight: '#ffc966',
      text: '#fff5e1',
      textMuted: '#d4a373',
      success: '#a3e635',
      danger: '#f56565',
    },
  },
  // 5. Forest Twin
  forestTwin: {
    id: 'forestTwin',
    name: 'Forest Twin',
    colors: {
      background: '#0f1713',
      surface: 'rgba(255,255,255,0.05)',
      surfaceStrong: 'rgba(15,25,20,0.8)',
      border: 'rgba(74,144,112,0.25)',
      primary: '#4a9a70',
      primaryLight: '#8fd8a8',
      text: '#e8f5e9',
      textMuted: '#a5b4a9',
      success: '#6ee7b7',
      danger: '#fc8181',
    },
  },
  // 6. Aurora Borealis
  auroraBorealis: {
    id: 'auroraBorealis',
    name: 'Aurora Borealis',
    colors: {
      background: '#0f0c29',
      surface: 'rgba(255,255,255,0.04)',
      surfaceStrong: 'rgba(25,15,50,0.82)',
      border: 'rgba(138,43,226,0.25)',
      primary: '#8a2be2',
      primaryLight: '#bc8ff6',
      text: '#f0f0ff',
      textMuted: '#b8b8d9',
      success: '#7df9ff',
      danger: '#ff6b9d',
    },
  },
  // 7. Ocean Depth
  oceanDepth: {
    id: 'oceanDepth',
    name: 'Ocean Depth',
    colors: {
      background: '#0a192f',
      surface: 'rgba(255,255,255,0.04)',
      surfaceStrong: 'rgba(10,25,47,0.85)',
      border: 'rgba(100,200,255,0.2)',
      primary: '#64ffda',
      primaryLight: '#a0ffe5',
      text: '#ccd6f6',
      textMuted: '#8892b0',
      success: '#4fd1c5',
      danger: '#fc8181',
    },
  },
  // 8. Sunset Crimson
  sunsetCrimson: {
    id: 'sunsetCrimson',
    name: 'Sunset Crimson',
    colors: {
      background: '#2d1b24',
      surface: 'rgba(255,255,255,0.04)',
      surfaceStrong: 'rgba(45,27,36,0.85)',
      border: 'rgba(255,107,107,0.25)',
      primary: '#ff6b6b',
      primaryLight: '#ff9e9e',
      text: '#ffe5e5',
      textMuted: '#d4a5a5',
      success: '#ffd166',
      danger: '#ef476f',
    },
  },
  // 9. Cyberpunk Purple
  cyberpunkPurple: {
    id: 'cyberpunkPurple',
    name: 'Cyberpunk Purple',
    colors: {
      background: '#0d0221',
      surface: 'rgba(255,255,255,0.03)',
      surfaceStrong: 'rgba(20,5,45,0.88)',
      border: 'rgba(255,0,255,0.3)',
      primary: '#bc13fe',
      primaryLight: '#d966ff',
      text: '#ffffff',
      textMuted: '#c996ff',
      success: '#00ffcc',
      danger: '#ff00ff',
    },
  },
  // 10. Monochrome Glass
  monochromeGlass: {
    id: 'monochromeGlass',
    name: 'Monochrome Glass',
    colors: {
      background: '#0d0d0d',
      surface: 'rgba(255,255,255,0.06)',
      surfaceStrong: 'rgba(20,20,20,0.85)',
      border: 'rgba(200,200,200,0.2)',
      primary: '#4a90e2',
      primaryLight: '#8bb8f0',
      text: '#f5f5f5',
      textMuted: '#a0a0a0',
      success: '#7ed321',
      danger: '#d0021b',
    },
  },
});

export const spacing = Object.freeze({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });

export const radii = Object.freeze({ sm: 10, md: 16, lg: 22, xl: 30, pill: 999 });

export const THEME_IDS = Object.keys(THEMES);