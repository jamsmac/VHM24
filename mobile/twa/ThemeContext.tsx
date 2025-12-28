import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const toggleTheme = useCallback(() => {
    if (!switchable) return;
    
    const root = document.documentElement;
    
    // Add transition class for smooth animation
    root.classList.add("theme-transition");
    setIsTransitioning(true);
    
    // Change theme
    setTheme(prev => (prev === "light" ? "dark" : "light"));
    
    // Remove transition class after animation completes (350ms matches CSS duration)
    setTimeout(() => {
      root.classList.remove("theme-transition");
      setIsTransitioning(false);
    }, 350);
  }, [switchable]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme: switchable ? toggleTheme : undefined, 
      switchable,
      isTransitioning 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
