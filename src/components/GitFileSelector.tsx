'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleButton } from './ui/GoogleButton';
import { GoogleIcon } from './ui/GoogleIcon';
import { UI_ICONS, ICONS_PATHS } from '@/constants';
import { GitTreeNode, GitRepoMetadata } from '@/types';
import { getFileIconInfo } from '@/lib/icons';
import { fetchGitTree, fetchSelectedFiles, countSelectedFiles } from '@/lib/git-service';

interface GitFileSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (files: Awaited<ReturnType<typeof fetchSelectedFiles>>) => void;
}

interface TreeItemProps {
    node: GitTreeNode;
    level: number;
    onToggle: (path: string) => void;
    expandedFolders: Set<string>;
    toggleExpand: (path: string) => void;
    searchTerm: string;
}

const TreeItemComponent = React.memo(({ node, level, onToggle, expandedFolders, toggleExpand, searchTerm }: TreeItemProps) => {
    const isExpanded = expandedFolders.has(node.path);
    const hasChildren = node.children.length > 0;
    const isFolder = node.type === 'folder';
    const iconInfo = isFolder ? null : getFileIconInfo(node.name);
    
    // Highlight matching text
    const highlightMatch = (text: string) => {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => 
            regex.test(part) ? <mark key={i} className="bg-[var(--theme-primary)]/30 text-[var(--theme-primary)] rounded px-0.5">{part}</mark> : part
        );
    };

    // Check if node matches search
    const matchesSearch = useMemo(() => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return node.name.toLowerCase().includes(term) || node.path.toLowerCase().includes(term);
    }, [node.name, node.path, searchTerm]);

    // Check if any children match search
    const hasMatchingChildren = useMemo(() => {
        if (!searchTerm) return true;
        const checkChildren = (n: GitTreeNode): boolean => {
            const term = searchTerm.toLowerCase();
            if (n.name.toLowerCase().includes(term) || n.path.toLowerCase().includes(term)) return true;
            return n.children.some(checkChildren);
        };
        return node.children.some(checkChildren);
    }, [node.children, searchTerm]);

    if (!matchesSearch && !hasMatchingChildren) return null;

    return (
        <div className="select-none">
            <div
                className={`
                    flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group
                    hover:bg-[var(--theme-surface-hover)] transition-colors duration-150
                    ${node.selected && !node.indeterminate ? 'bg-[var(--theme-primary)]/20' : ''}
                `}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                {/* Expand/Collapse Button */}
                {isFolder ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(node.path); }}
                        className="w-5 h-5 flex items-center justify-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors shrink-0"
                    >
                        <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <GoogleIcon path={UI_ICONS.chevron_right} className="w-4 h-4" />
                        </motion.div>
                    </button>
                ) : (
                    <div className="w-5 h-5 shrink-0" />
                )}

                {/* Checkbox */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggle(node.path); }}
                    className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                        transition-all duration-150
                        ${node.selected && !node.indeterminate
                            ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)]' 
                            : node.indeterminate 
                                ? 'bg-[var(--theme-surface-hover)] border-[var(--theme-primary)]'
                                : 'border-[var(--theme-text-tertiary)] hover:border-[var(--theme-primary)]'
                        }
                    `}
                >
                    {node.selected && !node.indeterminate && (
                        <GoogleIcon path={UI_ICONS.check} className="w-3.5 h-3.5 text-[var(--theme-surface)]" />
                    )}
                    {node.indeterminate && (
                        <div className="w-2.5 h-0.5 bg-[var(--theme-primary)] rounded" />
                    )}
                </button>

                {/* Icon */}
                <div className="shrink-0">
                    {isFolder ? (
                        <GoogleIcon 
                            path={isExpanded ? ICONS_PATHS.folder_open : ICONS_PATHS.folder} 
                            className="w-5 h-5 text-[var(--theme-primary)]" 
                        />
                    ) : (
                        <GoogleIcon 
                            path={iconInfo?.path || ICONS_PATHS.default_file} 
                            className="w-5 h-5"
                            style={{ color: iconInfo?.color || 'var(--theme-text-secondary)' }}
                        />
                    )}
                </div>

                {/* Name */}
                <span 
                    className="text-sm text-[var(--theme-text-primary)] truncate flex-1"
                    onClick={() => isFolder ? toggleExpand(node.path) : onToggle(node.path)}
                >
                    {highlightMatch(node.name)}
                </span>

                {/* File count for folders */}
                {isFolder && (
                    <span className="text-xs text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                        {node.children.filter(c => c.type === 'file').length} files
                    </span>
                )}

                {/* File size */}
                {!isFolder && node.size !== undefined && (
                    <span className="text-xs text-[var(--theme-text-tertiary)]">
                        {node.size > 1024 ? `${(node.size / 1024).toFixed(1)}KB` : `${node.size}B`}
                    </span>
                )}
            </div>

            {/* Children */}
            <AnimatePresence initial={false}>
                {isFolder && isExpanded && hasChildren && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {node.children.map(child => (
                            <TreeItemComponent
                                key={child.id}
                                node={child}
                                level={level + 1}
                                onToggle={onToggle}
                                expandedFolders={expandedFolders}
                                toggleExpand={toggleExpand}
                                searchTerm={searchTerm}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
TreeItemComponent.displayName = 'TreeItemComponent';

export const GitFileSelector = ({ isOpen, onClose, onImport }: GitFileSelectorProps) => {
    const [step, setStep] = useState<'url' | 'select'>('url');
    const [gitUrl, setGitUrl] = useState('');
    const [tree, setTree] = useState<GitTreeNode[]>([]);
    const [metadata, setMetadata] = useState<GitRepoMetadata | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('url');
            setTree([]);
            setMetadata(null);
            setError('');
            setSearchTerm('');
            setExpandedFolders(new Set());
            setImportProgress(null);
        }
    }, [isOpen]);

    // Stats
    const selectedCount = useMemo(() => countSelectedFiles(tree), [tree]);
    const totalFiles = useMemo(() => {
        let count = 0;
        const countFiles = (nodes: GitTreeNode[]) => {
            nodes.forEach(n => {
                if (n.type === 'file') count++;
                countFiles(n.children);
            });
        };
        countFiles(tree);
        return count;
    }, [tree]);

    // Toggle selection
    const toggleSelection = useCallback((path: string) => {
        setTree(prevTree => {
            const updateNode = (nodes: GitTreeNode[]): GitTreeNode[] => {
                return nodes.map(node => {
                    if (node.path === path) {
                        const newSelected = !node.selected;
                        // If folder, select/deselect all children
                        if (node.type === 'folder') {
                            const updateChildren = (children: GitTreeNode[]): GitTreeNode[] => {
                                return children.map(child => ({
                                    ...child,
                                    selected: newSelected,
                                    indeterminate: false,
                                    children: updateChildren(child.children)
                                }));
                            };
                            return {
                                ...node,
                                selected: newSelected,
                                indeterminate: false,
                                children: updateChildren(node.children)
                            };
                        }
                        return { ...node, selected: newSelected, indeterminate: false };
                    }
                    
                    const newChildren = updateNode(node.children);
                    if (node.type === 'folder' && newChildren !== node.children) {
                        // Update parent's selection state based on children
                        const allSelected = newChildren.every(c => c.selected && !c.indeterminate);
                        const someSelected = newChildren.some(c => c.selected || c.indeterminate);
                        return {
                            ...node,
                            children: newChildren,
                            selected: allSelected,
                            indeterminate: someSelected && !allSelected
                        };
                    }
                    return { ...node, children: newChildren };
                });
            };
            return updateNode(prevTree);
        });
    }, []);

    // Toggle expand
    const toggleExpand = useCallback((path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    // Select all / Deselect all
    const selectAll = useCallback((selected: boolean) => {
        setTree(prevTree => {
            const updateAll = (nodes: GitTreeNode[]): GitTreeNode[] => {
                return nodes.map(node => ({
                    ...node,
                    selected,
                    indeterminate: false,
                    children: updateAll(node.children)
                }));
            };
            return updateAll(prevTree);
        });
    }, []);

    // Expand all folders
    const expandAll = useCallback(() => {
        const allPaths = new Set<string>();
        const collectPaths = (nodes: GitTreeNode[]) => {
            nodes.forEach(n => {
                if (n.type === 'folder') {
                    allPaths.add(n.path);
                    collectPaths(n.children);
                }
            });
        };
        collectPaths(tree);
        setExpandedFolders(allPaths);
    }, [tree]);

    // Collapse all
    const collapseAll = useCallback(() => {
        setExpandedFolders(new Set());
    }, []);

    // Fetch tree
    const handleFetchTree = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gitUrl) return;

        setLoading(true);
        setError('');

        try {
            const result = await fetchGitTree(gitUrl, setLoadingText);
            setTree(result.tree);
            setMetadata(result.metadata);
            setStep('select');
            
            // Expand first level by default
            const firstLevelFolders = result.tree.filter(n => n.type === 'folder').map(n => n.path);
            setExpandedFolders(new Set(firstLevelFolders));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch repository');
        } finally {
            setLoading(false);
            setLoadingText('');
        }
    };

    // Import selected files
    const handleImport = async () => {
        if (!metadata || selectedCount === 0) return;

        setLoading(true);
        setError('');
        setImportProgress({ current: 0, total: selectedCount });

        try {
            const files = await fetchSelectedFiles(tree, metadata, setLoadingText, (current, total) => {
                setImportProgress({ current, total });
            });
            onImport(files);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import files');
        } finally {
            setLoading(false);
            setLoadingText('');
            setImportProgress(null);
        }
    };

    // Quick actions
    const selectCommonPatterns = useCallback((pattern: 'code' | 'config' | 'docs') => {
        const patterns: Record<string, RegExp> = {
            code: /\.(js|jsx|ts|tsx|py|java|go|rs|rb|php|swift|kt|c|cpp|cs|vue|svelte|html|htm|css|scss|sass|less)$/i,
            config: /\.(json|yaml|yml|toml|env|ini|config|rc)$|(package\.json|tsconfig|\.eslintrc)/i,
            docs: /\.(md|txt|rst|adoc)$/i
        };
        const regex = patterns[pattern];

        setTree(prevTree => {
            const updateNodes = (nodes: GitTreeNode[]): GitTreeNode[] => {
                return nodes.map(node => {
                    if (node.type === 'file') {
                        const matches = regex.test(node.name);
                        return { ...node, selected: matches, indeterminate: false };
                    }
                    const newChildren = updateNodes(node.children);
                    const allSelected = newChildren.every(c => c.selected && !c.indeterminate);
                    const someSelected = newChildren.some(c => c.selected || c.indeterminate);
                    return {
                        ...node,
                        children: newChildren,
                        selected: allSelected,
                        indeterminate: someSelected && !allSelected
                    };
                });
            };
            return updateNodes(prevTree);
        });
    }, []);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--theme-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !loading && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[var(--theme-surface)] rounded-[28px] w-full max-w-3xl shadow-2xl border border-[var(--theme-border)] overflow-hidden flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-4 p-6 border-b border-[var(--theme-border)]">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--theme-surface-elevated)] flex items-center justify-center shrink-0">
                        <GoogleIcon path={UI_ICONS.github} className="w-7 h-7 text-[var(--theme-text-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl text-[var(--theme-text-primary)] font-medium">Import from GitHub</h3>
                        <p className="text-sm text-[var(--theme-text-tertiary)] truncate">
                            {step === 'url' ? 'Enter repository URL' : `${metadata?.owner}/${metadata?.repo}`}
                        </p>
                    </div>
                    {step === 'select' && (
                        <button
                            onClick={() => { setStep('url'); setTree([]); setMetadata(null); }}
                            className="text-sm text-[var(--theme-primary)] hover:underline"
                        >
                            Change repo
                        </button>
                    )}
                    <GoogleButton variant="icon" icon={UI_ICONS.close} onClick={onClose} disabled={loading} />
                </div>

                {/* URL Input Step */}
                {step === 'url' && (
                    <form onSubmit={handleFetchTree} className="p-6">
                        <div className="relative mb-4">
                            <label className="text-xs text-[var(--theme-primary)] ml-4 mb-1 block font-medium">Repository URL</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={gitUrl}
                                    onChange={(e) => setGitUrl(e.target.value)}
                                    placeholder="https://github.com/username/repo"
                                    className="w-full bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] rounded-xl pl-12 pr-4 py-3.5 text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-all"
                                    disabled={loading}
                                    autoFocus
                                />
                                <div className="absolute left-4 top-3.5 text-[var(--theme-text-secondary)]">
                                    <GoogleIcon path={UI_ICONS.search} className="w-5 h-5" />
                                </div>
                                {loading && (
                                    <div className="absolute right-4 top-3.5">
                                        <div className="w-5 h-5 border-2 border-[var(--theme-border)] border-t-[var(--theme-primary)] rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading && loadingText && (
                            <div className="bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 rounded-xl p-4 mb-4 flex items-center gap-3">
                                <div className="w-2 h-2 bg-[var(--theme-primary)] rounded-full animate-ping" />
                                <p className="text-[var(--theme-primary)] text-sm font-mono">{loadingText}</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-[var(--theme-error)]/10 border border-[var(--theme-error)]/30 rounded-xl p-4 mb-4">
                                <p className="text-[var(--theme-error)] text-sm">{error}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <GoogleButton variant="text" onClick={onClose} disabled={loading}>
                                Cancel
                            </GoogleButton>
                            <GoogleButton variant="filled" type="submit" disabled={!gitUrl || loading}>
                                Continue
                            </GoogleButton>
                        </div>
                    </form>
                )}

                {/* File Selection Step */}
                {step === 'select' && (
                    <>
                        {/* Toolbar */}
                        <div className="px-6 py-3 border-b border-[var(--theme-border)] flex flex-wrap items-center gap-3 bg-[var(--theme-bg)]">
                            {/* Search */}
                            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[var(--theme-surface-hover)] rounded-full px-4 py-2 border border-[var(--theme-border)] focus-within:border-[var(--theme-primary)] transition-all">
                                <GoogleIcon path={UI_ICONS.search} className="text-[var(--theme-text-tertiary)] w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[var(--theme-text-primary)] text-sm w-full placeholder-[var(--theme-text-tertiary)]"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
                                        <GoogleIcon path={UI_ICONS.close} className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-1">
                                <GoogleButton variant="text" className="text-xs px-2 py-1" onClick={() => selectAll(true)}>
                                    All
                                </GoogleButton>
                                <GoogleButton variant="text" className="text-xs px-2 py-1" onClick={() => selectAll(false)}>
                                    None
                                </GoogleButton>
                                <div className="w-px h-4 bg-[var(--theme-border)] mx-1" />
                                <GoogleButton variant="text" className="text-xs px-2 py-1" onClick={expandAll}>
                                    Expand
                                </GoogleButton>
                                <GoogleButton variant="text" className="text-xs px-2 py-1" onClick={collapseAll}>
                                    Collapse
                                </GoogleButton>
                            </div>
                        </div>

                        {/* Quick Filters */}
                        <div className="px-6 py-2 border-b border-[var(--theme-border)] flex items-center gap-2 bg-[var(--theme-bg)] overflow-x-auto">
                            <span className="text-xs text-[var(--theme-text-tertiary)] shrink-0">Quick select:</span>
                            <button
                                onClick={() => selectCommonPatterns('code')}
                                className="text-xs bg-[var(--theme-surface-elevated)] hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-primary)] px-3 py-1 rounded-full transition-colors shrink-0"
                            >
                                📄 Source Code
                            </button>
                            <button
                                onClick={() => selectCommonPatterns('config')}
                                className="text-xs bg-[var(--theme-surface-elevated)] hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-primary)] px-3 py-1 rounded-full transition-colors shrink-0"
                            >
                                ⚙️ Config Files
                            </button>
                            <button
                                onClick={() => selectCommonPatterns('docs')}
                                className="text-xs bg-[var(--theme-surface-elevated)] hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-primary)] px-3 py-1 rounded-full transition-colors shrink-0"
                            >
                                📝 Documentation
                            </button>
                        </div>

                        {/* Tree View */}
                        <div className="flex-1 overflow-y-auto p-4 min-h-[300px] max-h-[400px] scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent">
                            {tree.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-tertiary)]">
                                    <GoogleIcon path={ICONS_PATHS.folder_open} className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-sm">No files found</p>
                                </div>
                            ) : (
                                tree.map(node => (
                                    <TreeItemComponent
                                        key={node.id}
                                        node={node}
                                        level={0}
                                        onToggle={toggleSelection}
                                        expandedFolders={expandedFolders}
                                        toggleExpand={toggleExpand}
                                        searchTerm={searchTerm}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg)] flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-[var(--theme-surface-elevated)] rounded-full px-4 py-2">
                                    <GoogleIcon path={ICONS_PATHS.check_circle} className="w-4 h-4 text-[var(--theme-primary)]" />
                                    <span className="text-sm text-[var(--theme-text-primary)]">
                                        <span className="font-medium">{selectedCount}</span>
                                        <span className="text-[var(--theme-text-tertiary)]"> / {totalFiles} files</span>
                                    </span>
                                </div>
                            </div>

                            {/* Progress or Actions */}
                            {importProgress ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-[var(--theme-surface-elevated)] rounded-full overflow-hidden w-32">
                                        <motion.div
                                            className="h-full bg-[var(--theme-primary)]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-[var(--theme-text-tertiary)]">
                                        {importProgress.current}/{importProgress.total}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <GoogleButton variant="text" onClick={onClose} disabled={loading}>
                                        Cancel
                                    </GoogleButton>
                                    <GoogleButton
                                        variant="filled"
                                        onClick={handleImport}
                                        disabled={selectedCount === 0 || loading}
                                    >
                                        Import {selectedCount > 0 ? `${selectedCount} Files` : ''}
                                    </GoogleButton>
                                </div>
                            )}
                        </div>

                        {/* Loading Overlay */}
                        {loading && (
                            <div className="absolute inset-0 bg-[var(--theme-surface)]/80 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-[var(--theme-border)] border-t-[var(--theme-primary)] rounded-full animate-spin" />
                                    <p className="text-[var(--theme-primary)] text-sm font-mono">{loadingText}</p>
                                </div>
                            </div>
                        )}

                        {/* Error Toast */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[var(--theme-error)] text-white px-4 py-2 rounded-full text-sm"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
};
