import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type ThemePalette = 'professional' | 'minimal' | 'passion' | 'modern';

interface ThemeContextType {
  mode: ThemeMode;
  palette: ThemePalette;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ThemePalette) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = 'kursu_theme_mode';
const PALETTE_STORAGE_KEY = 'kursu_theme_palette';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    return (saved === 'dark' || saved === 'light') ? saved : 'dark';
  });

  const [palette, setPaletteState] = useState<ThemePalette>(() => {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    return (saved === 'professional' || saved === 'minimal' || saved === 'passion' || saved === 'modern') 
      ? (saved as ThemePalette) 
      : 'professional';
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  };

  const setPalette = (newPalette: ThemePalette) => {
    setPaletteState(newPalette);
    localStorage.setItem(PALETTE_STORAGE_KEY, newPalette);
  };

  // Synchronize CSS attributes at the root HTML level dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-mode', mode);
    root.setAttribute('data-palette', palette);
  }, [mode, palette]);

  return (
    <ThemeContext.Provider value={{ mode, palette, setMode, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
