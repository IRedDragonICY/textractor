'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect, useDeferredValue } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { GoogleButton } from '@/components/ui/GoogleButton';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { FileCard } from '@/components/FileCard';
import { SortableItem } from '@/components/SortableItem';
import { TreeItem } from '@/components/TreeItem';
import { OutputStyleSelector } from '@/components/OutputStyleSelector';
import { StatChip } from '@/components/StatChip';
import { GitFileSelector } from '@/components/GitFileSelector';
import { GlobalImportIndicator } from '@/components/GlobalImportIndicator';
import { TabBar } from '@/components/TabBar';
import { HomeView } from '@/components/HomeView';
import { MenuBar, AboutModal, ShortcutsModal } from '@/components/MenuBar';
import { SettingsView } from '@/components/SettingsView';
import { SecurityWarningModal } from '@/components/SecurityWarningModal';
import { VirtualizedCodeViewer } from '@/components/VirtualizedCodeViewer';
import { WorkspaceSkeleton, LoadingProgress } from '@/components/LoadingSkeleton';
import { VirtualizedFileList } from '@/components/VirtualizedFileList';

// Hooks
import { useSearch } from '@/hooks/useSearch';
import { useSessionManager, fileDataToSessionFile, convertSessionFiles } from '@/hooks/useSessionManager';
import { useHistory } from '@/hooks/useHistory';
import { ThemeProvider, useThemeProvider } from '@/hooks/useTheme';
import { useSettings } from '@/hooks/useSettings';

// Services & Utils
import { formatNumber } from '@/lib/format';
import { processFileObject, unzipAndProcess } from '@/lib/file-processing';
import { buildFileTree } from '@/lib/file-tree';
import { scanForSecrets, SecurityIssue } from '@/lib/security';

// Types & Constants
import { OutputStyle, FileData, ViewMode, TreeNode } from '@/types';
import { UI_ICONS, ICONS_PATHS } from '@/constants';
import { OutputStyleType, ViewModeType } from '@/types/session';

// Main App Wrapper with Theme Provider
export default function ContextractorApp() {
    const themeValue = useThemeProvider();
    
    return (
        <ThemeProvider value={themeValue}>
            <Contextractor />
        </ThemeProvider>
    );
}

