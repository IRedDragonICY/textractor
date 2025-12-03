import React, { useState } from 'react';
import { GoogleIcon } from './ui/GoogleIcon';
import { UI_ICONS, ICONS_PATHS } from '@/constants';
import { AppSettings } from '@/types/settings';

interface SettingsViewProps {
    settings: AppSettings;
    onUpdateSecurity: (s: Partial<AppSettings['security']>) => void;
    onUpdateFilters: (f: Partial<AppSettings['filters']>) => void;
    onReset: () => void;
}

type Tab = 'general' | 'security' | 'filters';

export const SettingsView = ({ 
    settings, 
    onUpdateSecurity, 
    onUpdateFilters,
    onReset
}: SettingsViewProps) => {
    const [activeTab, setActiveTab] = useState<Tab>('security');
    const [newItem, setNewItem] = useState('');

    const handleAddItem = (list: string[], updater: (l: string[]) => void) => {
        if (newItem && !list.includes(newItem)) {
            updater([...list, newItem]);
            setNewItem('');
        }
    };

    const handleRemoveItem = (list: string[], item: string, updater: (l: string[]) => void) => {
        updater(list.filter(i => i !== item));
    };

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-surface-elevated)] flex items-center justify-center">
                        <GoogleIcon path={ICONS_PATHS.settings} className="w-6 h-6 text-[var(--theme-text-primary)]" />
                    </div>
                    <h2 className="text-xl font-medium text-[var(--theme-text-primary)]">Settings</h2>
                </div>
                <button 
                    onClick={onReset}
                    className="text-sm text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)] transition-colors"
                >
                    Reset to Defaults
                </button>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* Sidebar */}
                <div className="w-64 border-r border-[var(--theme-border)] bg-[var(--theme-surface-hover)]/30 p-4 flex flex-col gap-2">
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                            activeTab === 'security' 
                                ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' 
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]'
                        }`}
                    >
                        <GoogleIcon path={UI_ICONS.check} className="w-5 h-5" />
                        Security & Privacy
                    </button>
                    <button
                        onClick={() => setActiveTab('filters')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                            activeTab === 'filters' 
                                ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' 
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]'
                        }`}
                    >
                        <GoogleIcon path={UI_ICONS.tune} className="w-5 h-5" />
                        File Filters
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-[var(--theme-surface)]">
                    {activeTab === 'security' && (
                        <div className="space-y-8 max-w-3xl">
                            <div>
                                <h3 className="text-lg font-medium text-[var(--theme-text-primary)] mb-1">Pre-flight Security Check</h3>
                                <p className="text-sm text-[var(--theme-text-tertiary)] mb-4">
                                    Automatically scan files for secrets and sensitive data before copying or exporting.
                                </p>
                                
                                <div className="flex items-center gap-3 mb-6">
                                    <button
                                        onClick={() => onUpdateSecurity({ enablePreFlightCheck: !settings.security.enablePreFlightCheck })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${
                                            settings.security.enablePreFlightCheck ? 'bg-[var(--theme-primary)]' : 'bg-[var(--theme-border)]'
                                        }`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            settings.security.enablePreFlightCheck ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                    <span className="text-sm font-medium text-[var(--theme-text-primary)]">
                                        {settings.security.enablePreFlightCheck ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-[var(--theme-text-secondary)] uppercase tracking-wider">Blocked Filenames</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add pattern (e.g. *.env)"
                                        className="flex-1 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddItem(settings.security.blockedFilePatterns, (l) => onUpdateSecurity({ blockedFilePatterns: l }));
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {settings.security.blockedFilePatterns.map(pattern => (
                                        <div key={pattern} className="flex items-center gap-2 bg-[var(--theme-surface-elevated)] border border-[var(--theme-border)] rounded-lg px-3 py-1.5">
                                            <span className="text-sm font-mono">{pattern}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(settings.security.blockedFilePatterns, pattern, (l) => onUpdateSecurity({ blockedFilePatterns: l }))}
                                                className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)]"
                                            >
                                                <GoogleIcon path={UI_ICONS.close} className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-[var(--theme-text-secondary)] uppercase tracking-wider">Blocked Content Patterns (Regex)</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add regex pattern"
                                        className="flex-1 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddItem(settings.security.blockedContentPatterns, (l) => onUpdateSecurity({ blockedContentPatterns: l }));
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {settings.security.blockedContentPatterns.map(pattern => (
                                        <div key={pattern} className="flex items-center gap-2 bg-[var(--theme-surface-elevated)] border border-[var(--theme-border)] rounded-lg px-3 py-1.5">
                                            <span className="text-sm font-mono max-w-[200px] truncate" title={pattern}>{pattern}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(settings.security.blockedContentPatterns, pattern, (l) => onUpdateSecurity({ blockedContentPatterns: l }))}
                                                className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)]"
                                            >
                                                <GoogleIcon path={UI_ICONS.close} className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'filters' && (
                        <div className="space-y-8 max-w-3xl">
                            <div>
                                <h3 className="text-lg font-medium text-[var(--theme-text-primary)] mb-1">Global File Filters</h3>
                                <p className="text-sm text-[var(--theme-text-tertiary)] mb-4">
                                    Configure which files and folders are automatically ignored during import (Drag & Drop and Git).
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-[var(--theme-text-secondary)] uppercase tracking-wider">Ignored Folders</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add folder name (e.g. node_modules)"
                                        className="flex-1 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddItem(settings.filters.ignoredFolders, (l) => onUpdateFilters({ ignoredFolders: l }));
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {settings.filters.ignoredFolders.map(folder => (
                                        <div key={folder} className="flex items-center gap-2 bg-[var(--theme-surface-elevated)] border border-[var(--theme-border)] rounded-lg px-3 py-1.5">
                                            <GoogleIcon path={ICONS_PATHS.folder} className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                                            <span className="text-sm">{folder}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(settings.filters.ignoredFolders, folder, (l) => onUpdateFilters({ ignoredFolders: l }))}
                                                className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)]"
                                            >
                                                <GoogleIcon path={UI_ICONS.close} className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-[var(--theme-text-secondary)] uppercase tracking-wider">Ignored Extensions</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add extension (e.g. lock)"
                                        className="flex-1 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddItem(settings.filters.ignoredExtensions, (l) => onUpdateFilters({ ignoredExtensions: l }));
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {settings.filters.ignoredExtensions.map(ext => (
                                        <div key={ext} className="flex items-center gap-2 bg-[var(--theme-surface-elevated)] border border-[var(--theme-border)] rounded-lg px-3 py-1.5">
                                            <span className="text-sm font-mono">.{ext}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(settings.filters.ignoredExtensions, ext, (l) => onUpdateFilters({ ignoredExtensions: l }))}
                                                className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)]"
                                            >
                                                <GoogleIcon path={UI_ICONS.close} className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
