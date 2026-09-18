import React, { createContext, useMemo } from 'react';
import { createTheme } from './createTheme';

export const ThemeContext = createContext<any>(null);
export const AppThemeProvider = ({ config, children }: any) => {
  const theme = useMemo(() => createTheme(config), [config]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};
