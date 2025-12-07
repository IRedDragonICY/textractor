// Changelog View Component - Material You Design
// Dynamic changelog display fetched from GitHub commits

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleIcon } from '@/components/ui/GoogleIcon';

// GitHub repository info
const GITHUB_OWNER = 'IRedDragonICY';
const GITHUB_REPO = 'contextractor';

// Icons
const ICONS = {
    rocket: "M12 2.5c-2 0-3.9.7-5.4 2.1L5 3v4h4L7.5 5.5C8.7 4.6 10.3 4 12 4c3.6 0 6.6 2.6 7.3 6h2c-.8-4.5-4.7-8-9.3-8zm-7.3 11c.8 4.5 4.7 8 9.3 8 2 0 3.9-.7 5.4-2.1L21 21v-4h-4l1.5 1.5c-1.2.9-2.8 1.5-4.5 1.5-3.6 0-6.6-2.6-7.3-6h-2z",
    star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
    bug: "M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z",
    tool: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
    security: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
    performance: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    breaking: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    expand: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
    collapse: "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z",
    github: "M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.24 0-1.16.46-2.11 1.2-2.85a3.8 3.8 0 010-2.94s.95-.26 3.11 1.1a10.2 10.2 0 015.6 0c2.16-1.37 3.11-1.08 3.11-1.08a3.8 3.8 0 01.02 2.92c.74.74 1.2 1.69 1.2 2.85 0 4.06-2.59 4.96-5.05 5.23a1.75 1.75 0 01.5 1.35v2.23c0 .27.2.65.75.55A11 11 0 0012 1.27",
    openInNew: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    tag: "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
    refresh: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
    commit: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z",
    docs: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    style: "M2.53 19.65l1.34.56v-9.03l-2.43 5.86c-.41 1.02.08 2.19 1.09 2.61zm19.5-3.7L17.07 3.98c-.31-.75-1.04-1.21-1.81-1.23-.26 0-.53.04-.79.15L7.1 5.95c-.75.31-1.21 1.03-1.23 1.8-.01.27.04.54.15.8l4.96 11.97c.31.76 1.05 1.22 1.83 1.23.26 0 .52-.05.77-.15l7.36-3.05c1.02-.42 1.51-1.59 1.09-2.6zM7.88 8.75c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2 11c0 1.1.9 2 2 2h1.45l-3.45-8.34v6.34z",
    config: "M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
};

// Change type configuration
interface ChangeType {
    id: string;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
}

const CHANGE_TYPES: Record<string, ChangeType> = {
    feature: { id: 'feature', label: 'New Feature', icon: ICONS.star, color: '#10B981', bgColor: '#10B98120' },
    improvement: { id: 'improvement', label: 'Improvement', icon: ICONS.rocket, color: '#3B82F6', bgColor: '#3B82F620' },
    fix: { id: 'fix', label: 'Bug Fix', icon: ICONS.bug, color: '#EF4444', bgColor: '#EF444420' },
    security: { id: 'security', label: 'Security', icon: ICONS.security, color: '#8B5CF6', bgColor: '#8B5CF620' },
    performance: { id: 'performance', label: 'Performance', icon: ICONS.performance, color: '#F59E0B', bgColor: '#F59E0B20' },
    breaking: { id: 'breaking', label: 'Breaking Change', icon: ICONS.breaking, color: '#DC2626', bgColor: '#DC262620' },
    docs: { id: 'docs', label: 'Documentation', icon: ICONS.docs, color: '#06B6D4', bgColor: '#06B6D420' },
    style: { id: 'style', label: 'Style', icon: ICONS.style, color: '#EC4899', bgColor: '#EC489920' },
    refactor: { id: 'refactor', label: 'Refactor', icon: ICONS.tool, color: '#14B8A6', bgColor: '#14B8A620' },
    config: { id: 'config', label: 'Config', icon: ICONS.config, color: '#A855F7', bgColor: '#A855F720' },
    other: { id: 'other', label: 'Other', icon: ICONS.commit, color: '#6B7280', bgColor: '#6B728020' },
};

// GitHub commit interface
interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    html_url: string;
    author?: {
        login: string;
        avatar_url: string;
    };
}

// Changelog entry interface
interface ChangelogEntry {
    type: keyof typeof CHANGE_TYPES;
    description: string;
    sha?: string;
    url?: string;
    author?: string;
    authorAvatar?: string;
}

interface ChangelogVersion {
    version: string;
    date: string;
    title?: string;
    isLatest?: boolean;
    changes: ChangelogEntry[];
}

