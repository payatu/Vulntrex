"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      // Check localStorage first, then system preference
      const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      const systemPrefersDark = typeof window !== "undefined" 
        ? window.matchMedia("(prefers-color-scheme: dark)").matches 
        : false;
      
      const initialTheme = (stored === "dark" || stored === "light") 
        ? stored 
        : (systemPrefersDark ? "dark" : "light");
      setTheme(initialTheme);
      
      // Apply theme to document
      if (typeof document !== "undefined") {
        if (initialTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      setMounted(true);
    } catch (error) {
      console.error("Error initializing theme:", error);
      setTheme("light");
      setMounted(true);
    }
  }, []);

  const toggleTheme = () => {
    try {
      const newTheme = theme === "light" ? "dark" : "light";
      setTheme(newTheme);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", newTheme);
      }
      
      if (typeof document !== "undefined") {
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } catch (error) {
      console.error("Error toggling theme:", error);
    }
  };

  // Always provide the context, even before mounted
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
