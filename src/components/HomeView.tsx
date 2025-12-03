// Home View Component - Material You Flat Design
// Professional-grade home screen with modern Google-inspired aesthetics

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { RecentProject } from '@/types/session';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { formatNumber } from '@/lib/format';

// Material You Icons - Clean, minimal paths
const ICONS = {
    upload: "M11 16V7.85l-2.6 2.6L7 9l5-5 5 5-1.4 1.45-2.6-2.6V16h-2Zm-5 4q-.825 0-1.413-.587Q4 18.825 4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413Q18.825 20 18 20H6Z",
    github: "M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.24 0-1.16.46-2.11 1.2-2.85a3.8 3.8 0 010-2.94s.95-.26 3.11 1.1a10.2 10.2 0 015.6 0c2.16-1.37 3.11-1.08 3.11-1.08a3.8 3.8 0 01.02 2.92c.74.74 1.2 1.69 1.2 2.85 0 4.06-2.59 4.96-5.05 5.23a1.75 1.75 0 01.5 1.35v2.23c0 .27.2.65.75.55A11 11 0 0012 1.27",
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    delete: "M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z",
    clock: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
    file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
    token: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    lines: "M3 14h4v-4H3v4zm0 5h4v-4H3v4zM3 9h4V5H3v4zm5 5h13v-4H8v4zm0 5h13v-4H8v4zM8 5v4h13V5H8z",
    search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    clearAll: "M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z",
    folder: "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
    openInNew: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
};

// Language/Extension icons and colors
const LANGUAGE_CONFIG: Record<string, { color: string; name: string }> = {
    ts: { color: '#3178C6', name: 'TypeScript' },
    tsx: { color: '#3178C6', name: 'React TSX' },
    js: { color: '#F7DF1E', name: 'JavaScript' },
    jsx: { color: '#61DAFB', name: 'React JSX' },
    py: { color: '#3776AB', name: 'Python' },
    java: { color: '#ED8B00', name: 'Java' },
    go: { color: '#00ADD8', name: 'Go' },
    rs: { color: '#DEA584', name: 'Rust' },
    vue: { color: '#42B883', name: 'Vue' },
    svelte: { color: '#FF3E00', name: 'Svelte' },
    css: { color: '#1572B6', name: 'CSS' },
    scss: { color: '#CC6699', name: 'SCSS' },
    html: { color: '#E34F26', name: 'HTML' },
    json: { color: '#292929', name: 'JSON' },
    md: { color: '#083FA1', name: 'Markdown' },
    php: { color: '#777BB4', name: 'PHP' },
    rb: { color: '#CC342D', name: 'Ruby' },
    swift: { color: '#FA7343', name: 'Swift' },
    kt: { color: '#7F52FF', name: 'Kotlin' },
    c: { color: '#A8B9CC', name: 'C' },
    cpp: { color: '#00599C', name: 'C++' },
    cs: { color: '#239120', name: 'C#' },
    txt: { color: '#8E918F', name: 'Text' },
};

// Format relative time
const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    return `${months}mo ago`;
};

// Format date for tooltip
const formatFullDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