// Parse commit message to determine type
const parseCommitType = (message: string): keyof typeof CHANGE_TYPES => {
    const lowerMessage = message.toLowerCase();
    
    // Conventional commits format: type(scope): description or type: description
    const conventionalMatch = message.match(/^(\w+)(?:\(.+\))?:\s*/);
    if (conventionalMatch) {
        const type = conventionalMatch[1].toLowerCase();
        const typeMap: Record<string, keyof typeof CHANGE_TYPES> = {
            'feat': 'feature',
            'feature': 'feature',
            'fix': 'fix',
            'bugfix': 'fix',
            'docs': 'docs',
            'doc': 'docs',
            'style': 'style',
            'refactor': 'refactor',
            'perf': 'performance',
            'performance': 'performance',
            'security': 'security',
            'sec': 'security',
            'breaking': 'breaking',
            'chore': 'other',
            'build': 'config',
            'ci': 'config',
            'config': 'config',
            'improve': 'improvement',
            'enhancement': 'improvement',
            'add': 'feature',
            'update': 'improvement',
        };
        if (typeMap[type]) return typeMap[type];
    }
    
    // Keyword-based detection
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('patch')) return 'fix';
    if (lowerMessage.includes('feat') || lowerMessage.includes('add') || lowerMessage.includes('new')) return 'feature';
    if (lowerMessage.includes('improve') || lowerMessage.includes('enhance') || lowerMessage.includes('update') || lowerMessage.includes('upgrade')) return 'improvement';
    if (lowerMessage.includes('security') || lowerMessage.includes('vulnerability') || lowerMessage.includes('cve')) return 'security';
    if (lowerMessage.includes('perf') || lowerMessage.includes('speed') || lowerMessage.includes('optimize')) return 'performance';
    if (lowerMessage.includes('breaking') || lowerMessage.includes('deprecated')) return 'breaking';
    if (lowerMessage.includes('doc') || lowerMessage.includes('readme')) return 'docs';
    if (lowerMessage.includes('style') || lowerMessage.includes('format') || lowerMessage.includes('css') || lowerMessage.includes('ui')) return 'style';
    if (lowerMessage.includes('refactor') || lowerMessage.includes('restructure') || lowerMessage.includes('reorganize')) return 'refactor';
    if (lowerMessage.includes('config') || lowerMessage.includes('ci') || lowerMessage.includes('build') || lowerMessage.includes('deploy')) return 'config';
    
    return 'other';
};

// Clean commit message (remove conventional commit prefix)
const cleanCommitMessage = (message: string): string => {
    // Get first line only
    const firstLine = message.split('\n')[0].trim();
    // Remove conventional commit prefix
    return firstLine.replace(/^(\w+)(?:\(.+\))?:\s*/, '');
};

// Group commits by date
const groupCommitsByDate = (commits: GitHubCommit[]): ChangelogVersion[] => {
    const grouped: Record<string, ChangelogEntry[]> = {};
    
    commits.forEach((commit) => {
        const date = commit.commit.author.date.split('T')[0];
        if (!grouped[date]) {
            grouped[date] = [];
        }
        
        const message = commit.commit.message;
        const type = parseCommitType(message);
        const description = cleanCommitMessage(message);
        
        // Skip merge commits and empty messages
        if (description.toLowerCase().startsWith('merge') || !description.trim()) {
            return;
        }
        
        grouped[date].push({
            type,
            description,
            sha: commit.sha.substring(0, 7),
            url: commit.html_url,
            author: commit.author?.login || commit.commit.author.name,
            authorAvatar: commit.author?.avatar_url,
        });
    });
    
    // Convert to array and sort by date (newest first)
    const versions: ChangelogVersion[] = Object.entries(grouped)
        .filter(([, changes]) => changes.length > 0)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, changes], index) => ({
            version: date,
            date: date,
            isLatest: index === 0,
            changes,
        }));
    
    return versions;
};

// Format date for display
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Get relative time
const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
};

interface ChangelogViewProps {
    onClose?: () => void;
}

