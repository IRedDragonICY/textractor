import React, { useState, useMemo } from 'react';
import { GoogleIcon } from './ui/GoogleIcon';
import { TEXT_FILE_EXTENSIONS } from '@/constants';
import { AppSettings } from '@/types/settings';
import { UI_ICONS_MAP } from '@/lib/icon-mapping';

// Extension categories for professional grouping
const EXTENSION_CATEGORIES: Record<string, { label: string; color: string; extensions: string[] }> = {
    web: {
        label: 'Web Development',
        color: '#3B82F6',
        extensions: ['html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less', 'styl', 'stylus', 'pcss', 'postcss']
    },
    javascript: {
        label: 'JavaScript / TypeScript',
        color: '#F7DF1E',
        extensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx']
    },
    frontend: {
        label: 'Frontend Frameworks',
        color: '#41B883',
        extensions: ['vue', 'svelte', 'astro', 'angular']
    },
    python: {
        label: 'Python',
        color: '#3776AB',
        extensions: ['py', 'pyw', 'pyx', 'pxd', 'pyi']
    },
    java: {
        label: 'Java / JVM',
        color: '#007396',
        extensions: ['java', 'kt', 'kts', 'scala', 'sc', 'groovy', 'gradle', 'clj', 'cljs', 'cljc', 'edn']
    },
    cFamily: {
        label: 'C / C++ / C#',
        color: '#00599C',
        extensions: ['c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'hxx', 'cs', 'csx']
    },
    systems: {
        label: 'Systems Programming',
        color: '#DEA584',
        extensions: ['go', 'mod', 'sum', 'rs', 'zig', 'nim', 'cr']
    },
    functional: {
        label: 'Functional Languages',
        color: '#5E5086',
        extensions: ['hs', 'lhs', 'ml', 'mli', 'fs', 'fsx', 'fsi', 'ex', 'exs', 'eex', 'heex', 'erl', 'hrl']
    },
    mobile: {
        label: 'Mobile Development',
        color: '#0175C2',
        extensions: ['swift', 'dart', 'arb']
    },
    scripting: {
        label: 'Scripting Languages',
        color: '#CC342D',
        extensions: ['php', 'phtml', 'rb', 'erb', 'rake', 'gemspec', 'pl', 'pm', 'pod', 't', 'lua']
    },
    shell: {
        label: 'Shell / Terminal',
        color: '#4EAA25',
        extensions: ['sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh', 'bat', 'cmd', 'ps1', 'psm1', 'psd1']
    },
    data: {
        label: 'Data & Config',
        color: '#F7DF1E',
        extensions: ['json', 'jsonc', 'json5', 'xml', 'xsl', 'xslt', 'yaml', 'yml', 'toml', 'csv', 'tsv', 'ini', 'cfg', 'conf', 'env', 'properties', 'prop']
    },
    database: {
        label: 'Database',
        color: '#4479A1',
        extensions: ['sql', 'prisma', 'graphql', 'gql']
    },
    template: {
        label: 'Templates',
        color: '#E34F26',
        extensions: ['pug', 'jade', 'hbs', 'handlebars', 'mustache', 'ejs', 'njk', 'nunjucks', 'twig', 'liquid']
    },
    docs: {
        label: 'Documentation',
        color: '#9CA3AF',
        extensions: ['md', 'mdx', 'markdown', 'rst', 'adoc', 'asciidoc', 'txt', 'tex', 'latex', 'bib']
    },
    devops: {
        label: 'DevOps & Cloud',
        color: '#2496ED',
        extensions: ['dockerfile', 'tf', 'tfvars', 'hcl', 'config', 'editorconfig', 'htaccess']
    },
    git: {
        label: 'Git & Version Control',
        color: '#F05032',
        extensions: ['gitignore', 'gitattributes', 'gitmodules', 'gitkeep']
    },
    scientific: {
        label: 'Scientific Computing',
        color: '#276DC3',
        extensions: ['r', 'rmd', 'jl', 'm', 'mat', 'f', 'f90', 'f95', 'for']
    },
    graphics: {
        label: 'Graphics & Shaders',
        color: '#5586A4',
        extensions: ['glsl', 'vert', 'frag', 'hlsl', 'shader']
    },
    blockchain: {
        label: 'Blockchain',
        color: '#627EEA',
        extensions: ['sol', 'vy']
    },
    lowLevel: {
        label: 'Low-Level',
        color: '#6E4C13',
        extensions: ['asm', 's', 'nasm', 'wasm', 'wat', 'coffee', 'litcoffee']
    },
    build: {
        label: 'Build Tools',
        color: '#FF6B6B',
        extensions: ['makefile', 'mk', 'cmake', 'meson', 'ninja']
    }
};

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
    const [extensionSearch, setExtensionSearch] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    const handleAddItem = (list: string[], updater: (l: string[]) => void) => {
        if (newItem && !list.includes(newItem)) {
            updater([...list, newItem]);
            setNewItem('');
        }
    };

    const handleRemoveItem = (list: string[], item: string, updater: (l: string[]) => void) => {
        updater(list.filter(i => i !== item));
    };

    const toggleCategory = (categoryKey: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryKey)) {
                next.delete(categoryKey);
            } else {
                next.add(categoryKey);
            }
            return next;
        });
    };

    const selectAllInCategory = (extensions: string[], select: boolean) => {
        const currentSet = new Set(settings.filters.sourceCodeExtensions);
        extensions.forEach(ext => {
            if (select) {
                currentSet.add(ext);
            } else {
                currentSet.delete(ext);
            }
        });
        onUpdateFilters({ sourceCodeExtensions: Array.from(currentSet) });
    };

    // Filter categories based on search
    const filteredCategories = useMemo(() => {
        if (!extensionSearch) return EXTENSION_CATEGORIES;
        
        const search = extensionSearch.toLowerCase();
        const result: typeof EXTENSION_CATEGORIES = {};
        
        Object.entries(EXTENSION_CATEGORIES).forEach(([key, category]) => {
            const matchingExts = category.extensions.filter(ext => ext.includes(search));
            if (matchingExts.length > 0 || category.label.toLowerCase().includes(search)) {
                result[key] = {
                    ...category,
                    extensions: matchingExts.length > 0 ? matchingExts : category.extensions
                };
            }
        });
        
        return result;
    }, [extensionSearch]);

    const allExtensions = Array.from(new Set([...Array.from(TEXT_FILE_EXTENSIONS), ...settings.filters.sourceCodeExtensions])).sort();
    const showAddOption = extensionSearch && !allExtensions.includes(extensionSearch.toLowerCase());

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)] text-[var(--theme-text-primary)] font-sans">
            {/* Header - VS Code Style */}
            <div className="flex-shrink-0 h-12 px-4 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-secondary)]">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-[var(--theme-text-tertiary)]">SETTINGS</span>
                </div>
                <button 
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--theme-surface-hover)] text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
                >
                    <GoogleIcon icon={UI_ICONS_MAP.refresh} className="w-3.5 h-3.5" />
                    Reset to Defaults
                </button>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* Sidebar - VS Code Settings Style */}
                <div className="w-56 border-r border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] flex flex-col py-2">
                    <div className="px-3 mb-2">
                        <span className="text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider">Categories</span>
                    </div>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-2 px-3 py-1.5 mx-2 rounded-sm text-sm transition-colors text-left ${
                            activeTab === 'security' 
                                ? 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-primary)]' 
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-primary)]'
                        }`}
                    >
                        <GoogleIcon icon={UI_ICONS_MAP.check} className="w-4 h-4 opacity-70" />
                        Security & Privacy
                    </button>
                    <button
                        onClick={() => setActiveTab('filters')}
                        className={`flex items-center gap-2 px-3 py-1.5 mx-2 rounded-sm text-sm transition-colors text-left ${
                            activeTab === 'filters' 
                                ? 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-primary)]' 
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-primary)]'
                        }`}
                    >
                        <GoogleIcon icon={UI_ICONS_MAP.tune} className="w-4 h-4 opacity-70" />
                        File Filters
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-[var(--theme-bg)] scrollbar-thin">
                    {activeTab === 'security' && (
                        <div className="max-w-3xl space-y-8">
                            {/* Section Header */}
                            <div className="pb-4 border-b border-[var(--theme-border)]">
                                <h2 className="text-lg font-medium text-[var(--theme-text-primary)]">Security & Privacy</h2>
                                <p className="text-sm text-[var(--theme-text-secondary)] mt-1">
                                    Manage security scans and blocked patterns
                                </p>
                            </div>

                            {/* Pre-flight Check */}
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-[var(--theme-text-primary)]">Pre-flight Security Check</h3>
                                        <p className="text-xs text-[var(--theme-text-tertiary)] mt-1 max-w-md">
                                            Automatically scan files for secrets and sensitive data before copying or exporting.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onUpdateSecurity({ enablePreFlightCheck: !settings.security.enablePreFlightCheck })}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)] ${
                                            settings.security.enablePreFlightCheck ? 'bg-[var(--theme-primary)]' : 'bg-[var(--theme-border)]'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                settings.security.enablePreFlightCheck ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Entropy Scanning */}
                                <div className="pl-3 border-l border-[var(--theme-border)] space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="pr-4">
                                            <h4 className="text-sm font-medium text-[var(--theme-text-primary)]">High-Entropy Secret Detection</h4>
                                            <p className="text-xs text-[var(--theme-text-tertiary)] mt-1 max-w-md">
                                                Flags tokens that look random (API keys, private keys) using Shannon entropy. Disable if you see too many false positives.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => onUpdateSecurity({ enableEntropyScanning: !settings.security.enableEntropyScanning })}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg)] ${
                                                settings.security.enableEntropyScanning ? 'bg-[var(--theme-primary)]' : 'bg-[var(--theme-border)]'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                    settings.security.enableEntropyScanning ? 'translate-x-5' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-[var(--theme-text-secondary)]">
                                        <label htmlFor="entropy-threshold" className="font-medium text-[var(--theme-text-primary)]">
                                            Entropy Threshold
                                        </label>
                                        <input
                                            id="entropy-threshold"
                                            type="number"
                                            min={0}
                                            max={8}
                                            step={0.1}
                                            value={settings.security.entropyThreshold}
                                            onChange={(e) => onUpdateSecurity({ entropyThreshold: Number(e.target.value) || 0 })}
                                            className="w-20 px-2 py-1 rounded border border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
                                        />
                                        <span className="text-[var(--theme-text-tertiary)]">
                                            Higher = stricter (default 4.5)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Blocked Filenames */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                    Blocked Filenames
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add pattern (e.g. *.env)"
                                        className="flex-1 px-3 py-1.5 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] rounded-sm text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-colors"
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
                                        <div key={pattern} className="flex items-center gap-1.5 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded px-2 py-1">
                                            <span className="text-xs font-mono text-[var(--theme-text-primary)]">{pattern}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(settings.security.blockedFilePatterns, pattern, (l) => onUpdateSecurity({ blockedFilePatterns: l }))}
                                                className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)] transition-colors"
                                            >
                                                <GoogleIcon icon={UI_ICONS_MAP.close} className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Blocked Content Patterns */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                    Blocked Content Patterns (Regex)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add regex pattern"
                                        className="flex-1 px-3 py-1.5 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] rounded-sm text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-colors"
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
                                        <div key={pattern} className="flex items-center gap-1.5 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded px-2 py-1">
                                            <span className="text-xs font-mono text-[var(--theme-text-primary)] max-w-[200px] truncate" title={pattern}>{pattern}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(settings.security.blockedContentPatterns, pattern, (l) => onUpdateSecurity({ blockedContentPatterns: l }))}
                                                className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)] transition-colors"
                                            >
                                                <GoogleIcon icon={UI_ICONS_MAP.close} className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'filters' && (
                        <div className="max-w-3xl space-y-8">
                            {/* Section Header */}
                            <div className="pb-4 border-b border-[var(--theme-border)]">
                                <h2 className="text-lg font-medium text-[var(--theme-text-primary)]">File Filters</h2>
                                <p className="text-sm text-[var(--theme-text-secondary)] mt-1">
                                    Configure exclusion rules for file imports
                                </p>
                            </div>

                            {/* Ignored Folders */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                    Ignored Folders
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add folder name (e.g. node_modules)"
                                        className="flex-1 px-3 py-1.5 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] rounded-sm text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-colors"
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
                                        <div key={folder} className="flex items-center gap-1.5 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded px-2 py-1">
                                            <GoogleIcon icon={UI_ICONS_MAP.folder} className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
                                            <span className="text-xs text-[var(--theme-text-primary)]">{folder}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(settings.filters.ignoredFolders, folder, (l) => onUpdateFilters({ ignoredFolders: l }))}
                                                className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)] transition-colors"
                                            >
                                                <GoogleIcon icon={UI_ICONS_MAP.close} className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ignored Extensions */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                    Ignored Extensions
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add extension (e.g. lock)"
                                        className="flex-1 px-3 py-1.5 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] rounded-sm text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-colors"
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
                                        <div key={ext} className="flex items-center gap-1.5 bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded px-2 py-1">
                                            <span className="text-xs font-mono text-[var(--theme-text-primary)]">.{ext}</span>
                                            <button 
                                                onClick={() => handleRemoveItem(settings.filters.ignoredExtensions, ext, (l) => onUpdateFilters({ ignoredExtensions: l }))}
                                                className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)] transition-colors"
                                            >
                                                <GoogleIcon icon={UI_ICONS_MAP.close} className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Source Code Extensions */}
                            <div className="space-y-4 pt-4 border-t border-[var(--theme-border)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-[var(--theme-text-primary)]">Source Code Extensions</h3>
                                        <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">
                                            Select extensions to be included in the &quot;Source Code&quot; filter.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="px-2 py-0.5 rounded bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] border border-[var(--theme-border)]">
                                            {settings.filters.sourceCodeExtensions.length} selected
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Search Bar */}
                                <div className="relative">
                                    <GoogleIcon icon={UI_ICONS_MAP.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
                                    <input
                                        type="text"
                                        placeholder="Search extensions..."
                                        value={extensionSearch}
                                        onChange={(e) => setExtensionSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 bg-[var(--theme-input-bg)] border border-[var(--theme-input-border)] rounded-sm text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-colors"
                                    />
                                </div>

                                {showAddOption && (
                                    <button
                                        onClick={() => {
                                            const newExt = extensionSearch.toLowerCase();
                                            onUpdateFilters({ sourceCodeExtensions: [...settings.filters.sourceCodeExtensions, newExt] });
                                            setExtensionSearch('');
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 rounded-sm border border-dashed border-[var(--theme-primary)] bg-[var(--theme-primary)]/5 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all w-full justify-center"
                                    >
                                        <GoogleIcon icon={UI_ICONS_MAP.add} className="w-4 h-4" />
                                        <span className="text-xs font-medium">Add custom extension: .{extensionSearch}</span>
                                    </button>
                                )}

                                {/* Categorized Extensions */}
                                <div className="space-y-3">
                                    {Object.entries(filteredCategories).map(([categoryKey, category]) => {
                                        const isCollapsed = collapsedCategories.has(categoryKey);
                                        const selectedCount = category.extensions.filter(ext => 
                                            settings.filters.sourceCodeExtensions.includes(ext)
                                        ).length;
                                        const allSelected = selectedCount === category.extensions.length;
                                        const someSelected = selectedCount > 0 && !allSelected;

                                        return (
                                            <div 
                                                key={categoryKey}
                                                className="border border-[var(--theme-border)] rounded-sm overflow-hidden bg-[var(--theme-surface)]"
                                            >
                                                {/* Category Header */}
                                                <div 
                                                    className="flex items-center justify-between px-3 py-2 bg-[var(--theme-bg-secondary)] cursor-pointer hover:bg-[var(--theme-surface-hover)] transition-colors"
                                                    onClick={() => toggleCategory(categoryKey)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <GoogleIcon 
                                                            icon={UI_ICONS_MAP.chevron_right} 
                                                            className={`w-3.5 h-3.5 text-[var(--theme-text-tertiary)] transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                                                        />
                                                        <span className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">
                                                            {category.label}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] border border-[var(--theme-border)]">
                                                            {selectedCount}/{category.extensions.length}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            selectAllInCategory(category.extensions, !allSelected);
                                                        }}
                                                        className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                                                            allSelected 
                                                                ? 'bg-[var(--theme-primary)] text-white' 
                                                                : someSelected
                                                                    ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                                                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)]'
                                                        }`}
                                                    >
                                                        {allSelected ? 'Deselect All' : 'Select All'}
                                                    </button>
                                                </div>

                                                {/* Category Extensions */}
                                                {!isCollapsed && (
                                                    <div className="p-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
                                                        {category.extensions.map(ext => {
                                                            const isSelected = settings.filters.sourceCodeExtensions.includes(ext);
                                                            return (
                                                                <button
                                                                    key={ext}
                                                                    onClick={() => {
                                                                        const newExtensions = isSelected
                                                                            ? settings.filters.sourceCodeExtensions.filter(e => e !== ext)
                                                                            : [...settings.filters.sourceCodeExtensions, ext];
                                                                        onUpdateFilters({ sourceCodeExtensions: newExtensions });
                                                                    }}
                                                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border transition-all text-left group ${
                                                                        isSelected 
                                                                            ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]' 
                                                                            : 'bg-[var(--theme-bg)] border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-text-tertiary)]'
                                                                    }`}
                                                                >
                                                                    <div className={`w-3 h-3 border rounded-sm flex items-center justify-center transition-colors ${
                                                                        isSelected 
                                                                            ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)]' 
                                                                            : 'border-[var(--theme-text-tertiary)] group-hover:border-[var(--theme-text-secondary)]'
                                                                    }`}>
                                                                        {isSelected && <GoogleIcon icon={UI_ICONS_MAP.check} className="w-2.5 h-2.5 text-white" />}
                                                                    </div>
                                                                    <span className="text-xs font-mono truncate">.{ext}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
