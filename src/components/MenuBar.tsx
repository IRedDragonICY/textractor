// Modern Menu Bar Component - Material You Design
// Professional-grade menu bar with File, Edit, View, Help menus

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { useTheme } from '@/hooks/useTheme';

// Icons
const ICONS = {
    file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    newFile: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm5-6v3h2v-3h3v-2h-3V9h-2v3H8v2h3z",
    upload: "M11 16V7.85l-2.6 2.6L7 9l5-5 5 5-1.4 1.45-2.6-2.6V16h-2Zm-5 4q-.825 0-1.413-.587Q4 18.825 4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413Q18.825 20 18 20H6Z",
    github: "M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.24 0-1.16.46-2.11 1.2-2.85a3.8 3.8 0 010-2.94s.95-.26 3.11 1.1a10.2 10.2 0 015.6 0c2.16-1.37 3.11-1.08 3.11-1.08a3.8 3.8 0 01.02 2.92c.74.74 1.2 1.69 1.2 2.85 0 4.06-2.59 4.96-5.05 5.23a1.75 1.75 0 01.5 1.35v2.23c0 .27.2.65.75.55A11 11 0 0012 1.27",
    undo: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z",
    redo: "M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z",
    copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    selectAll: "M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z",
    help: "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
    info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    keyboard: "M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    sun: "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z",
    moon: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z",
    system: "M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z",
    palette: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
    heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    bug: "M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z",
    openInNew: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
    settings: "M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
};

interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    onClick?: () => void;
    disabled?: boolean;
    divider?: boolean;
    checked?: boolean;
}

interface MenuProps {
    label: string;
    items: MenuItem[];
}

