// Smart Code Processing Selector Component
// Professional-grade toggle for Raw | Remove Comments | Minify modes

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleIcon } from './ui/GoogleIcon';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { UI_ICONS_MAP } from '@/lib/icon-mapping';
import { CodeProcessingMode } from '@/lib/code-processing';

interface CodeProcessingSelectorProps {
    value: CodeProcessingMode;
    onChange: (value: CodeProcessingMode) => void;
    savingsPercent?: number;
    className?: string;
}

const PROCESSING_MODES = [
    {
        id: 'raw' as const,
        label: 'Raw',
        shortLabel: 'Raw',
        description: 'Keep original code as-is with all comments and formatting',
        icon: 'code' as const,
        color: 'var(--theme-text-secondary)',
    },
    {
        id: 'remove-comments' as const,
        label: 'No Comments',
        shortLabel: 'Clean',
        description: 'Strip comments while preserving code structure and formatting',
        icon: 'comment_off' as const,
        color: '#7FCFB6',
    },
    {
        id: 'minify' as const,
        label: 'Minify',
        shortLabel: 'Min',
        description: 'Remove comments & excess whitespace for maximum token savings',
        icon: 'compress' as const,
        color: '#C8ACF6',
    },
    {
        id: 'signatures-only' as const,
        label: 'Signatures Only',
        shortLabel: 'Sigs',
        description: 'Strip bodies, keep function/class signatures for structure',
        icon: 'signatures' as const,
        color: '#F5A524',
    },
    {
        id: 'interfaces-only' as const,
        label: 'Interfaces Only',
        shortLabel: 'Types',
        description: 'Export only interfaces/types/enums for fast schema sharing',
        icon: 'interfaces' as const,
        color: '#5BC0F8',
    },
] as const;

// Custom icons for processing modes
const PROCESSING_ICONS = {
    code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
    comment_off: "M2.81 2.81L1.39 4.22l2.27 2.27C2.61 7.61 2 9.18 2 10.91v6.36c0 1.28.48 2.26 1.32 2.82.39.26.82.39 1.27.39.35 0 .71-.08 1.07-.24l1.17-.52c.38-.17.82-.17 1.21-.01l1.21.54c.64.28 1.41.28 2.05 0l1.21-.54c.38-.17.82-.16 1.21.01l1.17.52c.36.16.71.24 1.07.24.45 0 .88-.13 1.27-.39.31-.21.58-.49.79-.85l2.45 2.45 1.41-1.41L2.81 2.81zM4 17.27v-6.36c0-1.12.39-2.14 1.02-2.95l1.55 1.55c-.35.47-.57 1.04-.57 1.67v5.64L4 17.27zm4 .55v-5.64c0-.28.22-.5.5-.5h.59l5.5 5.5-.43.19c-.39.17-.83.17-1.22 0l-1.21-.54c-.63-.28-1.39-.28-2.01 0l-1.21.54c-.18.08-.35.11-.51.11v-.02-.18zm10.98-7.64c.63.81 1.02 1.83 1.02 2.95v6.36l-2-.88v-5.64c0-.63-.22-1.2-.57-1.67l1.55-1.12zM12 2C6.48 2 2 6.48 2 12c0 .34.02.68.05 1.01l1.46-1.05C3.51 11.64 3.51 11.32 3.51 11c0-4.69 3.8-8.49 8.49-8.49 4.69 0 8.49 3.8 8.49 8.49 0 .32 0 .64-.03.95l1.46 1.05c.03-.33.05-.66.05-1.01 0-5.52-4.48-10-10-10z",
    compress: "M8 19h3v3h2v-3h3l-4-4-4 4zm8-15h-3V1h-2v3H8l4 4 4-4zM4 9v2h16V9H4zm0 4v2h16v-2H4z",
    signatures: "M11 5h2v14h-2V5zm-4 3h2v8H7c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2zm8 0h2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2h-2v-2h2v-4h-2V8z",
    interfaces: "M5 6h6v2H5v4h6v2H5c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2zm8 0h6v2h-4v8h4v2h-6V6z",
};