interface HomeViewProps {
    recentProjects: RecentProject[];
    onOpenRecent: (projectId: string) => void;
    onRemoveRecent: (projectId: string) => void;
    onClearRecentProjects: () => void;
    onCreateSession: () => void;
    onOpenFilePicker: () => void;
    onOpenGitImport: () => void;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'lastOpened' | 'name' | 'fileCount' | 'createdAt';

export const HomeView: React.FC<HomeViewProps> = ({
    recentProjects,
    onOpenRecent,
    onRemoveRecent,
    onClearRecentProjects,
    onCreateSession,
    onOpenFilePicker,
    onOpenGitImport,
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortBy, setSortBy] = useState<SortBy>('lastOpened');
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

    // Filtered and sorted projects
    const filteredProjects = useMemo(() => {
        let result = [...recentProjects];

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.primaryLanguage?.toLowerCase().includes(query)
            );
        }

        // Sort
        switch (sortBy) {
            case 'name':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'fileCount':
                result.sort((a, b) => b.fileCount - a.fileCount);
                break;
            case 'createdAt':
                result.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case 'lastOpened':
            default:
                result.sort((a, b) => b.lastOpened - a.lastOpened);
        }

        return result;
    }, [recentProjects, searchQuery, sortBy]);

    return (
        <div className="h-full bg-[var(--theme-bg)] overflow-auto">
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    {/* App Icon */}
                    <motion.div 
                        className="flex justify-center mb-6"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    >
                        <div className="relative w-20 h-20 rounded-[28px] bg-gradient-to-br from-[var(--theme-primary)] to-[#6366f1] p-[2px] shadow-lg shadow-[var(--theme-primary)]/20">
                            <div className="w-full h-full rounded-[26px] bg-[var(--theme-surface)] flex items-center justify-center overflow-hidden">
                                <Image 
                                    src="/icon.png" 
                                    alt="Contextractor" 
                                    width={52} 
                                    height={52}
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1 
                        className="text-4xl font-light text-[var(--theme-text-primary)] mb-3 tracking-tight"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        Welcome to <span className="font-semibold bg-gradient-to-r from-[var(--theme-primary)] to-[#6366f1] bg-clip-text text-transparent">Contextractor</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p 
                        className="text-[var(--theme-text-tertiary)] text-base max-w-md mx-auto"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        Extract clean context from your code for AI & LLMs
                    </motion.p>
                </motion.div>

                {/* Quick Actions - Material You Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16"
                >
                    <QuickActionCard
                        icon={ICONS.add}
                        title="New Session"
                        description="Start with a blank workspace"
                        onClick={onCreateSession}
                        variant="primary"
                    />
                    <QuickActionCard
                        icon={ICONS.upload}
                        title="Upload Files"
                        description="Drop files, folders, or ZIPs"
                        onClick={onOpenFilePicker}
                        variant="secondary"
                    />
                    <QuickActionCard
                        icon={ICONS.github}
                        title="Import Repository"
                        description="Clone from GitHub or GitLab"
                        onClick={onOpenGitImport}
                        variant="tertiary"
                    />
                </motion.div>

                {/* Recent Projects Section */}
                {recentProjects.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {/* Section Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[var(--theme-surface-hover)] flex items-center justify-center">
                                    <GoogleIcon path={ICONS.clock} className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                                </div>
                                <h2 className="text-lg font-medium text-[var(--theme-text-primary)]">Recent Projects</h2>
                                <span className="text-xs text-[var(--theme-text-muted)] bg-[var(--theme-surface-hover)] px-2.5 py-1 rounded-full font-medium">
                                    {recentProjects.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Search */}
                                <div className="relative hidden sm:block">
                                    <GoogleIcon 
                                        path={ICONS.search} 
                                        className="w-4 h-4 text-[var(--theme-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" 
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] w-44 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30 focus:border-[var(--theme-primary)] transition-all"
                                    />
                                </div>

                                {/* Sort */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                                    className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30 cursor-pointer appearance-none pr-8 hidden sm:block"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23999' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
                                >
                                    <option value="lastOpened">Last Opened</option>
                                    <option value="name">Name</option>
                                    <option value="fileCount">File Count</option>
                                    <option value="createdAt">Created</option>
                                </select>

                                {/* View Toggle */}
                                <div className="flex bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-lg transition-all ${
                                            viewMode === 'grid' 
                                                ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' 
                                                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]'
                                        }`}
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg transition-all ${
                                            viewMode === 'list' 
                                                ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' 
                                                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-hover)]'
                                        }`}
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Clear All */}
                                <button
                                    onClick={onClearRecentProjects}
                                    className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error)]/10 rounded-xl transition-all"
                                    title="Clear all recent"
                                >
                                    <GoogleIcon path={ICONS.clearAll} className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Projects Grid/List */}
                        <AnimatePresence mode="popLayout">
                            {filteredProjects.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <motion.div
                                        layout
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                                    >
                                        {filteredProjects.map((project, index) => (
                                            <RecentProjectCard
                                                key={project.id}
                                                project={project}
                                                index={index}
                                                isHovered={hoveredProjectId === project.id}
                                                onHover={() => setHoveredProjectId(project.id)}
                                                onLeave={() => setHoveredProjectId(null)}
                                                onOpen={() => onOpenRecent(project.id)}
                                                onRemove={() => onRemoveRecent(project.id)}
                                            />
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div layout className="space-y-2">
                                        {filteredProjects.map((project, index) => (
                                            <RecentProjectRow
                                                key={project.id}
                                                project={project}
                                                index={index}
                                                onOpen={() => onOpenRecent(project.id)}
                                                onRemove={() => onRemoveRecent(project.id)}
                                            />
                                        ))}
                                    </motion.div>
                                )
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-16"
                                >
                                    <div className="w-16 h-16 bg-[var(--theme-surface-hover)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <GoogleIcon path={ICONS.search} className="w-8 h-8 text-[var(--theme-text-muted)]" />
                                    </div>
                                    <p className="text-[var(--theme-text-tertiary)]">No projects match your search</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Empty State */}
                {recentProjects.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-center py-20"
                    >
                        <div className="w-24 h-24 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <GoogleIcon path={ICONS.folder} className="w-12 h-12 text-[var(--theme-text-muted)]" />
                        </div>
                        <h3 className="text-xl text-[var(--theme-text-primary)] font-medium mb-2">No recent projects</h3>
                        <p className="text-[var(--theme-text-tertiary)] text-sm max-w-md mx-auto">
                            Your recent projects will appear here. Start by uploading files or importing a repository.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

// Quick Action Card - Material You Style
interface QuickActionCardProps {
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
    variant: 'primary' | 'secondary' | 'tertiary';
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
    icon,
    title,
    description,
    onClick,
    variant,
}) => {
    const variantStyles = {
        primary: {
            bg: 'bg-[var(--theme-primary)]/8',
            border: 'border-[var(--theme-primary)]/20',
            iconBg: 'bg-[var(--theme-primary)]/15',
            iconColor: 'text-[var(--theme-primary)]',
            hoverBorder: 'hover:border-[var(--theme-primary)]/40',
        },
        secondary: {
            bg: 'bg-[#7FCFB6]/8',
            border: 'border-[#7FCFB6]/20',
            iconBg: 'bg-[#7FCFB6]/15',
            iconColor: 'text-[#7FCFB6]',
            hoverBorder: 'hover:border-[#7FCFB6]/40',
        },
        tertiary: {
            bg: 'bg-[#C8ACF6]/8',
            border: 'border-[#C8ACF6]/20',
            iconBg: 'bg-[#C8ACF6]/15',
            iconColor: 'text-[#C8ACF6]',
            hoverBorder: 'hover:border-[#C8ACF6]/40',
        },
    };

    const styles = variantStyles[variant];

    return (
        <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`
                ${styles.bg} ${styles.border} ${styles.hoverBorder}
                border rounded-3xl p-6 text-left group transition-all duration-300 
                hover:shadow-lg hover:shadow-black/5
            `}
        >
            <div className={`w-14 h-14 ${styles.iconBg} rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}>
                <GoogleIcon path={icon} className={`w-7 h-7 ${styles.iconColor}`} />
            </div>
            <h3 className="text-[var(--theme-text-primary)] font-semibold text-base mb-1">{title}</h3>
            <p className="text-[var(--theme-text-tertiary)] text-sm">{description}</p>
        </motion.button>
    );
};

// Recent Project Card (Grid View)
interface RecentProjectCardProps {
    project: RecentProject;
    index: number;
    isHovered: boolean;
    onHover: () => void;
    onLeave: () => void;
    onOpen: () => void;
    onRemove: () => void;
}

const RecentProjectCard: React.FC<RecentProjectCardProps> = ({
    project,
    index,
    isHovered,
    onHover,
    onLeave,
    onOpen,
    onRemove,
}) => {
    const langConfig = LANGUAGE_CONFIG[project.primaryLanguage || 'txt'] || LANGUAGE_CONFIG.txt;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            onClick={onOpen}
            className="group bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl overflow-hidden cursor-pointer hover:border-[var(--theme-primary)]/30 hover:shadow-lg hover:shadow-black/5 transition-all duration-300"
        >
            {/* Header with language color */}
            <div 
                className="h-2"
                style={{ backgroundColor: langConfig.color }}
            />

            {/* Content */}
            <div className="p-5">
                {/* Title Row */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${langConfig.color}20` }}
                        >
                            <GoogleIcon 
                                path={ICONS.code} 
                                className="w-5 h-5"
                                style={{ color: langConfig.color }}
                            />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[var(--theme-text-primary)] font-medium truncate group-hover:text-[var(--theme-primary)] transition-colors">
                                {project.name}
                            </h3>
                            <span 
                                className="text-xs font-medium"
                                style={{ color: langConfig.color }}
                            >
                                {langConfig.name}
                            </span>
                        </div>
                    </div>

                    {/* Remove Button */}
                    <AnimatePresence>
                        {isHovered && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                className="w-8 h-8 bg-[var(--theme-surface-hover)] rounded-lg flex items-center justify-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error)]/10 transition-all shrink-0"
                            >
                                <GoogleIcon path={ICONS.delete} className="w-4 h-4" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-[var(--theme-text-tertiary)] mb-4">
                    <div className="flex items-center gap-1.5">
                        <GoogleIcon path={ICONS.file} className="w-3.5 h-3.5" />
                        <span>{project.fileCount} files</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <GoogleIcon path={ICONS.token} className="w-3.5 h-3.5" />
                        <span>{formatNumber(project.totalTokens)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div 
                    className="flex items-center gap-1.5 text-xs text-[var(--theme-text-muted)]"
                    title={formatFullDate(project.lastOpened)}
                >
                    <GoogleIcon path={ICONS.clock} className="w-3.5 h-3.5" />
                    {formatRelativeTime(project.lastOpened)}
                </div>
            </div>
        </motion.div>
    );
};

// Recent Project Row (List View)
interface RecentProjectRowProps {
    project: RecentProject;
    index: number;
    onOpen: () => void;
    onRemove: () => void;
}

const RecentProjectRow: React.FC<RecentProjectRowProps> = ({
    project,
    index,
    onOpen,
    onRemove,
}) => {
    const langConfig = LANGUAGE_CONFIG[project.primaryLanguage || 'txt'] || LANGUAGE_CONFIG.txt;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.03 }}
            onClick={onOpen}
            className="group flex items-center gap-4 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-4 cursor-pointer hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-surface-hover)] transition-all duration-200"
        >
            {/* Icon */}
            <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${langConfig.color}20` }}
            >
                <GoogleIcon 
                    path={ICONS.code} 
                    className="w-5 h-5"
                    style={{ color: langConfig.color }}
                />
            </div>

            {/* Name & Language */}
            <div className="flex-1 min-w-0">
                <h3 className="text-[var(--theme-text-primary)] font-medium truncate group-hover:text-[var(--theme-primary)] transition-colors">
                    {project.name}
                </h3>
                <p className="text-xs" style={{ color: langConfig.color }}>{langConfig.name}</p>
            </div>

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-6 text-xs text-[var(--theme-text-tertiary)]">
                <div className="flex items-center gap-1.5 min-w-[70px]">
                    <GoogleIcon path={ICONS.file} className="w-3.5 h-3.5" />
                    <span>{project.fileCount} files</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-[80px]">
                    <GoogleIcon path={ICONS.token} className="w-3.5 h-3.5" />
                    <span>{formatNumber(project.totalTokens)} tokens</span>
                </div>
            </div>

            {/* Time */}
            <div 
                className="text-xs text-[var(--theme-text-muted)] min-w-[70px] text-right"
                title={formatFullDate(project.lastOpened)}
            >
                {formatRelativeTime(project.lastOpened)}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpen();
                    }}
                    className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 rounded-lg transition-all"
                    title="Open"
                >
                    <GoogleIcon path={ICONS.openInNew} className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error)]/10 rounded-lg transition-all"
                    title="Remove from recent"
                >
                    <GoogleIcon path={ICONS.delete} className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};

export default HomeView;