function Contextractor() {
    // Session Manager
    const {
        sessions,
        activeSession,
        activeSessionId,
        recentProjects,
        showHomeView,
        isLoading: isLoadingSession,
        loadingProgress,
        createSession,
        closeSession,
        closeOtherSessions,
        closeAllSessions,
        switchSession,
        renameSession,
        togglePinSession,
        duplicateSession,
        updateSessionFiles,
        updateSessionSettings,
        reorderSessions,
        openRecentProject,
        removeRecentProject,
        clearRecentProjects,
        toggleHomeView,
        openSettingsTab,
    } = useSessionManager();

    // Derived state from active session - uses cached batch conversion
    // Cache is maintained per-session in useSessionManager
    const files = useMemo(() => {
        if (!activeSession) return [];
        return convertSessionFiles(activeSession.id, activeSession.files);
    }, [activeSession]);

    const outputStyle = activeSession?.outputStyle || 'standard';
    const viewMode = activeSession?.viewMode || 'tree';

    // Local UI State
    const [isCopied, setIsCopied] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [gitModalOpen, setGitModalOpen] = useState(false);
    const [currentImportTaskId, setCurrentImportTaskId] = useState<string | null>(null);
    const [currentRepoName, setCurrentRepoName] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [aboutModalOpen, setAboutModalOpen] = useState(false);
    const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
    const [securityWarningOpen, setSecurityWarningOpen] = useState(false);
    const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);

    // Settings
    const { 
        settings, 
        updateSecuritySettings, 
        updateFilterSettings, 
        resetSettings 
    } = useSettings();

    // History for undo/redo
    const { canUndo, canRedo, undo, redo, recordState } = useHistory();

    // Refs
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Update session files
    const setFiles = useCallback((updater: FileData[] | ((prev: FileData[]) => FileData[])) => {
        if (!activeSessionId) return;
        
        const newFiles = typeof updater === 'function' 
            ? updater(files)
            : updater;
        
        // Record state for undo/redo
        recordState(newFiles);
        
        updateSessionFiles(activeSessionId, newFiles.map(fileDataToSessionFile));
    }, [activeSessionId, files, updateSessionFiles, recordState]);

    // Undo handler
    const handleUndo = useCallback(() => {
        const previousFiles = undo();
        if (previousFiles !== null && activeSessionId) {
            updateSessionFiles(activeSessionId, previousFiles.map(fileDataToSessionFile));
        }
    }, [undo, activeSessionId, updateSessionFiles]);

    // Redo handler
    const handleRedo = useCallback(() => {
        const nextFiles = redo();
        if (nextFiles !== null && activeSessionId) {
            updateSessionFiles(activeSessionId, nextFiles.map(fileDataToSessionFile));
        }
    }, [redo, activeSessionId, updateSessionFiles]);

    // Update session settings
    const setOutputStyle = useCallback((style: OutputStyle) => {
        if (!activeSessionId) return;
        updateSessionSettings(activeSessionId, { outputStyle: style as OutputStyleType });
    }, [activeSessionId, updateSessionSettings]);

    const setViewMode = useCallback((mode: ViewMode) => {
        if (!activeSessionId) return;
        updateSessionSettings(activeSessionId, { viewMode: mode as ViewModeType });
    }, [activeSessionId, updateSessionSettings]);

    // File processing
    const addFiles = useCallback(async (incomingFiles: File[]) => {
        // Create session if none exists
        if (!activeSessionId) {
            createSession();
        }

        setProcessing(true);
        let newFiles: FileData[] = [];

        for (const file of incomingFiles) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
                const extracted = await unzipAndProcess(file);
                newFiles = [...newFiles, ...extracted];
            } else if (ext !== 'rar') {
                const processed = await processFileObject(file);
                newFiles.push(processed);
            }
        }

        setFiles(prev => [...prev, ...newFiles]);
        setProcessing(false);
        
        const hasFolders = newFiles.some(f => f.path.includes('/'));
        if (hasFolders) setViewMode('tree');
    }, [activeSessionId, createSession, setFiles, setViewMode]);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, [setFiles]);

    const removeNode = useCallback((node: TreeNode) => {
        if (node.type === 'folder') {
            setFiles(prev => prev.filter(f => {
                const isMatch = f.path === node.path || f.path.startsWith(node.path + '/');
                return !isMatch;
            }));
        } else {
            removeFile(node.id);
        }
    }, [removeFile, setFiles]);

    const clearWorkspace = useCallback(() => {
        setFiles([]);
    }, [setFiles]);

    // Derived State (Computed Text) - Using useDeferredValue for non-blocking UI
    const rawCombinedText = useMemo(() => {
        return files.filter(f => f.isText).map(f => {
            const pathLabel = f.path || f.name;
            const ext = f.name.split('.').pop() || 'txt';
            switch (outputStyle) {
                case 'hash': return `# --- ${pathLabel} ---\n${f.content}`;
                case 'minimal': return `--- ${pathLabel} ---\n${f.content}`;
                case 'xml': return `<file name="${pathLabel}">\n${f.content}\n</file>`;
                case 'markdown': return `### ${pathLabel}\n\`\`\`${ext}\n${f.content}\n\`\`\``;
                case 'standard': default: return `/* --- ${pathLabel} --- */\n${f.content}`;
            }
        }).join('\n\n');
    }, [files, outputStyle]);
    
    // Defer the expensive text so it doesn't block UI
    const combinedText = useDeferredValue(rawCombinedText);
    const isTextPending = rawCombinedText !== combinedText;

    // Search Hook
    const { 
        searchTerm, setSearchTerm, searchMatches, currentMatchIdx, 
        handleNextMatch, handlePrevMatch 
    } = useSearch(combinedText, textAreaRef);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // DnD Handlers
    const handleDragStart = useCallback((e: { active: { id: string | number } }) => {
        setActiveId(String(e.active.id));
    }, []);

    const handleDragEnd = useCallback((e: { active: { id: string | number }; over: { id: string | number } | null }) => {
        const { active, over } = e;
        setActiveId(null);
        if (over && active.id !== over.id) {
            setFiles(items => {
                const oldIdx = items.findIndex(i => i.id === active.id);
                const newIdx = items.findIndex(i => i.id === over.id);
                const newItems = [...items];
                const [removed] = newItems.splice(oldIdx, 1);
                newItems.splice(newIdx, 0, removed);
                return newItems;
            });
        }
    }, [setFiles]);

    const activeFile = useMemo(() => files.find(f => f.id === activeId), [activeId, files]);
    const fileTree = useMemo(() => buildFileTree(files), [files]);
    
    const stats = useMemo(() => {
        const target = files.filter(f => f.isText);
        return {
            count: target.length,
            lines: target.reduce((a, b) => a + b.linesOfCode, 0),
            tokens: target.reduce((a, b) => a + b.tokenCount, 0)
        };
    }, [files]);

    // Git Import Handler - Updated for background import
    const handleStartImport = useCallback((taskId: string, repoName: string) => {
        setCurrentImportTaskId(taskId);
        setCurrentRepoName(repoName);
    }, []);

    const handleGitImport = useCallback((newFiles: FileData[]) => {
        // Create session if none exists
        if (!activeSessionId) {
            createSession();
        }
        setFiles(prev => [...prev, ...newFiles]);
        setGitModalOpen(false);
        setViewMode('tree');
        setIsMobileSidebarOpen(false);
    }, [activeSessionId, createSession, setFiles, setViewMode]);

    // Dropzone
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: (droppedFiles) => {
            if (showHomeView) {
                createSession();
                toggleHomeView(false);
            }
            addFiles(droppedFiles).catch(console.error);
            setIsMobileSidebarOpen(false);
        },
        noClick: true,
        noKeyboard: true
    });

    // Paste Handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
            if (e.clipboardData?.files?.length) {
                e.preventDefault();
                if (showHomeView) {
                    createSession();
                    toggleHomeView(false);
                }
                addFiles(Array.from(e.clipboardData.files)).catch(console.error);
            } else {
                const text = e.clipboardData?.getData('text');
                if (text) {
                    if (showHomeView) {
                        createSession();
                        toggleHomeView(false);
                    }
                    const blob = new Blob([text], { type: 'text/plain' });
                    const file = new File([blob], `pasted_text_${Date.now()}.txt`, { type: 'text/plain' });
                    addFiles([file]).catch(console.error);
                }
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [addFiles, showHomeView, createSession, toggleHomeView]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+T: New Tab
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                createSession();
            }
            // Ctrl+W: Close Tab
            if (e.ctrlKey && e.key === 'w' && activeSessionId) {
                e.preventDefault();
                closeSession(activeSessionId);
            }
            // Ctrl+Tab: Next Tab
            if (e.ctrlKey && e.key === 'Tab') {
                e.preventDefault();
                const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
                const nextIndex = (currentIndex + 1) % sessions.length;
                if (sessions[nextIndex]) {
                    switchSession(sessions[nextIndex].id);
                    toggleHomeView(false);
                }
            }
            // Ctrl+Z: Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                const target = e.target as HTMLElement;
                if (!['INPUT', 'TEXTAREA'].includes(target.tagName)) {
                    e.preventDefault();
                    handleUndo();
                }
            }
            // Ctrl+Shift+Z: Redo
            if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
                const target = e.target as HTMLElement;
                if (!['INPUT', 'TEXTAREA'].includes(target.tagName)) {
                    e.preventDefault();
                    handleRedo();
                }
            }
            // Ctrl+/: Show shortcuts
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                setShortcutsModalOpen(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeSessionId, sessions, createSession, closeSession, switchSession, toggleHomeView, handleUndo, handleRedo]);

    // Text Area Utils
    const lineNumbers = useMemo(() => {
        const targetFiles = files.filter(f => f.isText);

        return targetFiles.map(f => {
            const lines = f.linesOfCode;
            const fileLineNums = Array.from({ length: lines }, (_, i) => i + 1).join('\n');

            switch (outputStyle) {
                case 'markdown': return ` \n \n${fileLineNums}\n `;
                case 'xml': return ` \n${fileLineNums}\n `;
                default: return ` \n${fileLineNums}`;
            }
        }).join('\n\n');
    }, [files, outputStyle]);

    const copyToClipboard = () => {
        if (!combinedText) return;

        // Security Check
        if (settings.security.enablePreFlightCheck) {
            const issues = scanForSecrets(files, settings.security);
            if (issues.length > 0) {
                setSecurityIssues(issues);
                setSecurityWarningOpen(true);
                return;
            }
        }

        performCopy();
    };

    const performCopy = () => {
        if (!combinedText) return;
        navigator.clipboard.writeText(combinedText)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
            });
        setSecurityWarningOpen(false);
    };

    // Handler for HomeView actions
    const handleOpenFilePicker = () => {
        open();
    };

    const handleOpenGitImport = () => {
        setGitModalOpen(true);
    };

    const handleCreateSessionFromHome = () => {
        createSession();
        toggleHomeView(false);
    };

    return (
        <div {...getRootProps()} className="h-screen bg-[var(--theme-bg)] text-[var(--theme-text-primary)] font-sans flex flex-col selection:bg-[var(--theme-selection-bg)] selection:text-[var(--theme-selection-text)] outline-none overflow-hidden theme-transition">
            <input {...getInputProps()} />

            {/* Modern Menu Bar - VS Code Style */}
            <div className="flex items-center bg-[var(--theme-surface)] border-b border-[var(--theme-border-subtle)]">
                {/* Mobile Menu Button */}
                <div className="lg:hidden px-2">
                    <GoogleButton
                        variant="icon"
                        onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                        icon={UI_ICONS.menu}
                        className="w-8 h-8"
                    />
                </div>
                
                <div className="flex-1">
                    <MenuBar
                        onNewSession={() => createSession()}
                        onOpenFiles={open}
                        onImportRepo={() => setGitModalOpen(true)}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onCopyOutput={copyToClipboard}
                        onSelectAll={() => textAreaRef.current?.select()}
                        onShowAbout={() => setAboutModalOpen(true)}
                        onShowShortcuts={() => setShortcutsModalOpen(true)}
                        onShowSettings={openSettingsTab}
                        hasContent={!!combinedText}
                    />
                </div>
            </div>

            {/* Tab Bar - VS Code Style */}
            <TabBar
                sessions={sessions}
                activeSessionId={activeSessionId}
                showHomeView={showHomeView}
                onSwitchSession={switchSession}
                onCloseSession={closeSession}
                onCreateSession={createSession}
                onToggleHomeView={toggleHomeView}
                onRenameSession={renameSession}
                onDuplicateSession={duplicateSession}
                onCloseOtherSessions={closeOtherSessions}
                onCloseAllSessions={closeAllSessions}
                onTogglePinSession={togglePinSession}
                onReorderSessions={reorderSessions}
            />

            {/* Loading Progress Indicator */}
            <AnimatePresence>
                {isLoadingSession && loadingProgress < 100 && (
                    <LoadingProgress 
                        progress={loadingProgress} 
                        label="Loading workspace..." 
                    />
                )}
            </AnimatePresence>

            {/* Main Content - Conditionally show HomeView, Loading, or Workspace */}
            <AnimatePresence mode="wait">
                {isLoadingSession ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-hidden"
                    >
                        <WorkspaceSkeleton />
                    </motion.div>
                ) : showHomeView ? (
                    <motion.div
                        key="home"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-hidden"
                    >
                        <HomeView
                            recentProjects={recentProjects}
                            onOpenRecent={openRecentProject}
                            onRemoveRecent={removeRecentProject}
                            onClearRecentProjects={clearRecentProjects}
                            onCreateSession={handleCreateSessionFromHome}
                            onOpenFilePicker={handleOpenFilePicker}
                            onOpenGitImport={handleOpenGitImport}
                        />
                    </motion.div>
                ) : activeSession?.type === 'settings' ? (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-hidden"
                    >
                        <SettingsView
                            settings={settings}
                            onUpdateSecurity={updateSecuritySettings}
                            onUpdateFilters={updateFilterSettings}
                            onReset={resetSettings}
                        />
                    </motion.div>
                ) : (
                    <motion.main
                        key="workspace"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col lg:flex-row lg:gap-6 lg:p-6 overflow-hidden relative z-10 max-w-[1800px] w-full mx-auto"
                    >

                {/* Mobile Sidebar Overlay */}
                <AnimatePresence>
                    {isMobileSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                        />
                    )}
                </AnimatePresence>

                {/* Explorer Section - Responsive Sidebar */}
                <section className={`
                    flex flex-col gap-4 h-full shrink-0
                    fixed inset-y-0 left-0 z-40 w-[320px] bg-[var(--theme-surface)] p-4 border-r border-[var(--theme-border)] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                    lg:relative lg:inset-auto lg:z-auto lg:w-[460px] lg:bg-transparent lg:p-0 lg:border-none lg:shadow-none lg:translate-x-0
                    ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    {/* Mobile Sidebar Header */}
                    <div className="flex items-center justify-between mb-2 lg:hidden">
                        <h2 className="text-lg font-medium text-[var(--theme-text-primary)] flex items-center gap-2">
                            <GoogleIcon path={ICONS_PATHS.folder_open} className="w-5 h-5 text-[var(--theme-primary)]" />
                            Files
                        </h2>
                        <GoogleButton variant="icon" icon={UI_ICONS.close} onClick={() => setIsMobileSidebarOpen(false)} />
                    </div>

                    {/* Mobile-Only Output Style Selector - Added here as requested */}
                    <div className="lg:hidden mb-4">
                        <div className="relative group z-50">
                            <OutputStyleSelector 
                                value={outputStyle} 
                                onChange={setOutputStyle} 
                            />
                        </div>
                    </div>

                    <div className="relative shrink-0">
                        <motion.div
                            onClick={open}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                rounded-3xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 cursor-pointer
                                transition-colors duration-200 flex flex-col items-center text-center gap-3
                                hover:bg-[var(--theme-surface-hover)] hover:border-[var(--theme-text-tertiary)] group relative overflow-hidden
                                ${processing ? 'opacity-50 pointer-events-none' : ''}
                            `}
                        >
                            {processing ? (
                                <div className="w-12 h-12 border-4 border-[var(--theme-surface-elevated)] border-t-[var(--theme-primary)] rounded-full animate-spin mb-1"></div>
                            ) : (
                                <div className="w-12 h-12 bg-[var(--theme-surface-elevated)] rounded-full flex items-center justify-center text-[var(--theme-text-secondary)] group-hover:text-[var(--theme-primary)] transition-colors shadow-md">
                                    <GoogleIcon path={UI_ICONS.upload} className="w-6 h-6" />
                                </div>
                            )}
                            <div>
                                <p className="text-[var(--theme-text-primary)] font-medium text-sm">Click to upload or drop</p>
                                <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">ZIPs, Folders, Code & Clipboard</p>
                            </div>
                        </motion.div>

                        <div className="mt-3">
                            <GoogleButton
                                variant="outlined"
                                icon={UI_ICONS.github}
                                className="w-full justify-center border-[var(--theme-border)] bg-[var(--theme-surface)]"
                                onClick={(e) => { if(e) e.stopPropagation(); setGitModalOpen(true); }}
                            >
                                Import Repository
                            </GoogleButton>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent">
                            <StatChip label="Files" value={stats.count} />
                            <StatChip label="Tokens" value={formatNumber(stats.tokens)} />
                            <StatChip label="Lines" value={formatNumber(stats.lines)} />
                        </div>
                    )}

                    <div className="flex-1 flex flex-col min-h-0 bg-[var(--theme-surface)] rounded-3xl border border-[var(--theme-border)] overflow-hidden shadow-lg">
                        <div className="px-4 py-3 border-b border-[var(--theme-border)] bg-[var(--theme-surface)] sticky top-0 z-10 shrink-0 flex items-center justify-between">
                            <h3 className="text-[var(--theme-text-secondary)] font-medium text-sm uppercase tracking-wide pl-2">Explorer</h3>

                            <div className="flex items-center gap-2">
                                {/* Reset Button */}
                                {files.length > 0 && (
                                    <GoogleButton
                                        variant="icon"
                                        onClick={() => setDeleteConfirmOpen(true)}
                                        icon={UI_ICONS.delete}
                                        className="w-8 h-8 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)]"
                                    />
                                )}

                                {/* View Toggle */}
                                <div className="flex bg-[var(--theme-surface-elevated)] rounded-full p-1">
                                    <GoogleButton
                                        variant="icon"
                                        icon={UI_ICONS.view_tree}
                                        active={viewMode === 'tree'}
                                        onClick={() => setViewMode('tree')}
                                        className="w-8 h-8"
                                    />
                                    <GoogleButton
                                        variant="icon"
                                        icon={UI_ICONS.view_list}
                                        active={viewMode === 'list'}
                                        onClick={() => setViewMode('list')}
                                        className="w-8 h-8"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={`flex-1 p-2 scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent ${files.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                            {isLoadingSession ? (
                                <div className="flex items-center justify-center h-full text-[var(--theme-text-tertiary)] gap-2">
                                    <div className="w-4 h-4 border-2 border-[var(--theme-border)] border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
                                    <span className="text-sm">Restoring session...</span>
                                </div>
                            ) : files.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-tertiary)] py-10 opacity-60">
                                    <GoogleIcon path={ICONS_PATHS.folder_open} className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-sm">Workspace empty</p>
                                </div>
                            ) : viewMode === 'list' ? (
                                // Use virtualized list for large file sets (50+), regular DnD for small sets
                                files.length > 50 ? (
                                    <VirtualizedFileList files={files} onRemove={removeFile} />
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                            <ul className="flex flex-col p-2">
                                                {files.map(file => (
                                                    <SortableItem key={file.id} file={file} onRemove={removeFile} isDragging={activeId === file.id} />
                                                ))}
                                            </ul>
                                        </SortableContext>
                                        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                                            {activeFile ? <FileCard file={activeFile} isDragging /> : null}
                                        </DragOverlay>
                                    </DndContext>
                                )
                            ) : (
                                <div className="p-2">
                                    {fileTree.map(node => (
                                        <TreeItem key={node.id} node={node} level={0} onRemove={removeNode} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="flex-1 flex flex-col h-full min-w-0">
                    <div className="bg-[var(--theme-surface)] lg:rounded-3xl lg:border border-[var(--theme-border)] flex flex-col h-full lg:shadow-lg overflow-hidden relative border-t lg:border-t-0">
                        <div className="px-4 lg:px-6 py-4 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-surface)] shrink-0 flex-wrap gap-4">

                            <div className="flex-1 min-w-[240px] flex items-center gap-3 bg-[var(--theme-surface-hover)] rounded-full px-5 py-2.5 border border-[var(--theme-border)] focus-within:border-[var(--theme-primary)] focus-within:bg-[var(--theme-surface)] transition-all">
                                <GoogleIcon path={UI_ICONS.search} className="text-[var(--theme-text-tertiary)] w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Find in code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[var(--theme-text-primary)] text-sm w-full placeholder-[var(--theme-text-tertiary)]"
                                />
                                {searchTerm && (
                                    <div className="flex items-center gap-2 pl-2 border-l border-[var(--theme-border)]">
                                        <span className="text-xs text-[var(--theme-text-tertiary)] whitespace-nowrap font-mono">
                                            {searchMatches.length > 0 ? `${currentMatchIdx + 1}/${searchMatches.length}` : '0'}
                                        </span>
                                        <button onClick={handlePrevMatch} className="p-1 hover:text-[var(--theme-primary)] text-[var(--theme-text-secondary)] disabled:opacity-30"><GoogleIcon path={UI_ICONS.arrow_up} className="w-4 h-4"/></button>
                                        <button onClick={handleNextMatch} className="p-1 hover:text-[var(--theme-primary)] text-[var(--theme-text-secondary)] disabled:opacity-30"><GoogleIcon path={UI_ICONS.arrow_down} className="w-4 h-4"/></button>
                                        <button onClick={() => setSearchTerm("")} className="p-1 hover:text-[var(--theme-error)] text-[var(--theme-text-tertiary)]"><GoogleIcon path={UI_ICONS.close} className="w-4 h-4"/></button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <div className="relative hidden md:block group z-50">
                                    <OutputStyleSelector 
                                        value={outputStyle} 
                                        onChange={setOutputStyle} 
                                    />
                                </div>

                                <GoogleButton
                                    onClick={copyToClipboard}
                                    variant="filled"
                                    icon={isCopied ? UI_ICONS.check : UI_ICONS.copy}
                                    disabled={!combinedText || isTextPending}
                                >
                                    {isCopied ? 'Copied' : isTextPending ? 'Processing...' : 'Copy'}
                                </GoogleButton>
                            </div>
                        </div>

                        {/* High-Performance Virtualized Code Viewer */}
                        <div className="relative flex-1 min-h-0 bg-[var(--theme-bg)] overflow-hidden">
                            {/* Hidden textarea for copy and select all functionality */}
                            <textarea
                                ref={textAreaRef}
                                value={combinedText}
                                readOnly
                                className="absolute opacity-0 pointer-events-none"
                                tabIndex={-1}
                                aria-hidden="true"
                            />
                            
                            {/* Processing indicator */}
                            {isTextPending && (
                                <div className="absolute top-2 right-2 z-10 bg-[var(--theme-surface)]/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[var(--theme-border)] flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-[var(--theme-primary)]">Processing...</span>
                                </div>
                            )}
                            
                            {/* Virtualized Code Display - Only renders visible lines */}
                            <VirtualizedCodeViewer
                                content={combinedText}
                                lineNumbers={lineNumbers}
                                searchTerm={searchTerm}
                                currentMatchIdx={currentMatchIdx}
                                searchMatches={searchMatches}
                            />
                        </div>
                    </div>
                </section>
                    </motion.main>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isDragActive && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[var(--theme-primary)]/30 backdrop-blur-md flex items-center justify-center pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                            className="bg-[var(--theme-surface)] p-10 rounded-[32px] shadow-2xl border border-[var(--theme-primary)]/30 flex flex-col items-center"
                        >
                            <div className="w-24 h-24 bg-[var(--theme-surface-elevated)] rounded-full flex items-center justify-center text-[var(--theme-primary)] mb-6 animate-bounce border-2 border-[var(--theme-border)]">
                                <GoogleIcon path={UI_ICONS.upload} className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl text-[var(--theme-text-primary)] font-normal">Drop to analyze</h2>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCopied && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] px-6 py-3.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.4)] text-sm font-medium flex items-center gap-3"
                    >
                        <GoogleIcon path={UI_ICONS.check} className="w-5 h-5" />
                        Content copied to clipboard
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteConfirmOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[var(--theme-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirmOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[var(--theme-surface-elevated)] rounded-[28px] p-8 w-full max-w-sm shadow-2xl border border-[var(--theme-border)]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 rounded-full bg-[var(--theme-error)]/20 text-[var(--theme-error)] flex items-center justify-center mb-4">
                                    <GoogleIcon path={UI_ICONS.delete} className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl text-[var(--theme-text-primary)] leading-8">Reset workspace?</h3>
                                <p className="text-[var(--theme-text-secondary)] text-sm mt-2 leading-5">
                                    This will remove all {files.length} files. This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex justify-stretch gap-3">
                                <GoogleButton variant="tonal" className="flex-1" onClick={() => setDeleteConfirmOpen(false)}>
                                    Cancel
                                </GoogleButton>
                                <GoogleButton variant="filled" className="bg-[var(--theme-error)] text-white hover:brightness-90 flex-1 border-none" onClick={() => {
                                    clearWorkspace();
                                    setDeleteConfirmOpen(false);
                                }}>
                                    Reset
                                </GoogleButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Git File Selector Modal */}
            <AnimatePresence>
                {gitModalOpen && (
                    <GitFileSelector
                        isOpen={gitModalOpen}
                        onClose={() => setGitModalOpen(false)}
                        onImport={handleGitImport}
                        onStartImport={handleStartImport}
                        onOpenSettings={openSettingsTab}
                        settings={settings}
                    />
                )}
            </AnimatePresence>

            {/* Global Import Indicator */}
            <GlobalImportIndicator
                taskId={currentImportTaskId}
                repoName={currentRepoName}
                onComplete={() => {
                    setCurrentImportTaskId(null);
                    setCurrentRepoName('');
                }}
            />

            {/* About Modal */}
            <AnimatePresence>
                {aboutModalOpen && (
                    <AboutModal
                        isOpen={aboutModalOpen}
                        onClose={() => setAboutModalOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Shortcuts Modal */}
            <AnimatePresence>
                {shortcutsModalOpen && (
                    <ShortcutsModal
                        isOpen={shortcutsModalOpen}
                        onClose={() => setShortcutsModalOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Security Warning Modal */}
            <AnimatePresence>
                {securityWarningOpen && (
                    <SecurityWarningModal
                        isOpen={securityWarningOpen}
                        onClose={() => setSecurityWarningOpen(false)}
                        onProceed={performCopy}
                        issues={securityIssues}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