export const CodeProcessingSelector: React.FC<CodeProcessingSelectorProps> = ({
    value,
    onChange,
    savingsPercent,
    className = '',
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const activeMode = PROCESSING_MODES.find(m => m.id === value) || PROCESSING_MODES[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Compact Toggle Button */}
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-full
                    border transition-all duration-200
                    ${isExpanded 
                        ? 'bg-[var(--theme-surface-hover)] border-[var(--theme-primary)]' 
                        : 'bg-[var(--theme-surface-elevated)] border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)]'
                    }
                `}
                title="Code Processing Mode"
            >
                {/* Icon */}
                <svg
                    className="w-4 h-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: activeMode.color }}
                >
                    <path d={PROCESSING_ICONS[activeMode.icon]} fill="currentColor" stroke="none" />
                </svg>

                {/* Label */}
                <span className="text-sm font-medium text-[var(--theme-text-primary)] hidden sm:inline">
                    {activeMode.shortLabel}
                </span>

                {/* Savings Badge */}
                {value !== 'raw' && savingsPercent !== undefined && savingsPercent > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--theme-success)]/20 text-[var(--theme-success)]">
                        -{savingsPercent}%
                    </span>
                )}

                {/* Expand Arrow */}
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[var(--theme-text-tertiary)]"
                >
                    <GoogleIcon icon={UI_ICONS_MAP.expand_more} className="w-4 h-4" />
                </motion.div>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute top-full right-0 mt-2 w-[280px] bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-[var(--theme-border)] bg-[var(--theme-surface-elevated)]">
                            <div className="flex items-center gap-2">
                                <AnimatedIcon 
                                    icon={UI_ICONS_MAP.tune} 
                                    className="w-4 h-4 text-[var(--theme-primary)]" 
                                />
                                <span className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wider">
                                    Smart Processing
                                </span>
                            </div>
                            <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1">
                                Optimize code for AI token efficiency
                            </p>
                        </div>

                        {/* Options */}
                        <div className="p-2">
                            {PROCESSING_MODES.map((mode) => {
                                const isActive = value === mode.id;
                                return (
                                    <button
                                        key={mode.id}
                                        onClick={() => {
                                            onChange(mode.id);
                                            setIsExpanded(false);
                                        }}
                                        className={`
                                            group relative flex items-start gap-3 w-full p-3 rounded-xl text-left transition-all duration-200
                                            ${isActive 
                                                ? 'bg-[var(--theme-primary)]/15' 
                                                : 'hover:bg-[var(--theme-surface-hover)]'
                                            }
                                        `}
                                    >
                                        {/* Active Indicator */}
                                        {isActive && (
                                            <motion.div 
                                                layoutId="processingActiveIndicator"
                                                className="absolute left-0 top-3 bottom-3 w-1 bg-[var(--theme-primary)] rounded-r-full" 
                                            />
                                        )}

                                        {/* Icon */}
                                        <div 
                                            className={`
                                                w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                                ${isActive ? 'bg-[var(--theme-primary)]/20' : 'bg-[var(--theme-surface-elevated)]'}
                                            `}
                                            style={{ color: mode.color }}
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d={PROCESSING_ICONS[mode.icon]} />
                                            </svg>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-medium ${isActive ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                                                    {mode.label}
                                                </span>
                                                {isActive && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="text-[var(--theme-primary)]"
                                                    >
                                                        <GoogleIcon icon={UI_ICONS_MAP.check} className="w-4 h-4" />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <p className={`text-[11px] leading-relaxed mt-0.5 ${isActive ? 'text-[var(--theme-primary)]/70' : 'text-[var(--theme-text-tertiary)]'}`}>
                                                {mode.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer hint */}
                        <div className="px-4 py-2 border-t border-[var(--theme-border)] bg-[var(--theme-bg)]">
                            <p className="text-[10px] text-[var(--theme-text-muted)] flex items-center gap-1.5">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z" />
                                </svg>
                                Minify can save 20-30% tokens without affecting AI understanding
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CodeProcessingSelector;
