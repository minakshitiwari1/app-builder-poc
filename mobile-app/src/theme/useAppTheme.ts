import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
export const useAppTheme = () => useContext(ThemeContext);
