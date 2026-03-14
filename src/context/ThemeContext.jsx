import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cag_theme') === 'dark' ||
        (!localStorage.getItem('cag_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('cag_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = () => setDark(d => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