interface MenuBarProps {
    onNewSession: () => void;
    onOpenFiles: () => void;
    onImportRepo: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onCopyOutput: () => void;
    onSelectAll: () => void;
    onShowAbout: () => void;
    onShowShortcuts: () => void;
    onShowSettings: () => void;
    onReportIssue: () => void;
    hasContent: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
    onNewSession,
    onOpenFiles,
    onImportRepo,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onCopyOutput,
    onSelectAll,
    onShowAbout,
    onShowShortcuts,
    onShowSettings,
    onReportIssue,
    hasContent,
}) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuBarRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme } = useTheme();

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menus: MenuProps[] = [
        {
            label: 'File',
            items: [
                { id: 'new', label: 'New Session', icon: ICONS.newFile, shortcut: 'Ctrl+T', onClick: onNewSession },
                { id: 'divider1', label: '', divider: true },
                { id: 'open', label: 'Open Files...', icon: ICONS.upload, shortcut: 'Ctrl+O', onClick: onOpenFiles },
                { id: 'import', label: 'Import Repository...', icon: ICONS.github, onClick: onImportRepo },
                { id: 'divider2', label: '', divider: true },
                { id: 'settings', label: 'Settings', icon: ICONS.settings, onClick: onShowSettings },
            ],
        },
        {
            label: 'Edit',
            items: [
                { id: 'undo', label: 'Undo', icon: ICONS.undo, shortcut: 'Ctrl+Z', onClick: onUndo, disabled: !canUndo },
                { id: 'redo', label: 'Redo', icon: ICONS.redo, shortcut: 'Ctrl+Shift+Z', onClick: onRedo, disabled: !canRedo },
                { id: 'divider1', label: '', divider: true },
                { id: 'copy', label: 'Copy Output', icon: ICONS.copy, shortcut: 'Ctrl+Shift+C', onClick: onCopyOutput, disabled: !hasContent },
                { id: 'selectAll', label: 'Select All', icon: ICONS.selectAll, shortcut: 'Ctrl+A', onClick: onSelectAll, disabled: !hasContent },
            ],
        },
        {
            label: 'View',
            items: [
                { 
                    id: 'theme-light', 
                    label: 'Light Theme', 
                    icon: ICONS.sun, 
                    onClick: () => setTheme('light'),
                    checked: theme === 'light',
                },
                { 
                    id: 'theme-dark', 
                    label: 'Dark Theme', 
                    icon: ICONS.moon, 
                    onClick: () => setTheme('dark'),
                    checked: theme === 'dark',
                },
                { 
                    id: 'theme-system', 
                    label: 'System Theme', 
                    icon: ICONS.system, 
                    onClick: () => setTheme('system'),
                    checked: theme === 'system',
                },
            ],
        },
        {
            label: 'Help',
            items: [
                { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: ICONS.keyboard, shortcut: 'Ctrl+/', onClick: onShowShortcuts },
                { id: 'divider1', label: '', divider: true },
                { id: 'report-issue', label: 'Report Issue...', icon: ICONS.bug, onClick: onReportIssue },
                { id: 'github', label: 'View on GitHub', icon: ICONS.github, onClick: () => window.open('https://github.com/IRedDragonICY/contextractor', '_blank') },
                { id: 'divider2', label: '', divider: true },
                { id: 'about', label: 'About Contextractor', icon: ICONS.info, onClick: onShowAbout },
            ],
        },
    ];

    const handleMenuClick = (menuLabel: string) => {
        setActiveMenu(prev => prev === menuLabel ? null : menuLabel);
    };

    const handleItemClick = (item: MenuItem) => {
        if (item.disabled) return;
        item.onClick?.();
        setActiveMenu(null);
    };

    return (
        <div 
            ref={menuBarRef}
            className="bg-[var(--theme-surface)] h-[30px] flex items-center px-2 text-[13px] select-none"
        >
            {menus.map(menu => (
                <div key={menu.label} className="relative">
                    <button
                        onClick={() => handleMenuClick(menu.label)}
                        onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
                        className={`
                            px-3 py-1 rounded-sm transition-colors
                            ${activeMenu === menu.label 
                                ? 'bg-[var(--theme-menu-hover)] text-[var(--theme-text-primary)]' 
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]'
                            }
                        `}
                    >
                        {menu.label}
                    </button>

                    <AnimatePresence>
                        {activeMenu === menu.label && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.1 }}
                                className="absolute top-full left-0 mt-0.5 bg-[var(--theme-menu-bg)] border border-[var(--theme-border)] rounded-md shadow-xl py-1 min-w-[220px] z-[100]"
                            >
                                {menu.items.map((item, idx) => (
                                    item.divider ? (
                                        <div key={`divider-${idx}`} className="h-px bg-[var(--theme-border)] my-1" />
                                    ) : (
                                        <button
                                            key={item.id}
                                            onClick={() => handleItemClick(item)}
                                            disabled={item.disabled}
                                            className={`
                                                w-full flex items-center gap-3 px-3 py-1.5 text-left transition-colors
                                                ${item.disabled 
                                                    ? 'text-[var(--theme-text-muted)] cursor-not-allowed' 
                                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-menu-hover)] hover:text-[var(--theme-text-primary)]'
                                                }
                                            `}
                                        >
                                            {item.checked !== undefined ? (
                                                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                                    {item.checked && (
                                                        <GoogleIcon path={ICONS.check} className="w-4 h-4 text-[var(--theme-primary)]" />
                                                    )}
                                                </div>
                                            ) : item.icon ? (
                                                <GoogleIcon path={item.icon} className="w-4 h-4 shrink-0" />
                                            ) : null}
                                            <span className="flex-1">{item.label}</span>
                                            {item.shortcut && (
                                                <span className="text-[11px] text-[var(--theme-text-muted)] ml-4">
                                                    {item.shortcut}
                                                </span>
                                            )}
                                        </button>
                                    )
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

// About Modal Component - Material You Flat Design
interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    const openExternalLink = useCallback((url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    }, []);

    if (!isOpen) return null;

    const GITHUB_REPO_URL = 'https://github.com/IRedDragonICY/contextractor';

    const quickLinks = [
        { 
            name: 'View on GitHub', 
            icon: ICONS.github, 
            url: GITHUB_REPO_URL,
            description: 'Star, Fork, Contribute'
        },
        { 
            name: 'Report an Issue', 
            icon: ICONS.bug, 
            url: `${GITHUB_REPO_URL}/issues/new`,
            description: 'Found a bug? Let us know'
        },
    ];

    const supportLinks = [
        { name: 'Ko-fi', url: 'https://ko-fi.com/ireddragonicy', color: '#FF5E5B' },
        { name: 'PayPal', url: 'https://paypal.com/paypalme/IRedDragonICY', color: '#003087' },
        { name: 'Saweria', url: 'https://saweria.co/IRedDragonICY', color: '#F59E0B' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                className="bg-[var(--theme-surface-elevated)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-[var(--theme-border)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Minimal Header */}
                <div className="p-6 pb-4 flex items-start gap-4">
                    {/* App Icon */}
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 bg-[var(--theme-surface)]">
                        <Image
                            src="/icon.png"
                            alt="Contextractor"
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                        />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">Contextractor</h2>
                        <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">Version 1.0.0</p>
                        <p className="text-sm text-[var(--theme-text-secondary)] mt-2 leading-relaxed">
                            Extract clean, formatted context from your codebase for AI & LLMs.
                        </p>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] flex items-center justify-center transition-colors flex-shrink-0"
                    >
                        <GoogleIcon path={ICONS.close} className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                    </button>
                </div>

                {/* Quick Links */}
                <div className="px-6 space-y-2">
                    {quickLinks.map((link) => (
                        <motion.button
                            key={link.name}
                            onClick={() => openExternalLink(link.url)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="w-full flex items-center gap-3 p-3 bg-[var(--theme-surface)] hover:bg-[var(--theme-primary)]/8 rounded-2xl transition-colors group border border-transparent hover:border-[var(--theme-primary)]/20"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center">
                                <GoogleIcon path={link.icon} className="w-5 h-5 text-[var(--theme-primary)]" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-[var(--theme-text-primary)]">{link.name}</p>
                                <p className="text-xs text-[var(--theme-text-tertiary)]">{link.description}</p>
                            </div>
                            <GoogleIcon path={ICONS.openInNew} className="w-4 h-4 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-primary)]" />
                        </motion.button>
                    ))}
                </div>

                {/* Divider */}
                <div className="mx-6 my-4 h-px bg-[var(--theme-border)]" />

                {/* Developer Info */}
                <div className="px-6">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--theme-surface)]">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--theme-primary)] to-[#6366f1] flex items-center justify-center text-white font-semibold text-sm shadow-md">
                            MF
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--theme-text-primary)]">Mohammad Farid Hendianto</p>
                            <p className="text-xs text-[var(--theme-text-tertiary)]">Developer • @IRedDragonICY</p>
                        </div>
                        <motion.button
                            onClick={() => openExternalLink('https://github.com/IRedDragonICY')}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-8 h-8 rounded-full bg-[var(--theme-surface-hover)] hover:bg-[var(--theme-primary)]/10 flex items-center justify-center transition-colors"
                        >
                            <GoogleIcon path={ICONS.github} className="w-4 h-4 text-[var(--theme-text-secondary)]" />
                        </motion.button>
                    </div>
                </div>

                {/* Support Section */}
                <div className="px-6 pt-4 pb-5">
                    <p className="text-xs text-[var(--theme-text-tertiary)] mb-3 text-center">Support Development</p>
                    <div className="flex justify-center gap-2">
                        {supportLinks.map((link) => (
                            <motion.button
                                key={link.name}
                                onClick={() => openExternalLink(link.url)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-4 py-2 bg-[var(--theme-surface)] hover:bg-[var(--theme-surface-hover)] rounded-full text-xs font-medium text-[var(--theme-text-secondary)] border border-[var(--theme-border)] hover:border-[var(--theme-primary)]/30 transition-all flex items-center gap-1.5"
                            >
                                <GoogleIcon path={ICONS.heart} className="w-3 h-3" style={{ color: link.color }} />
                                {link.name}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-[var(--theme-surface)] border-t border-[var(--theme-border)]">
                    <p className="text-center text-[10px] text-[var(--theme-text-muted)] flex items-center justify-center gap-1">
                        © 2025 Contextractor • Made with <GoogleIcon path={ICONS.heart} className="w-2.5 h-2.5 text-red-500" /> in Indonesia
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

// Keyboard Shortcuts Modal
interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const shortcuts = [
        { category: 'General', items: [
            { keys: 'Ctrl + T', description: 'New session' },
            { keys: 'Ctrl + W', description: 'Close current tab' },
            { keys: 'Ctrl + Tab', description: 'Switch to next tab' },
        ]},
        { category: 'Edit', items: [
            { keys: 'Ctrl + Z', description: 'Undo' },
            { keys: 'Ctrl + Shift + Z', description: 'Redo' },
            { keys: 'Ctrl + C', description: 'Copy selected' },
            { keys: 'Ctrl + V', description: 'Paste from clipboard' },
        ]},
        { category: 'View', items: [
            { keys: 'Ctrl + F', description: 'Find in output' },
            { keys: 'Ctrl + Shift + C', description: 'Copy all output' },
        ]},
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[var(--theme-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[var(--theme-surface-elevated)] rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-[var(--theme-border)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
                        <GoogleIcon path={ICONS.keyboard} className="w-5 h-5 text-[var(--theme-primary)]" />
                        Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)] rounded-lg transition-colors"
                    >
                        <GoogleIcon path={ICONS.close} className="w-5 h-5" />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="space-y-6">
                    {shortcuts.map(section => (
                        <div key={section.category}>
                            <h3 className="text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wide mb-3">
                                {section.category}
                            </h3>
                            <div className="space-y-2">
                                {section.items.map(shortcut => (
                                    <div 
                                        key={shortcut.keys}
                                        className="flex items-center justify-between py-2 px-3 bg-[var(--theme-surface)] rounded-lg"
                                    >
                                        <span className="text-sm text-[var(--theme-text-secondary)]">{shortcut.description}</span>
                                        <kbd className="px-2 py-1 bg-[var(--theme-surface-hover)] text-[var(--theme-primary)] text-xs rounded font-mono">
                                            {shortcut.keys}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default MenuBar;
