// Professional Theme Hook - Dark/Light Mode Support
// Persists preference to localStorage with system preference detection

'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'contextractor-theme';

// Get initial theme from localStorage or default to system
const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'system';
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
    } catch {
        // localStorage not available
    }
    
    return 'system';
};

// Resolve system theme to light or dark
const resolveTheme = (theme: Theme): ResolvedTheme => {
    if (theme === 'system') {
        if (typeof window === 'undefined') return 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
};

// Apply theme to document
const applyTheme = (resolvedTheme: ResolvedTheme) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute(
            'content',
            resolvedTheme === 'dark' ? '#131314' : '#F8F9FA'
        );
    }
};

export function useThemeProvider(): ThemeContextValue {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
    const [mounted, setMounted] = useState(false);

    // Initialize on mount
    useEffect(() => {
        const initial = getInitialTheme();
        setThemeState(initial);
        const resolved = resolveTheme(initial);
        setResolvedTheme(resolved);
        applyTheme(resolved);
        setMounted(true);
    }, []);

    // Listen for system preference changes
    useEffect(() => {
        if (!mounted) return;
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = () => {
            if (theme === 'system') {
                const resolved = resolveTheme('system');
                setResolvedTheme(resolved);
                applyTheme(resolved);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, mounted]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        const resolved = resolveTheme(newTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
        
        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
        } catch {
            // localStorage not available
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    }, [resolvedTheme, setTheme]);

    return {
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
    };
}

interface ThemeProviderProps {
    children: ReactNode;
    value: ThemeContextValue;
}

export function ThemeProvider({ children, value }: ThemeProviderProps) {
    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export { ThemeContext };
