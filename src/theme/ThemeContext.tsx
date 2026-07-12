import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorTokens, THEMES, DEFAULT_THEME, Theme, ThemeName, scoreColor, scoreBgColor } from './colors';
import { getCardStyle, getManualOverrideCardStyle } from './spacing';

const STORAGE_KEY = 'skinmatch_theme';

interface ThemeContextValue {
  themeName: ThemeName;
  theme: Theme;
  colors: ColorTokens;
  cardStyle: ReturnType<typeof getCardStyle>;
  manualOverrideCardStyle: ReturnType<typeof getManualOverrideCardStyle>;
  structuralSeverity: boolean;
  scoreColor: (score: number) => string;
  scoreBgColor: (score: number) => string;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in THEMES) setThemeName(saved as ThemeName);
    });
  }, []);

  function setTheme(name: ThemeName) {
    setThemeName(name);
    AsyncStorage.setItem(STORAGE_KEY, name);
  }

  const value = useMemo<ThemeContextValue>(() => {
    const theme = THEMES[themeName];
    return {
      themeName,
      theme,
      colors: theme.colors,
      cardStyle: getCardStyle(theme),
      manualOverrideCardStyle: getManualOverrideCardStyle(theme),
      structuralSeverity: theme.structuralSeverity,
      scoreColor: (score: number) => scoreColor(score, theme.colors),
      scoreBgColor: (score: number) => scoreBgColor(score, theme.colors),
      setTheme,
    };
  }, [themeName]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
