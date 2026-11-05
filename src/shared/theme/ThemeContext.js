import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, THEME_IDS, spacing, radii } from './themes';

const THEME_KEY = '@twini/theme/v1';
const DEFAULT_THEME_ID = 'default';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (mounted && stored && THEMES[stored]) {
          setThemeIdState(stored);
        }
      } catch {
        // ignore storage errors
      } finally {
        if (mounted) setIsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setThemeId = useCallback((nextId) => {
    if (!THEMES[nextId]) return;
    setThemeIdState(nextId);
    try {
      AsyncStorage.setItem(THEME_KEY, nextId);
    } catch {
      // ignore
    }
  }, []);

  const theme = useMemo(() => {
    return THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
  }, [themeId]);

  const value = useMemo(
    () => ({
      theme,
      themeId,
      themes: THEMES,
      themeIds: THEME_IDS,
      setTheme: setThemeId,
      isReady,
      spacing,
      radii,
    }),
    [theme, themeId, setThemeId, isReady, spacing, radii],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return context;
}