export { ThemeProvider, useTheme } from './ThemeContext';
export { THEMES, THEME_IDS, spacing, radii } from './themes';

export const colors = Object.freeze({
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
});

export const defaultTheme = {
  id: 'default',
  name: 'Deep Space',
  colors,
};

const theme = Object.freeze({ colors, spacing, radii });
export default theme;
