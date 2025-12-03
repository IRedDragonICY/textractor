'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleButton } from './ui/GoogleButton';
import { GoogleIcon } from './ui/GoogleIcon';
import { UI_ICONS_MAP } from '@/lib/icon-mapping';
import { GitTreeNode, GitRepoMetadata, FileData } from '@/types';
import { getFileIconInfo } from '@/lib/icons';
import { fetchGitTree, countSelectedFiles, fetchGitRefs, fetchGitCommits } from '@/lib/git-service';
import { gitImportManager } from '@/lib/git-import-worker';

import { AppSettings } from '@/types/settings';

interface GitFileSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (files: FileData[]) => void;
    onStartImport: (taskId: string, repoName: string) => void;
    onOpenSettings: () => void;
    settings: AppSettings;
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
                            <GoogleIcon icon={UI_ICONS_MAP.chevron_right} className="w-4 h-4" />
                        </motion.div>
                    </button>
                ) : (
                    <div className="w-5 h-5 shrink-0" />
                )}

                {/* Checkbox */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggle(node.path); }}
                    className={`
                        w-[18px] h-[18px] rounded-[2px] border-2 flex items-center justify-center shrink-0
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
                        <GoogleIcon icon={UI_ICONS_MAP.check} className="w-3.5 h-3.5 text-[var(--theme-surface)]" />
                    )}
                    {node.indeterminate && (
                        <div className="w-2.5 h-0.5 bg-[var(--theme-primary)] rounded" />
                    )}
                </button>

                {/* Icon */}
                <div className="shrink-0">
                    {isFolder ? (
                        <GoogleIcon 
                            icon={isExpanded ? UI_ICONS_MAP.folder_open : UI_ICONS_MAP.folder} 
                            className="w-5 h-5 text-[var(--theme-primary)]" 
                        />
                    ) : (
                        <GoogleIcon 
                            icon={iconInfo?.icon || UI_ICONS_MAP.default_file} 
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



export const GitFileSelector = ({ isOpen, onClose, onImport, onStartImport, onOpenSettings, settings }: GitFileSelectorProps) => {
    const [step, setStep] = useState<'url' | 'select'>('url');
    const [gitUrl, setGitUrl] = useState('');
    const [fullTree, setFullTree] = useState<GitTreeNode[]>([]);
    const [tree, setTree] = useState<GitTreeNode[]>([]);
    const [metadata, setMetadata] = useState<GitRepoMetadata | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [branches, setBranches] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [currentRef, setCurrentRef] = useState('');
    const [commits, setCommits] = useState<{ sha: string, message: string, date: string, author: string }[]>([]);
    const [selectedCommit, setSelectedCommit] = useState<string>('');
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [isCommitDropdownOpen, setIsCommitDropdownOpen] = useState(false);
    const [branchSearchTerm, setBranchSearchTerm] = useState('');
    const branchDropdownRef = useRef<HTMLDivElement>(null);
    const commitDropdownRef = useRef<HTMLDivElement>(null);
    
    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('url');
            setFullTree([]);
            setTree([]);
            setMetadata(null);
            setError('');
            setSearchTerm('');
            setExpandedFolders(new Set());
            setBranches([]);
            setTags([]);
            setCurrentRef('');
            setCommits([]);
            setSelectedCommit('');
            setIsBranchDropdownOpen(false);
            setIsCommitDropdownOpen(false);
            setBranchSearchTerm('');
        }
    }, [isOpen]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
                setIsBranchDropdownOpen(false);
            }
            if (commitDropdownRef.current && !commitDropdownRef.current.contains(event.target as Node)) {
                setIsCommitDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter tree based on settings
    useEffect(() => {
        if (fullTree.length === 0) return;

        const filterNodes = (nodes: GitTreeNode[]): GitTreeNode[] => {
            return nodes.filter(node => {
                if (node.type === 'folder') {
                    if (settings.filters.ignoredFolders.includes(node.name)) return false;
                    const filteredChildren = filterNodes(node.children);
                    // If all children are filtered out and it's a folder, should we keep it?
                    // Maybe keep it if it's not explicitly ignored, but it will be empty.
                    // Let's keep it but update children.
                    node.children = filteredChildren;
                    return true;
                } else {
                    const parts = node.name.split('.');
                    if (parts.length > 1) {
                        const ext = parts.pop()?.toLowerCase() || '';
                        // Check against "lock" and ".lock"
                        if (settings.filters.ignoredExtensions.includes(ext)) return false;
                        if (settings.filters.ignoredExtensions.includes('.' + ext)) return false;
                    }
                    return true;
                }
            });
        };

        // Deep copy to avoid mutating fullTree directly in a way that affects future filters
        const treeCopy = JSON.parse(JSON.stringify(fullTree));
        setTree(filterNodes(treeCopy));
    }, [fullTree, settings.filters]);

    // Filtered lists
    const filteredBranches = useMemo(() => 
        branches.filter(b => b.toLowerCase().includes(branchSearchTerm.toLowerCase())),
        [branches, branchSearchTerm]
    );
    const filteredTags = useMemo(() => 
        tags.filter(t => t.toLowerCase().includes(branchSearchTerm.toLowerCase())),
        [tags, branchSearchTerm]
    );

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
            setFullTree(result.tree);
            // setTree will be handled by useEffect
            setMetadata(result.metadata);
            setCurrentRef(result.metadata.branch);
            setStep('select');
            
            // Fetch refs
            fetchGitRefs(result.metadata.owner, result.metadata.repo).then(refs => {
                setBranches(refs.branches);
                setTags(refs.tags);
            });

            // Fetch commits for default branch
            fetchGitCommits(result.metadata.owner, result.metadata.repo, result.metadata.branch).then(setCommits);
            
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

    // Handle ref (branch/tag) change
    const handleRefChange = async (newRef: string) => {
        if (!metadata || newRef === currentRef) return;
        
        setLoading(true);
        setError('');
        
        try {
            const result = await fetchGitTree(gitUrl, setLoadingText, newRef);
            setFullTree(result.tree);
            setMetadata(result.metadata);
            setCurrentRef(newRef);
            setSelectedCommit(''); // Reset selected commit when branch changes
            
            // Fetch commits for new ref
            fetchGitCommits(metadata.owner, metadata.repo, newRef).then(setCommits);
            
            // Expand first level
            const firstLevelFolders = result.tree.filter(n => n.type === 'folder').map(n => n.path);
            setExpandedFolders(new Set(firstLevelFolders));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to switch branch');
        } finally {
            setLoading(false);
            setLoadingText('');
        }
    };

    // Handle commit change
    const handleCommitChange = async (sha: string) => {
        if (!metadata || sha === selectedCommit) return;

        setLoading(true);
        setError('');

        try {
            // If sha is empty, revert to currentRef (branch head)
            const targetRef = sha || currentRef;
            const result = await fetchGitTree(gitUrl, setLoadingText, targetRef);
            setFullTree(result.tree);
            // Don't update metadata branch/ref, just the tree content
            setSelectedCommit(sha);

            // Expand first level
            const firstLevelFolders = result.tree.filter(n => n.type === 'folder').map(n => n.path);
            setExpandedFolders(new Set(firstLevelFolders));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to switch commit');
        } finally {
            setLoading(false);
            setLoadingText('');
        }
    };

    // Import selected files - Background processing
    const handleImport = useCallback(async () => {
        if (!metadata || selectedCount === 0) return;

        // Create background import task
        const taskId = gitImportManager.createTask(
            gitUrl,
            tree,
            metadata,
            // Progress callback - handled by global indicator
            () => {},
            // Complete callback
            (files) => {
                onImport(files);
            },
            // Error callback
            (err) => {
                console.error('Import error:', err);
                // We don't set error here because the modal will be closed
            }
        );

        // Notify parent to show global indicator
        onStartImport(taskId, metadata.repo);
        
        // Start the import
        gitImportManager.startTask(taskId);
        
        // Close modal immediately
        onClose();
    }, [metadata, selectedCount, gitUrl, tree, onClose, onImport, onStartImport]);

    // Quick actions
    const selectCommonPatterns = useCallback((pattern: 'code' | 'config' | 'docs') => {
        const patterns: Record<string, RegExp> = {
            code: new RegExp(`\\.(${settings.filters.sourceCodeExtensions.join('|')})$`, 'i'),
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
    }, [settings.filters.sourceCodeExtensions]);

    // Don't render anything if modal is closed
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--theme-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
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
                        <GoogleIcon icon={UI_ICONS_MAP.github} className="w-7 h-7 text-[var(--theme-text-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl text-[var(--theme-text-primary)] font-medium">Import from GitHub</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-[var(--theme-text-tertiary)] truncate">
                                {step === 'url' ? 'Enter repository URL' : `${metadata?.owner}/${metadata?.repo}`}
                            </p>
                            {step === 'select' && (branches.length > 0 || tags.length > 0) && (
                                <div className="flex items-center gap-2">
                                    {/* Branch Selector */}
                                    <div className="relative" ref={branchDropdownRef}>
                                        <button 
                                            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                                            className="flex items-center bg-[var(--theme-surface-hover)] rounded-md px-2 py-1 border border-[var(--theme-border)] hover:border-[var(--theme-primary)] transition-colors"
                                            disabled={loading}
                                            title="Select Branch or Tag"
                                        >
                                            <GoogleIcon icon={UI_ICONS_MAP.git} className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)] mr-2" />
                                            <span className="text-xs text-[var(--theme-text-primary)] font-medium max-w-[120px] truncate mr-2">
                                                {currentRef}
                                            </span>
                                            <GoogleIcon icon={UI_ICONS_MAP.expand_more} className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
                                        </button>

                                        {isBranchDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-[280px] bg-[var(--theme-surface-elevated)] border border-[var(--theme-border)] rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[300px]">
                                                <div className="p-2 border-b border-[var(--theme-border)]">
                                                    <div className="flex items-center bg-[var(--theme-surface)] rounded-lg px-2 py-1.5 border border-[var(--theme-border)] focus-within:border-[var(--theme-primary)]">
                                                        <GoogleIcon icon={UI_ICONS_MAP.search} className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)] mr-2" />
                                                        <input
                                                            type="text"
                                                            value={branchSearchTerm}
                                                            onChange={(e) => setBranchSearchTerm(e.target.value)}
                                                            placeholder="Find branch or tag..."
                                                            className="bg-transparent border-none outline-none text-xs text-[var(--theme-text-primary)] w-full placeholder-[var(--theme-text-tertiary)]"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto flex-1 p-1">
                                                    {/* Branches */}
                                                    {filteredBranches.length > 0 && (
                                                        <div className="mb-2">
                                                            <div className="px-2 py-1 text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider">Branches</div>
                                                            {filteredBranches.map(branch => (
                                                                <button
                                                                    key={branch}
                                                                    onClick={() => {
                                                                        handleRefChange(branch);
                                                                        setIsBranchDropdownOpen(false);
                                                                    }}
                                                                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 ${
                                                                        currentRef === branch 
                                                                            ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' 
                                                                            : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-primary)]'
                                                                    }`}
                                                                >
                                                                    <GoogleIcon icon={UI_ICONS_MAP.git} className="w-3.5 h-3.5 opacity-70" />
                                                                    <span className="truncate">{branch}</span>
                                                                    {currentRef === branch && <GoogleIcon icon={UI_ICONS_MAP.check} className="w-3.5 h-3.5 ml-auto" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Tags */}
                                                    {filteredTags.length > 0 && (
                                                        <div>
                                                            <div className="px-2 py-1 text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider">Tags</div>
                                                            {filteredTags.map(tag => (
                                                                <button
                                                                    key={tag}
                                                                    onClick={() => {
                                                                        handleRefChange(tag);
                                                                        setIsBranchDropdownOpen(false);
                                                                    }}
                                                                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center gap-2 ${
                                                                        currentRef === tag 
                                                                            ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' 
                                                                            : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-hover)] hover:text-[var(--theme-text-primary)]'
                                                                    }`}
                                                                >
                                                                    <GoogleIcon icon={UI_ICONS_MAP.git} className="w-3.5 h-3.5 opacity-70" />
                                                                    <span className="truncate">{tag}</span>
                                                                    {currentRef === tag && <GoogleIcon icon={UI_ICONS_MAP.check} className="w-3.5 h-3.5 ml-auto" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {filteredBranches.length === 0 && filteredTags.length === 0 && (
                                                        <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)]">
                                                            No matches found
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Commit Selector */}
                                    <div className="relative" ref={commitDropdownRef}>
                                        <button 
                                            onClick={() => setIsCommitDropdownOpen(!isCommitDropdownOpen)}
                                            className="flex items-center bg-[var(--theme-surface-hover)] rounded-md px-2 py-1 border border-[var(--theme-border)] hover:border-[var(--theme-primary)] transition-colors"
                                            disabled={loading}
                                            title="Select Commit"
                                        >
                                            <GoogleIcon icon={UI_ICONS_MAP.timer} className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)] mr-2" />
                                            <span className="text-xs text-[var(--theme-text-primary)] font-medium max-w-[120px] truncate mr-2">
                                                {selectedCommit ? selectedCommit.substring(0, 7) : 'Latest'}
                                            </span>
                                            <GoogleIcon icon={UI_ICONS_MAP.expand_more} className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
                                        </button>

                                        {isCommitDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-[320px] bg-[var(--theme-surface-elevated)] border border-[var(--theme-border)] rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]">
                                                <div className="p-2 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
                                                    <p className="text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider px-2">
                                                        Commits for {currentRef}
                                                    </p>
                                                </div>
                                                <div className="overflow-y-auto flex-1 p-1">
                                                    <button
                                                        onClick={() => {
                                                            handleCommitChange('');
                                                            setIsCommitDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-md text-xs flex flex-col gap-0.5 ${
                                                            !selectedCommit 
                                                                ? 'bg-[var(--theme-primary)]/10' 
                                                                : 'hover:bg-[var(--theme-surface-hover)]'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className={`font-medium ${!selectedCommit ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                                                                Latest (HEAD)
                                                            </span>
                                                            {!selectedCommit && <GoogleIcon icon={UI_ICONS_MAP.check} className="w-3.5 h-3.5 text-[var(--theme-primary)]" />}
                                                        </div>
                                                        <span className="text-[10px] text-[var(--theme-text-tertiary)]">Current branch state</span>
                                                    </button>

                                                    {commits.map(commit => (
                                                        <button
                                                            key={commit.sha}
                                                            onClick={() => {
                                                                handleCommitChange(commit.sha);
                                                                setIsCommitDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-md text-xs flex flex-col gap-0.5 border-t border-[var(--theme-border)]/50 ${
                                                                selectedCommit === commit.sha 
                                                                    ? 'bg-[var(--theme-primary)]/10' 
                                                                    : 'hover:bg-[var(--theme-surface-hover)]'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className={`font-medium truncate ${selectedCommit === commit.sha ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                                                                    {commit.message}
                                                                </span>
                                                                {selectedCommit === commit.sha && <GoogleIcon icon={UI_ICONS_MAP.check} className="w-3.5 h-3.5 text-[var(--theme-primary)] shrink-0" />}
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] text-[var(--theme-text-tertiary)]">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono bg-[var(--theme-surface-hover)] px-1 rounded">{commit.sha.substring(0, 7)}</span>
                                                                    <span>{commit.author}</span>
                                                                </div>
                                                                <span>{new Date(commit.date).toLocaleDateString()}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {step === 'select' && (
                        <button
                            onClick={() => { setStep('url'); setTree([]); setMetadata(null); }}
                            className="text-sm text-[var(--theme-primary)] hover:underline"
                        >
                            Change repo
                        </button>
                    )}
                    <GoogleButton variant="icon" icon={UI_ICONS_MAP.close} onClick={onClose} />
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
                                    <GoogleIcon icon={UI_ICONS_MAP.search} className="w-5 h-5" />
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
                            <GoogleButton variant="text" onClick={onClose}>
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
                                <GoogleIcon icon={UI_ICONS_MAP.search} className="text-[var(--theme-text-tertiary)] w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[var(--theme-text-primary)] text-sm w-full placeholder-[var(--theme-text-tertiary)]"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
                                        <GoogleIcon icon={UI_ICONS_MAP.close} className="w-4 h-4" />
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
                            <span className="text-xs text-[var(--theme-text-tertiary)] shrink-0 font-medium">Quick select:</span>
                            <button
                                onClick={() => selectCommonPatterns('code')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)] transition-all text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shrink-0"
                            >
                                <GoogleIcon icon={UI_ICONS_MAP.code} className="w-4 h-4" />
                                Source Code
                            </button>
                            <button
                                onClick={() => selectCommonPatterns('config')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)] transition-all text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shrink-0"
                            >
                                <GoogleIcon icon={UI_ICONS_MAP.settings} className="w-4 h-4" />
                                Config Files
                            </button>
                            <button
                                onClick={() => selectCommonPatterns('docs')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)] transition-all text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shrink-0"
                            >
                                <GoogleIcon icon={UI_ICONS_MAP.readme} className="w-4 h-4" />
                                Documentation
                            </button>
                            <div className="w-px h-4 bg-[var(--theme-border)] mx-1 shrink-0" />
                            <button
                                onClick={onOpenSettings}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)] transition-all text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shrink-0"
                            >
                                <GoogleIcon icon={UI_ICONS_MAP.tune} className="w-4 h-4" />
                                Configure Filters
                            </button>
                        </div>

                        {/* Tree View */}
                        <div className="flex-1 overflow-y-auto p-4 min-h-[300px] max-h-[400px] scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent">
                            {tree.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-tertiary)]">
                                    <GoogleIcon icon={UI_ICONS_MAP.folder_open} className="w-16 h-16 mb-4 opacity-20" />
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

                        {/* Footer - Updated for background import */}
                        <div className="px-6 py-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg)]">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-[var(--theme-surface-elevated)] rounded-full px-4 py-2">
                                        <GoogleIcon icon={UI_ICONS_MAP.check_circle} className="w-4 h-4 text-[var(--theme-primary)]" />
                                        <span className="text-sm text-[var(--theme-text-primary)]">
                                            <span className="font-medium">{selectedCount}</span>
                                            <span className="text-[var(--theme-text-tertiary)]"> / {totalFiles} files</span>
                                        </span>
                                    </div>
                                    
                                    {/* Background import hint */}
                                    <span className="text-xs text-[var(--theme-text-tertiary)] hidden sm:flex items-center gap-1.5">
                                        <GoogleIcon icon={UI_ICONS_MAP.network} className="w-3.5 h-3.5" />
                                        Import runs in background
                                    </span>
                                </div>

                                <div className="flex gap-3">
                                    <GoogleButton variant="text" onClick={onClose}>
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
                            </div>
                        </div>

                        {/* Loading Overlay - Non-blocking, only covers the tree area */}
                        {loading && (
                            <div className="absolute inset-0 top-[120px] bg-[var(--theme-surface)]/90 flex items-center justify-center pointer-events-none">
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
