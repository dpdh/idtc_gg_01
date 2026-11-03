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

export const spacing = Object.freeze({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });

export const radii = Object.freeze({ sm: 10, md: 16, lg: 22, xl: 30, pill: 999 });

const theme = Object.freeze({ colors, spacing, radii });
export default theme;