export const ChangelogView: React.FC<ChangelogViewProps> = ({ onClose }) => {
    const [changelogData, setChangelogData] = useState<ChangelogVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<string | null>(null);

    // Fetch commits from GitHub
    const fetchCommits = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=100`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                    },
                }
            );
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('GitHub API rate limit exceeded. Please try again later.');
                }
                throw new Error(`Failed to fetch commits: ${response.statusText}`);
            }
            
            const commits: GitHubCommit[] = await response.json();
            const versions = groupCommitsByDate(commits);
            
            setChangelogData(versions);
            
            // Expand latest version by default
            if (versions.length > 0) {
                setExpandedVersions(new Set([versions[0].version]));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch changelog');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCommits();
    }, [fetchCommits]);

    const toggleVersion = (version: string) => {
        setExpandedVersions(prev => {
            const next = new Set(prev);
            if (next.has(version)) {
                next.delete(version);
            } else {
                next.add(version);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedVersions(new Set(changelogData.map(v => v.version)));
    };

    const collapseAll = () => {
        setExpandedVersions(new Set());
    };

    // Get all unique change types from the data
    const availableTypes = useMemo(() => {
        const types = new Set<string>();
        changelogData.forEach(version => {
            version.changes.forEach(change => {
                types.add(change.type);
            });
        });
        return Array.from(types);
    }, [changelogData]);

    // Filter versions based on selected type
    const filteredData = useMemo(() => {
        if (!filterType) return changelogData;
        return changelogData.map(version => ({
            ...version,
            changes: version.changes.filter(change => change.type === filterType),
        })).filter(version => version.changes.length > 0);
    }, [filterType, changelogData]);

    // Count total changes
    const totalChanges = useMemo(() => {
        return changelogData.reduce((acc, version) => acc + version.changes.length, 0);
    }, [changelogData]);

    // Loading state
    if (loading) {
        return (
            <div className="h-full flex flex-col bg-[var(--theme-bg)] text-[var(--theme-text-primary)] font-sans">
                <div className="flex-shrink-0 h-12 px-4 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-secondary)]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                            <GoogleIcon path={ICONS.tag} className="w-4 h-4 text-[var(--theme-primary)]" />
                        </div>
                        <span className="text-sm font-medium text-[var(--theme-text-primary)]">Changelog</span>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
                        >
                            <GoogleIcon path={ICONS.close} className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-12 h-12 mx-auto mb-4"
                        >
                            <GoogleIcon path={ICONS.refresh} className="w-12 h-12 text-[var(--theme-primary)]" />
                        </motion.div>
                        <p className="text-sm text-[var(--theme-text-secondary)]">Loading commits from GitHub...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-full flex flex-col bg-[var(--theme-bg)] text-[var(--theme-text-primary)] font-sans">
                <div className="flex-shrink-0 h-12 px-4 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-secondary)]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                            <GoogleIcon path={ICONS.tag} className="w-4 h-4 text-[var(--theme-primary)]" />
                        </div>
                        <span className="text-sm font-medium text-[var(--theme-text-primary)]">Changelog</span>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
                        >
                            <GoogleIcon path={ICONS.close} className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md px-4">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <GoogleIcon path={ICONS.breaking} className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-sm text-[var(--theme-text-secondary)] mb-4">{error}</p>
                        <button
                            onClick={fetchCommits}
                            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
                        >
                            <GoogleIcon path={ICONS.refresh} className="w-4 h-4" />
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[var(--theme-bg)] text-[var(--theme-text-primary)] font-sans">
            {/* Header */}
            <div className="flex-shrink-0 h-12 px-4 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-secondary)]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                        <GoogleIcon path={ICONS.tag} className="w-4 h-4 text-[var(--theme-primary)]" />
                    </div>
                    <div>
                        <span className="text-sm font-medium text-[var(--theme-text-primary)]">Changelog</span>
                        <span className="text-xs text-[var(--theme-text-tertiary)] ml-2">
                            {changelogData.length} days • {totalChanges} commits
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchCommits}
                        className="p-1.5 rounded hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)] transition-colors"
                        title="Refresh"
                    >
                        <GoogleIcon path={ICONS.refresh} className="w-4 h-4" />
                    </button>
                    <button
                        onClick={expandAll}
                        className="px-2 py-1 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-surface-hover)] rounded transition-colors"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={collapseAll}
                        className="px-2 py-1 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-surface-hover)] rounded transition-colors"
                    >
                        Collapse All
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
                        >
                            <GoogleIcon path={ICONS.close} className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[var(--theme-text-tertiary)] uppercase tracking-wide mr-2">Filter:</span>
                    <button
                        onClick={() => setFilterType(null)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                            filterType === null
                                ? 'bg-[var(--theme-primary)] text-white'
                                : 'bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-surface-elevated)]'
                        }`}
                    >
                        All
                    </button>
                    {availableTypes.map(type => {
                        const typeConfig = CHANGE_TYPES[type];
                        if (!typeConfig) return null;
                        return (
                            <button
                                key={type}
                                onClick={() => setFilterType(filterType === type ? null : type)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    filterType === type
                                        ? 'text-white'
                                        : 'text-[var(--theme-text-secondary)] hover:opacity-80'
                                }`}
                                style={{
                                    backgroundColor: filterType === type ? typeConfig.color : typeConfig.bgColor,
                                    color: filterType === type ? 'white' : typeConfig.color,
                                }}
                            >
                                <GoogleIcon path={typeConfig.icon} className="w-3 h-3" />
                                {typeConfig.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Changelog Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="max-w-4xl mx-auto p-6 space-y-4">
                    {filteredData.map((version, index) => (
                        <motion.div
                            key={version.version}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl overflow-hidden"
                        >
                            {/* Version Header */}
                            <button
                                onClick={() => toggleVersion(version.version)}
                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--theme-surface-hover)] transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-semibold text-[var(--theme-text-primary)]">
                                            {formatDate(version.date)}
                                        </span>
                                        {version.isLatest && (
                                            <span className="px-2 py-0.5 bg-[var(--theme-primary)] text-white text-[10px] font-medium uppercase tracking-wide rounded-full">
                                                Latest
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-[var(--theme-text-tertiary)]">
                                            {getRelativeTime(version.date)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[var(--theme-text-tertiary)]">
                                        <span className="text-xs bg-[var(--theme-surface-hover)] px-2 py-0.5 rounded-full">
                                            {version.changes.length} commits
                                        </span>
                                        <GoogleIcon
                                            path={expandedVersions.has(version.version) ? ICONS.collapse : ICONS.expand}
                                            className="w-5 h-5"
                                        />
                                    </div>
                                </div>
                            </button>

                            {/* Changes List */}
                            <AnimatePresence>
                                {expandedVersions.has(version.version) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-5 pt-2 border-t border-[var(--theme-border)] space-y-2">
                                            {version.changes.map((change, changeIndex) => {
                                                const typeConfig = CHANGE_TYPES[change.type] || CHANGE_TYPES.other;
                                                return (
                                                    <motion.div
                                                        key={change.sha || changeIndex}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: changeIndex * 0.03 }}
                                                        className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-[var(--theme-surface-hover)] transition-colors group"
                                                    >
                                                        <div
                                                            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                                                            style={{ backgroundColor: typeConfig.bgColor }}
                                                        >
                                                            <GoogleIcon
                                                                path={typeConfig.icon}
                                                                className="w-3.5 h-3.5"
                                                                style={{ color: typeConfig.color }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-[var(--theme-text-primary)] leading-relaxed">
                                                                {change.description}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {change.sha && (
                                                                    <a
                                                                        href={change.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-[10px] font-mono text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] transition-colors"
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        {change.sha}
                                                                    </a>
                                                                )}
                                                                {change.author && (
                                                                    <span className="text-[10px] text-[var(--theme-text-muted)] flex items-center gap-1">
                                                                        {change.authorAvatar && (
                                                                            <Image
                                                                                src={change.authorAvatar}
                                                                                alt={change.author || 'Author avatar'}
                                                                                width={12}
                                                                                height={12}
                                                                                sizes="12px"
                                                                                className="w-3 h-3 rounded-full"
                                                                            />
                                                                        )}
                                                                        {change.author}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className="text-[10px] font-medium px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                            style={{
                                                                backgroundColor: typeConfig.bgColor,
                                                                color: typeConfig.color,
                                                            }}
                                                        >
                                                            {typeConfig.label}
                                                        </span>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}

                    {filteredData.length === 0 && !loading && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-[var(--theme-surface-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <GoogleIcon path={ICONS.tag} className="w-8 h-8 text-[var(--theme-text-muted)]" />
                            </div>
                            <p className="text-[var(--theme-text-tertiary)]">
                                {changelogData.length === 0 ? 'No commits found' : 'No changes match the selected filter'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 h-10 px-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg)] flex items-center justify-between">
                <a
                    href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commits`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] flex items-center gap-1.5 transition-colors"
                >
                    <GoogleIcon path={ICONS.github} className="w-3.5 h-3.5" />
                    View all commits on GitHub
                    <GoogleIcon path={ICONS.openInNew} className="w-3 h-3" />
                </a>
                <span className="text-xs text-[var(--theme-text-muted)]">
                    Live from GitHub
                </span>
            </div>
        </div>
    );
};

// Changelog Modal (for popup display from menu)
interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                className="bg-[var(--theme-surface-elevated)] rounded-2xl w-full max-w-3xl h-[80vh] shadow-2xl overflow-hidden border border-[var(--theme-border)]"
                onClick={e => e.stopPropagation()}
            >
                <ChangelogView onClose={onClose} />
            </motion.div>
        </motion.div>
    );
};

export default ChangelogView;
