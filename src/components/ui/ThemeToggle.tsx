// Professional Theme Toggle Component
// Beautiful animated toggle with sun/moon icons and smooth transitions

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
    className?: string;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

// SVG paths for icons
const SunIcon = () => (
    <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-full h-full"
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const MoonIcon = () => (
    <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-full h-full"
    >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const SystemIcon = () => (
    <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-full h-full"
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
};

const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
    className = '', 
    showLabel = false,
    size = 'md',
}) => {
    const { resolvedTheme, toggleTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <motion.button
            onClick={toggleTheme}
            className={`
                relative flex items-center justify-center rounded-xl
                bg-theme-surface-elevated hover:bg-theme-surface-hover
                border border-theme-border
                transition-colors duration-200
                ${sizeClasses[size]}
                ${className}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={isDark ? 'moon' : 'sun'}
                    initial={{ scale: 0, rotate: -180, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0, rotate: 180, opacity: 0 }}
                    transition={{ 
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1],
                    }}
                    className={`${iconSizes[size]} text-theme-text-secondary`}
                >
                    {isDark ? <MoonIcon /> : <SunIcon />}
                </motion.div>
            </AnimatePresence>
            
            {showLabel && (
                <span className="ml-2 text-sm text-theme-text-secondary">
                    {isDark ? 'Dark' : 'Light'}
                </span>
            )}
        </motion.button>
    );
};

// Theme Selector Dropdown - for choosing between light, dark, and system
interface ThemeSelectorProps {
    className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className = '' }) => {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [isOpen, setIsOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
        { value: 'light', label: 'Light', icon: <SunIcon /> },
        { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
        { value: 'system', label: 'System', icon: <SystemIcon /> },
    ];

    const currentIcon = theme === 'system' 
        ? <SystemIcon />
        : resolvedTheme === 'dark' 
            ? <MoonIcon /> 
            : <SunIcon />;

    return (
        <div ref={menuRef} className={`relative ${className}`}>
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="
                    flex items-center gap-2 px-3 py-2 rounded-xl
                    bg-theme-surface-elevated hover:bg-theme-surface-hover
                    border border-theme-border
                    text-theme-text-primary text-sm font-medium
                    transition-colors duration-200
                "
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className="w-4 h-4 text-theme-text-secondary">
                    {currentIcon}
                </div>
                <span className="capitalize">{theme}</span>
                <svg 
                    className={`w-4 h-4 text-theme-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="
                            absolute right-0 top-full mt-2 z-50
                            bg-theme-surface-elevated border border-theme-border
                            rounded-xl shadow-xl overflow-hidden min-w-[140px]
                        "
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    setTheme(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-2.5 text-sm
                                    transition-colors duration-150
                                    ${theme === option.value 
                                        ? 'bg-theme-primary/10 text-theme-primary' 
                                        : 'text-theme-text-primary hover:bg-theme-surface-hover'
                                    }
                                `}
                            >
                                <div className="w-4 h-4">{option.icon}</div>
                                <span>{option.label}</span>
                                {theme === option.value && (
                                    <motion.svg
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-4 h-4 ml-auto text-theme-primary"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </motion.svg>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ThemeToggle;
