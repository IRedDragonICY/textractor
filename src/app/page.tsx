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
import { CodeProcessingSelector } from '@/components/CodeProcessingSelector';
import { PromptTemplateSelector } from '@/components/PromptTemplateSelector';
import { GitFileSelector } from '@/components/GitFileSelector';
import { GlobalImportIndicator } from '@/components/GlobalImportIndicator';
import { TabBar } from '@/components/TabBar';
import { HomeView } from '@/components/HomeView';
import { MenuBar, AboutModal, ShortcutsModal } from '@/components/MenuBar';
import { SettingsView } from '@/components/SettingsView';
import { ReportIssueView } from '@/components/ReportIssueView';
import { ChangelogView } from '@/components/ChangelogView';
import { SecurityWarningModal } from '@/components/SecurityWarningModal';
import { ExportModal } from '@/components/ExportModal';
import { VirtualizedCodeViewer } from '@/components/VirtualizedCodeViewer';
import { WorkspaceSkeleton, LoadingProgress } from '@/components/LoadingSkeleton';
import { VirtualizedFileList } from '@/components/VirtualizedFileList';
import { StatsView } from '@/components/StatsView';

// Hooks
import { useSearchLines } from '@/hooks/useSearch';
import { useSessionManager, fileDataToSessionFile, convertSessionFiles } from '@/hooks/useSessionManager';
import { useHistory } from '@/hooks/useHistory';
import { ThemeProvider, useThemeProvider } from '@/hooks/useTheme';
import { useSettings } from '@/hooks/useSettings';

// Services & Utils
import { processFileObject, unzipAndProcess } from '@/lib/file-processing';
import { buildFileTree } from '@/lib/file-tree';
import { scanForSecrets, SecurityIssue } from '@/lib/security';
import { 
    processCodeAsync, 
    terminateWorker, 
    getCachedResult, 
    setCachedResult,
    clearSessionCache 
} from '@/lib/code-processing-worker';

// Types & Constants
import { OutputStyle, FileData, ViewMode, TreeNode, CodeProcessingMode as CodeProcessingModeType } from '@/types';
import { UI_ICONS_MAP } from '@/lib/icon-mapping';
import { OutputStyleType, ViewModeType, CodeProcessingModeType as SessionCodeProcessingModeType } from '@/types/session';
import { DEFAULT_PROMPT_TEMPLATES, TEMPLATE_PLACEHOLDER } from '@/constants/templates';
import { useTemplateState } from '@/store';

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
        togglePinRecentProject,
        toggleHomeView,
        openSettingsTab,
        openReportIssueTab,
        openChangelogTab,
    } = useSessionManager();

    // Derived state from active session - uses cached batch conversion
    // Cache is maintained per-session in useSessionManager
    const files = useMemo(() => {
        if (!activeSession) return [];
        return convertSessionFiles(activeSession.id, activeSession.files);
    }, [activeSession]);

    const outputStyle = activeSession?.outputStyle || 'standard';
    const viewMode = activeSession?.viewMode || 'tree';
    const codeProcessingMode = activeSession?.codeProcessingMode || 'raw';

    const { customTemplates, selectedTemplateId } = useTemplateState();
    const templates = useMemo(() => [...DEFAULT_PROMPT_TEMPLATES, ...customTemplates], [customTemplates]);
    const selectedTemplate = useMemo(
        () => templates.find((tpl) => tpl.id === selectedTemplateId) ?? null,
        [templates, selectedTemplateId]
    );

    // Local UI State
    const [isCopied, setIsCopied] = useState(false);
    const [copiedTemplateName, setCopiedTemplateName] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [gitModalOpen, setGitModalOpen] = useState(false);
    const [currentImportTaskId, setCurrentImportTaskId] = useState<string | null>(null);
    const [currentRepoName, setCurrentRepoName] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [processedScrollToLine, setProcessedScrollToLine] = useState<number | null>(null);
    const [processedScrollRequestId, setProcessedScrollRequestId] = useState(0);
    const [rawScrollToLine, setRawScrollToLine] = useState<number | null>(null);
    const [rawScrollRequestId, setRawScrollRequestId] = useState(0);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const [lastSelectedFileId, setLastSelectedFileId] = useState<string | null>(null);
    const [aboutModalOpen, setAboutModalOpen] = useState(false);
    const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [securityWarningOpen, setSecurityWarningOpen] = useState(false);
    const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);
    const [activeSideView, setActiveSideView] = useState<'explorer' | 'stats'>('explorer');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const isResizing = useRef(false);

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

    // ============================================
    // OPTIMIZED CODE PROCESSING - Zero-Delay Tab Switching
    // ============================================
    
    // Processed lines state - lines array for zero main-thread blocking
    const [combinedLines, setCombinedLines] = useState<string[]>([]);
    const [tokenSavings, setTokenSavings] = useState<number | undefined>(undefined);
    const [viewLayout, setViewLayout] = useState<'single' | 'split'>('single');
    // Track which session is currently processing (null = none)
    const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
    
    // isProcessing is true only if the CURRENT session is processing
    const isProcessing = processingSessionId === activeSessionId;
    
    // Use deferred value for expensive renders - keeps UI responsive during processing
    const deferredCombinedLines = useDeferredValue(combinedLines);
    const isStale = deferredCombinedLines !== combinedLines;
    
    // Memoized text files to prevent unnecessary re-renders
    const textFiles = useMemo(() => files.filter(f => f.isText), [files]);

    const getHeaderLine = useCallback((pathLabel: string) => {
        switch (outputStyle) {
            case 'hash':
                return `# --- ${pathLabel} ---`;
            case 'minimal':
                return `--- ${pathLabel} ---`;
            case 'xml':
                return `<file name="${pathLabel}">`;
            case 'markdown':
                return `### ${pathLabel}`;
            case 'standard':
            default:
                return `/* --- ${pathLabel} --- */`;
        }
    }, [outputStyle]);
    
    // Generate raw output as lines array synchronously (instant, no processing)
    const rawOutputLines = useMemo((): string[] => {
        if (textFiles.length === 0) return [];
        
        const lines: string[] = [];
        
        for (let i = 0; i < textFiles.length; i++) {
            const f = textFiles[i];
            const pathLabel = f.path || f.name;
            const ext = f.name.split('.').pop() || 'txt';
            
            // Add separator between files
            if (i > 0) {
                lines.push('');
            }
            
            // Add header based on output style
            const headerLine = getHeaderLine(pathLabel);
            lines.push(headerLine);
            if (outputStyle === 'markdown') {
                lines.push(`\`\`\`${ext}`);
            }
            
            // Push each content line
            const contentLines = f.content.split('\n');
            for (const line of contentLines) {
                lines.push(line);
            }
            
            // Add closing tags
            if (outputStyle === 'xml') {
                lines.push('</file>');
            } else if (outputStyle === 'markdown') {
                lines.push('```');
            }
        }
        
        return lines;
    }, [textFiles, getHeaderLine]);

    // Map each file ID to the starting line index in the current preview
    const buildLineIndexMap = useCallback((lines: string[]) => {
        const map = new Map<string, number>();
        if (lines.length === 0 || textFiles.length === 0) return map;

        let searchStart = 0;
        for (const f of textFiles) {
            const pathLabel = f.path || f.name;
            const headerLine = getHeaderLine(pathLabel);

            const foundIndex = lines.indexOf(headerLine, searchStart);
            if (foundIndex !== -1) {
                map.set(f.id, foundIndex);
                searchStart = foundIndex + 1;
            }
        }

        return map;
    }, [textFiles, getHeaderLine]);

    const processedLineIndexMap = useMemo(
        () => buildLineIndexMap(deferredCombinedLines),
        [buildLineIndexMap, deferredCombinedLines]
    );
    const rawLineIndexMap = useMemo(
        () => buildLineIndexMap(rawOutputLines),
        [buildLineIndexMap, rawOutputLines]
    );

    const buildFileGroups = useCallback((lines: string[]) => {
        if (lines.length === 0 || textFiles.length === 0) return [];

        const starts: { id: string; label: string; start: number }[] = [];
        let searchStart = 0;

        for (const f of textFiles) {
            const pathLabel = f.path || f.name;
            const headerLine = getHeaderLine(pathLabel);
            const foundIndex = lines.indexOf(headerLine, searchStart);

            if (foundIndex !== -1) {
                starts.push({ id: f.id, label: headerLine, start: foundIndex });
                searchStart = foundIndex + 1;
            }
        }

        if (starts.length === 0) {
            return [{ id: 'combined', label: 'Combined', count: lines.length }];
        }

        const groups = starts.map((entry, idx) => {
            const nextStart = idx + 1 < starts.length ? starts[idx + 1].start : lines.length;
            const count = Math.max(0, nextStart - entry.start);
            return { id: entry.id, label: entry.label, count };
        });

        const total = groups.reduce((sum, group) => sum + group.count, 0);
        if (total !== lines.length && groups.length > 0) {
            groups[groups.length - 1].count = Math.max(
                0,
                groups[groups.length - 1].count + (lines.length - total)
            );
        }

        return groups;
    }, [textFiles, getHeaderLine]);

    const processedFileGroups = useMemo(
        () => buildFileGroups(deferredCombinedLines),
        [buildFileGroups, deferredCombinedLines]
    );
    const rawFileGroups = useMemo(
        () => buildFileGroups(rawOutputLines),
        [buildFileGroups, rawOutputLines]
    );

    // INSTANT: Set content immediately on session/style change
    // For 'raw' mode, this is the final result
    // For other modes, this shows raw first, then updates with processed
    useEffect(() => {
        if (textFiles.length === 0) {
            setCombinedLines([]);
            setTokenSavings(undefined);
            return;
        }

        // For raw mode - instant, no processing needed
        if (codeProcessingMode === 'raw') {
            setCombinedLines(rawOutputLines);
            setTokenSavings(undefined);
            return;
        }

        // Check cache first - INSTANT if cached
        if (activeSessionId) {
            const cached = getCachedResult(
                activeSessionId,
                textFiles.map(f => ({ id: f.id, content: f.content })),
                outputStyle,
                codeProcessingMode
            );
            
            if (cached) {
                setCombinedLines(cached.lines);
                setTokenSavings(cached.tokenSavings);
                return;
            }
        }

        // Cache miss: Show raw output IMMEDIATELY while processing
        setCombinedLines(rawOutputLines);
        setProcessingSessionId(activeSessionId);

        // Process in background
        const abortController = new AbortController();
        
        processCodeAsync(
            textFiles.map(f => ({
                id: f.id,
                name: f.name,
                path: f.path,
                content: f.content,
                isText: f.isText
            })),
            outputStyle,
            codeProcessingMode
        )
            .then(({ lines, tokenSavings: savings }) => {
                if (!abortController.signal.aborted) {
                    setCombinedLines(lines);
                    setTokenSavings(savings);
                    // Only clear if this session is still the one processing
                    setProcessingSessionId(prev => prev === activeSessionId ? null : prev);
                    
                    // Cache for next time
                    if (activeSessionId) {
                        setCachedResult(
                            activeSessionId,
                            textFiles.map(f => ({ id: f.id, content: f.content })),
                            outputStyle,
                            codeProcessingMode,
                            lines,
                            savings
                        );
                    }
                }
            })
            .catch((error) => {
                if (!abortController.signal.aborted && error.message !== 'Cancelled') {
                    console.error('Processing error:', error);
                    setProcessingSessionId(prev => prev === activeSessionId ? null : prev);
                }
            });

        return () => {
            abortController.abort();
        };
    }, [textFiles, outputStyle, codeProcessingMode, activeSessionId, rawOutputLines]);

    // Jump code preview to a file's header when clicked in explorer/list
    const handleFocusFile = useCallback((fileId: string) => {
        const targetProcessedLine = processedLineIndexMap.get(fileId);
        const targetRawLine = rawLineIndexMap.get(fileId);

        if (targetProcessedLine !== undefined) {
            setProcessedScrollToLine(targetProcessedLine);
            setProcessedScrollRequestId(prev => prev + 1);
        }

        if (targetRawLine !== undefined) {
            setRawScrollToLine(targetRawLine);
            setRawScrollRequestId(prev => prev + 1);
        }

        if (targetProcessedLine !== undefined || targetRawLine !== undefined) {
            setIsMobileSidebarOpen(false);
        }
    }, [processedLineIndexMap, rawLineIndexMap]);

    // Selection handling with Ctrl/Cmd and Shift range
    const handleSelectFile = useCallback((fileId: string, e?: React.MouseEvent) => {
        const isMeta = !!(e?.metaKey || e?.ctrlKey);
        const isShift = !!e?.shiftKey;

        setSelectedFileIds((prev) => {
            const next = new Set(prev);
            const idsInOrder = files.map(f => f.id);

            if (isShift && lastSelectedFileId) {
                const start = idsInOrder.indexOf(lastSelectedFileId);
                const end = idsInOrder.indexOf(fileId);

                if (start !== -1 && end !== -1) {
                    const [from, to] = start < end ? [start, end] : [end, start];
                    for (let i = from; i <= to; i++) {
                        next.add(idsInOrder[i]);
                    }
                } else {
                    next.clear();
                    next.add(fileId);
                }
            } else if (isMeta) {
                if (next.has(fileId)) {
                    next.delete(fileId);
                } else {
                    next.add(fileId);
                }
            } else {
                next.clear();
                next.add(fileId);
            }

            return next;
        });

        if (!isShift) {
            setLastSelectedFileId(fileId);
        }

        if (!isMeta && !isShift) {
            handleFocusFile(fileId);
        }
    }, [files, handleFocusFile, lastSelectedFileId]);

    const applyTemplateToText = useCallback((text: string) => {
        if (!selectedTemplate) return text;
        const body = selectedTemplate.template.includes(TEMPLATE_PLACEHOLDER)
            ? selectedTemplate.template
            : `${selectedTemplate.template.trim()}\n\n${TEMPLATE_PLACEHOLDER}`;
        return body.split(TEMPLATE_PLACEHOLDER).join(text);
    }, [selectedTemplate]);

    // Compute combinedText ONLY when needed for clipboard (lazy join)
    // This avoids the expensive join on every render
    const getCombinedText = useCallback((options?: { applyTemplate?: boolean }) => {
        const base = combinedLines.join('\n');
        if (options?.applyTemplate && selectedTemplate) {
            return applyTemplateToText(base);
        }
        return base;
    }, [combinedLines, selectedTemplate, applyTemplateToText]);
    
    // For checking if there's content (cheap length check)
    const hasContent = combinedLines.length > 0;

    // Cleanup worker on unmount
    useEffect(() => {
        return () => {
            terminateWorker();
        };
    }, []);

    // Wrapped close session that also clears the processing cache
    const handleCloseSession = useCallback((sessionId: string) => {
        clearSessionCache(sessionId);
        closeSession(sessionId);
    }, [closeSession]);

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

    const setCodeProcessingMode = useCallback((mode: CodeProcessingModeType) => {
        if (!activeSessionId) return;
        updateSessionSettings(activeSessionId, { codeProcessingMode: mode as SessionCodeProcessingModeType });
    }, [activeSessionId, updateSessionSettings]);

    // File processing
    const addFiles = useCallback(async (incomingFiles: File[], targetId?: string) => {
        let targetSessionId = targetId || activeSessionId;
        // If targeting a new session (not active), assume empty initial files
        let currentFiles = (targetId && targetId !== activeSessionId) ? [] : files;

        // Create session if none exists
        if (!targetSessionId) {
            const newSession = createSession();
            targetSessionId = newSession.id;
            currentFiles = [];
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

        // Update session files directly
        const allFiles = [...currentFiles, ...newFiles];
        updateSessionFiles(targetSessionId, allFiles.map(fileDataToSessionFile));
        
        setProcessing(false);
        
        const hasFolders = newFiles.some(f => f.path.includes('/'));
        if (hasFolders) {
            updateSessionSettings(targetSessionId, { viewMode: 'tree' });
        }
    }, [activeSessionId, createSession, files, updateSessionFiles, updateSessionSettings]);

    const removeFile = useCallback((id: string) => {
        setSelectedFileIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        setFiles(prev => prev.filter(f => f.id !== id));
    }, [setFiles]);

    const removeNode = useCallback((node: TreeNode) => {
        if (node.type === 'folder') {
            const removedIds = new Set<string>();
            setFiles(prev => prev.filter(f => {
                const isMatch = f.path === node.path || f.path.startsWith(node.path + '/');
                if (isMatch) removedIds.add(f.id);
                return !isMatch;
            }));
            if (removedIds.size > 0) {
                setSelectedFileIds(prev => {
                    const next = new Set(prev);
                    removedIds.forEach(id => next.delete(id));
                    return next;
                });
            }
        } else {
            removeFile(node.id);
        }
    }, [removeFile, setFiles]);

    const clearWorkspace = useCallback(() => {
        setFiles([]);
        setSelectedFileIds(new Set());
        setLastSelectedFileId(null);
    }, [setFiles]);

    const handleRemoveSelected = useCallback(() => {
        if (selectedFileIds.size === 0) return;
        const idsToDelete = new Set(selectedFileIds);
        setFiles(prev => prev.filter(f => !idsToDelete.has(f.id)));
        setSelectedFileIds(new Set());
        setLastSelectedFileId(null);
    }, [selectedFileIds, setFiles]);

    // Search Hook - uses lines-based search for performance
    const { 
        searchTerm, setSearchTerm, searchMatches, currentMatchIdx, 
        handleNextMatch, handlePrevMatch 
    } = useSearchLines(deferredCombinedLines);

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
    const selectedCount = selectedFileIds.size;

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
            let sessionId: string | undefined;
            if (showHomeView) {
                const newSession = createSession();
                sessionId = newSession.id;
                toggleHomeView(false);
            }
            addFiles(droppedFiles, sessionId).catch(console.error);
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
                let sessionId: string | undefined;
                if (showHomeView) {
                    const newSession = createSession();
                    sessionId = newSession.id;
                    toggleHomeView(false);
                }
                addFiles(Array.from(e.clipboardData.files), sessionId).catch(console.error);
            } else {
                const text = e.clipboardData?.getData('text');
                if (text) {
                    let sessionId: string | undefined;
                    if (showHomeView) {
                        const newSession = createSession();
                        sessionId = newSession.id;
                        toggleHomeView(false);
                    }
                    const blob = new Blob([text], { type: 'text/plain' });
                    const file = new File([blob], `pasted_text_${Date.now()}.txt`, { type: 'text/plain' });
                    addFiles([file], sessionId).catch(console.error);
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
                handleCloseSession(activeSessionId);
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
            // Ctrl+E: Export
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                if (hasContent) {
                    setExportModalOpen(true);
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeSessionId, sessions, createSession, handleCloseSession, switchSession, toggleHomeView, handleUndo, handleRedo]);

    const copyToClipboard = () => {
        if (!hasContent) return;

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
        if (!hasContent) return;
        const contentToCopy = getCombinedText({ applyTemplate: true });
        const appliedTemplate = selectedTemplate?.name ?? null;

        navigator.clipboard.writeText(contentToCopy)
            .then(() => {
                setCopiedTemplateName(appliedTemplate);
                setIsCopied(true);
                setTimeout(() => {
                    setIsCopied(false);
                    setCopiedTemplateName(null);
                }, 3000);
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
            {/* Hidden file input with accessible label */}
            <label className="sr-only" htmlFor="file-upload-input">Upload files</label>
            <input {...getInputProps()} id="file-upload-input" aria-label="Upload files for context extraction" />

            {/* Modern Menu Bar - VS Code Style */}
            <nav className="flex items-center bg-[var(--theme-surface)] border-b border-[var(--theme-border-subtle)]" aria-label="Main navigation">
                {/* Mobile Menu Button */}
                <div className="lg:hidden px-2">
                    <button
                        type="button"
                        onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                        aria-label={isMobileSidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
                        aria-expanded={isMobileSidebarOpen}
                        aria-controls="mobile-sidebar"
                        className="relative inline-flex items-center justify-center overflow-hidden font-medium transition-all duration-200 rounded-full p-2 hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] w-8 h-8"
                    >
                        <GoogleIcon icon={UI_ICONS_MAP.menu} className="w-5 h-5" aria-hidden="true" />
                    </button>
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
                        onReportIssue={openReportIssueTab}
                        onShowChangelog={openChangelogTab}
                        onExport={() => setExportModalOpen(true)}
                        hasContent={hasContent}
                    />
                </div>
            </nav>

            {/* Tab Bar - VS Code Style */}
            <TabBar
                sessions={sessions}
                activeSessionId={activeSessionId}
                showHomeView={showHomeView}
                onSwitchSession={switchSession}
                onCloseSession={handleCloseSession}
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
                    <motion.main
                        key="home"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-hidden"
                        role="main"
                        aria-label="Home"
                    >
                        <HomeView
                            recentProjects={recentProjects}
                            onOpenRecent={openRecentProject}
                            onRemoveRecent={removeRecentProject}
                            onTogglePinRecent={togglePinRecentProject}
                            onClearRecentProjects={clearRecentProjects}
                            onCreateSession={handleCreateSessionFromHome}
                            onOpenFilePicker={handleOpenFilePicker}
                            onOpenGitImport={handleOpenGitImport}
                        />
                    </motion.main>
                ) : activeSession?.type === 'settings' ? (
                    <motion.main
                        key="settings"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-hidden"
                        role="main"
                        aria-label="Settings"
                    >
                        <SettingsView
                            settings={settings}
                            onUpdateSecurity={updateSecuritySettings}
                            onUpdateFilters={updateFilterSettings}
                            onReset={resetSettings}
                        />
                    </motion.main>
                ) : activeSession?.type === 'report-issue' ? (
                    <motion.main
                        key="report-issue"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-hidden"
                        role="main"
                        aria-label="Report Issue"
                    >
                        <ReportIssueView
                            onClose={() => activeSessionId && handleCloseSession(activeSessionId)}
                        />
                    </motion.main>
                ) : activeSession?.type === 'changelog' ? (
                    <motion.main
                        key="changelog"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-hidden"
                        role="main"
                        aria-label="Changelog"
                    >
                        <ChangelogView
                            onClose={() => activeSessionId && handleCloseSession(activeSessionId)}
                        />
                    </motion.main>
                ) : (
                    <motion.main
                        key="workspace"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-row overflow-hidden relative z-10"
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

                {/* Activity Bar - VS Code Style */}
                <div className="hidden lg:flex w-12 flex-col items-center py-2 gap-1 bg-[var(--theme-surface)] border-r border-[var(--theme-border)] shrink-0">
                    <button
                        onClick={() => {
                            if (activeSideView === 'explorer' && isSidebarOpen) {
                                setIsSidebarOpen(false);
                            } else {
                                setActiveSideView('explorer');
                                setIsSidebarOpen(true);
                            }
                        }}
                        className={`p-2.5 rounded-lg transition-all relative ${activeSideView === 'explorer' && isSidebarOpen ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                        title="Explorer (Ctrl+Shift+E)"
                    >
                        {activeSideView === 'explorer' && isSidebarOpen && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--theme-primary)] rounded-r" />
                        )}
                        <GoogleIcon icon={UI_ICONS_MAP.folder_open} className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => {
                            if (activeSideView === 'stats' && isSidebarOpen) {
                                setIsSidebarOpen(false);
                            } else {
                                setActiveSideView('stats');
                                setIsSidebarOpen(true);
                            }
                        }}
                        className={`p-2.5 rounded-lg transition-all relative ${activeSideView === 'stats' && isSidebarOpen ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                        title="Statistics (Ctrl+Shift+S)"
                    >
                        {activeSideView === 'stats' && isSidebarOpen && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--theme-primary)] rounded-r" />
                        )}
                        <GoogleIcon icon={UI_ICONS_MAP.chart} className="w-6 h-6" />
                    </button>
                </div>

                {/* Sidebar Panel - Resizable */}
                <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                        <motion.aside 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: sidebarWidth, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="hidden lg:flex flex-col h-full bg-[var(--theme-surface)] border-r border-[var(--theme-border)] overflow-hidden shrink-0 relative"
                            style={{ minWidth: 200, maxWidth: 600 }}
                        >
                            {/* Sidebar Header */}
                            <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between shrink-0">
                                <span className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wider">
                                    {activeSideView === 'explorer' ? 'Explorer' : 'Statistics'}
                                </span>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-1 rounded hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]"
                                    title="Close Sidebar"
                                >
                                    <GoogleIcon icon={UI_ICONS_MAP.close} className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Sidebar Content */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                                {activeSideView === 'explorer' ? (
                                    <div className="flex flex-col h-full">
                                        {/* Upload Area */}
                                        <div className="p-3 border-b border-[var(--theme-border)]">
                                            <motion.div
                                                onClick={open}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                className={`
                                                    rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-bg)] p-4 cursor-pointer
                                                    transition-colors duration-200 flex flex-col items-center text-center gap-2
                                                    hover:bg-[var(--theme-surface-hover)] hover:border-[var(--theme-text-tertiary)] group
                                                    ${processing ? 'opacity-50 pointer-events-none' : ''}
                                                `}
                                            >
                                                {processing ? (
                                                    <div className="w-8 h-8 border-2 border-[var(--theme-surface-elevated)] border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--theme-surface-elevated)] flex items-center justify-center text-[var(--theme-text-tertiary)] group-hover:text-[var(--theme-primary)] transition-colors">
                                                        <GoogleIcon icon={UI_ICONS_MAP.upload} className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[var(--theme-text-primary)] font-medium text-xs">Drop files or click</p>
                                                    <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-0.5">ZIP, Folders, Code</p>
                                                </div>
                                            </motion.div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); setGitModalOpen(true); }}
                                                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-secondary)] transition-colors"
                                            >
                                                <GoogleIcon icon={UI_ICONS_MAP.github} className="w-4 h-4" />
                                                Import Repository
                                            </button>
                                        </div>

                                        {/* File Explorer */}
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--theme-border)] gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-semibold text-[var(--theme-text-tertiary)] uppercase tracking-wider">Files</span>
                                                    {selectedCount > 0 && (
                                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/40">
                                                            {selectedCount} selected
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {files.length > 0 && (
                                                        <button
                                                            onClick={() => selectedCount > 0 ? handleRemoveSelected() : setDeleteConfirmOpen(true)}
                                                            className={`p-1 rounded transition-colors ${selectedCount > 0
                                                                ? 'hover:bg-[var(--theme-error)]/10 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)]'
                                                                : 'hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-error)]'
                                                            }`}
                                                            title={selectedCount > 0 ? 'Delete selected files' : 'Clear all files'}
                                                        >
                                                            <GoogleIcon icon={UI_ICONS_MAP.delete} className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setViewMode('tree')}
                                                        className={`p-1 rounded hover:bg-[var(--theme-surface-hover)] ${viewMode === 'tree' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)]'}`}
                                                        title="Tree view"
                                                    >
                                                        <GoogleIcon icon={UI_ICONS_MAP.view_tree} className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setViewMode('list')}
                                                        className={`p-1 rounded hover:bg-[var(--theme-surface-hover)] ${viewMode === 'list' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)]'}`}
                                                        title="List view"
                                                    >
                                                        <GoogleIcon icon={UI_ICONS_MAP.view_list} className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className={`flex-1 p-1 scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent ${files.length > 0 ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                                                {isLoadingSession ? (
                                                    <div className="flex items-center justify-center h-full text-[var(--theme-text-tertiary)] gap-2">
                                                        <div className="w-4 h-4 border-2 border-[var(--theme-border)] border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
                                                        <span className="text-xs">Loading...</span>
                                                    </div>
                                                ) : files.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-tertiary)] py-8 opacity-60">
                                                        <GoogleIcon icon={UI_ICONS_MAP.folder_open} className="w-12 h-12 mb-2 opacity-30" />
                                                        <p className="text-xs">No files loaded</p>
                                                    </div>
                                                ) : viewMode === 'list' ? (
                                                    files.length > 50 ? (
                                                        <VirtualizedFileList files={files} onRemove={removeFile} onSelect={handleSelectFile} selectedIds={selectedFileIds} />
                                                    ) : (
                                                        <DndContext
                                                            sensors={sensors}
                                                            collisionDetection={closestCenter}
                                                            onDragStart={handleDragStart}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                                <ul className="flex flex-col">
                                                                    {files.map(file => (
                                                                        <SortableItem
                                                                            key={file.id}
                                                                            file={file}
                                                                            onRemove={removeFile}
                                                                            onClick={handleSelectFile}
                                                                            isSelected={selectedFileIds.has(file.id)}
                                                                            isDragging={activeId === file.id}
                                                                        />
                                                                    ))}
                                                                </ul>
                                                            </SortableContext>
                                                            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                                                                {activeFile ? <FileCard file={activeFile} isDragging /> : null}
                                                            </DragOverlay>
                                                        </DndContext>
                                                    )
                                                ) : (
                                                    <div className="py-1">
                                                        {fileTree.map(node => (
                                                            <TreeItem
                                                                key={node.id}
                                                                node={node}
                                                                level={0}
                                                                onRemove={removeNode}
                                                                onSelectFile={handleSelectFile}
                                                                selectedIds={selectedFileIds}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <StatsView files={files} stats={stats} />
                                )}
                            </div>

                            {/* Resize Handle */}
                            <div
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[var(--theme-primary)] transition-colors group z-10"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    isResizing.current = true;
                                    const startX = e.clientX;
                                    const startWidth = sidebarWidth;
                                    
                                    const handleMouseMove = (e: MouseEvent) => {
                                        if (!isResizing.current) return;
                                        const delta = e.clientX - startX;
                                        const newWidth = Math.min(600, Math.max(200, startWidth + delta));
                                        setSidebarWidth(newWidth);
                                    };
                                    
                                    const handleMouseUp = () => {
                                        isResizing.current = false;
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--theme-border)] rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Mobile Sidebar */}
                <aside 
                    id="mobile-sidebar"
                    role="complementary"
                    aria-label="File explorer"
                    className={`
                    lg:hidden flex flex-col h-full shrink-0
                    fixed inset-y-0 left-0 z-40 w-[300px] bg-[var(--theme-surface)] border-r border-[var(--theme-border)] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                    ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    {/* Mobile Activity Bar */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--theme-border)]">
                        <button
                            onClick={() => setActiveSideView('explorer')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${activeSideView === 'explorer' ? 'bg-[var(--theme-surface-elevated)] text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)]'}`}
                        >
                            Explorer
                        </button>
                        <button
                            onClick={() => setActiveSideView('stats')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${activeSideView === 'stats' ? 'bg-[var(--theme-surface-elevated)] text-[var(--theme-primary)]' : 'text-[var(--theme-text-tertiary)]'}`}
                        >
                            Statistics
                        </button>
                        <button
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="p-2 rounded-lg hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)]"
                        >
                            <GoogleIcon icon={UI_ICONS_MAP.close} className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mobile Sidebar Content */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {activeSideView === 'explorer' ? (
                            <>
                                <div className="mb-3 space-y-2">
                                    <OutputStyleSelector value={outputStyle} onChange={setOutputStyle} />
                                    <CodeProcessingSelector 
                                        value={codeProcessingMode}
                                        onChange={setCodeProcessingMode}
                                        savingsPercent={tokenSavings}
                                    />
                                    <PromptTemplateSelector />
                                </div>
                                <motion.div
                                    onClick={open}
                                    whileTap={{ scale: 0.98 }}
                                    className="rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-bg)] p-4 cursor-pointer mb-3 flex flex-col items-center text-center gap-2"
                                >
                                    <GoogleIcon icon={UI_ICONS_MAP.upload} className="w-6 h-6 text-[var(--theme-text-tertiary)]" />
                                    <p className="text-xs text-[var(--theme-text-primary)]">Drop files or click</p>
                                </motion.div>
                                <button
                                    onClick={() => { setGitModalOpen(true); setIsMobileSidebarOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--theme-border)] mb-3"
                                >
                                    <GoogleIcon icon={UI_ICONS_MAP.github} className="w-4 h-4" />
                                    Import Repository
                                </button>
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-semibold text-[var(--theme-text-tertiary)] uppercase tracking-wider">Files</span>
                                        {selectedCount > 0 && (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/40">
                                                {selectedCount} selected
                                            </span>
                                        )}
                                    </div>
                                    {files.length > 0 && (
                                        <button
                                                onClick={() => selectedCount > 0 ? handleRemoveSelected() : setDeleteConfirmOpen(true)}
                                                className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${selectedCount > 0
                                                    ? 'text-[var(--theme-error)] border-[var(--theme-border)] hover:bg-[var(--theme-error)]/10'
                                                    : 'text-[var(--theme-text-tertiary)] border-[var(--theme-border)] hover:bg-[var(--theme-surface-hover)]'
                                                }`}
                                        >
                                                {selectedCount > 0 ? 'Delete selected' : 'Clear all'}
                                        </button>
                                    )}
                                </div>
                                {files.length === 0 ? (
                                    <div className="text-center py-8 text-[var(--theme-text-tertiary)] opacity-60">
                                        <GoogleIcon icon={UI_ICONS_MAP.folder_open} className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-xs">No files</p>
                                    </div>
                                ) : (
                                    <div className="space-y-0.5">
                                        {fileTree.map(node => (
                                            <TreeItem
                                                key={node.id}
                                                node={node}
                                                level={0}
                                                onRemove={removeNode}
                                                onSelectFile={handleSelectFile}
                                                selectedIds={selectedFileIds}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <StatsView files={files} stats={stats} />
                        )}
                    </div>
                </aside>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col h-full min-w-0">
                    <div className="bg-[var(--theme-surface)] flex flex-col h-full overflow-hidden relative">
                        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-surface)] shrink-0 flex-wrap gap-3" role="toolbar" aria-label="Code viewer controls">

                            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[var(--theme-bg)] rounded-lg px-3 py-2 border border-[var(--theme-border)] focus-within:border-[var(--theme-primary)] transition-all" role="search">
                                <GoogleIcon icon={UI_ICONS_MAP.search} className="text-[var(--theme-text-tertiary)] w-4 h-4" aria-hidden="true" />
                                <label htmlFor="code-search" className="sr-only">Search in code</label>
                                <input
                                    id="code-search"
                                    type="search"
                                    placeholder="Find in code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    aria-describedby={searchTerm ? "search-results-count" : undefined}
                                    className="bg-transparent border-none outline-none text-[var(--theme-text-primary)] text-sm w-full placeholder-[var(--theme-text-tertiary)]"
                                />
                                {searchTerm && (
                                    <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--theme-border)]" role="group" aria-label="Search navigation">
                                        <span id="search-results-count" className="text-xs text-[var(--theme-text-tertiary)] whitespace-nowrap font-mono" aria-live="polite">
                                            {searchMatches.length > 0 ? `${currentMatchIdx + 1}/${searchMatches.length}` : '0'}
                                        </span>
                                        <button onClick={handlePrevMatch} aria-label="Previous match" className="p-0.5 hover:text-[var(--theme-primary)] text-[var(--theme-text-secondary)]"><GoogleIcon icon={UI_ICONS_MAP.arrow_up} className="w-3.5 h-3.5" aria-hidden="true"/></button>
                                        <button onClick={handleNextMatch} aria-label="Next match" className="p-0.5 hover:text-[var(--theme-primary)] text-[var(--theme-text-secondary)]"><GoogleIcon icon={UI_ICONS_MAP.arrow_down} className="w-3.5 h-3.5" aria-hidden="true"/></button>
                                        <button onClick={() => setSearchTerm("")} aria-label="Clear search" className="p-0.5 hover:text-[var(--theme-error)] text-[var(--theme-text-tertiary)]"><GoogleIcon icon={UI_ICONS_MAP.close} className="w-3.5 h-3.5" aria-hidden="true"/></button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="relative hidden md:block">
                                    <OutputStyleSelector 
                                        value={outputStyle} 
                                        onChange={setOutputStyle} 
                                    />
                                </div>

                                <div className="relative hidden md:block">
                                    <CodeProcessingSelector 
                                        value={codeProcessingMode}
                                        onChange={setCodeProcessingMode}
                                        savingsPercent={tokenSavings}
                                    />
                                </div>

                                <div className="relative hidden md:block">
                                    <PromptTemplateSelector />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setViewLayout(prev => prev === 'single' ? 'split' : 'single')}
                                    aria-pressed={viewLayout === 'split'}
                                    className={`
                                        hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border
                                        ${viewLayout === 'split' 
                                            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' 
                                            : 'border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}
                                    `}
                                >
                                    {viewLayout === 'split' ? 'Split view' : 'Single view'}
                                </button>

                                <GoogleButton
                                    onClick={copyToClipboard}
                                    variant="filled"
                                    icon={isCopied ? UI_ICONS_MAP.check : UI_ICONS_MAP.copy}
                                    disabled={!hasContent || isProcessing}
                                >
                                    {isCopied ? 'Copied' : isProcessing ? 'Processing...' : 'Copy'}
                                </GoogleButton>
                            </div>
                        </div>

                        {/* Code Viewer */}
                        <div className={`relative flex-1 min-h-0 bg-[var(--theme-bg)] overflow-hidden ${viewLayout === 'split' ? 'p-3' : ''}`}>
                            {/* Hidden textarea for clipboard fallback - value computed lazily */}
                            <textarea
                                ref={textAreaRef}
                                defaultValue=""
                                readOnly
                                className="absolute opacity-0 pointer-events-none"
                                tabIndex={-1}
                                aria-hidden="true"
                            />
                            
                            {(isProcessing || isStale) && (
                                <div className="absolute top-2 right-2 z-10 bg-[var(--theme-surface)]/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[var(--theme-border)] flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-[var(--theme-primary)]">Processing...</span>
                                </div>
                            )}

                            {viewLayout === 'split' ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
                                    <div className="flex flex-col min-h-0 border border-[var(--theme-border)] rounded-xl bg-[var(--theme-surface)]/40 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
                                        <div className="px-3 py-2 border-b border-[var(--theme-border)] flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">Original</span>
                                            <span className="text-[10px] text-[var(--theme-text-tertiary)]">Raw content</span>
                                        </div>
                                        <div className="flex-1 min-h-0">
                                            <VirtualizedCodeViewer
                                                lines={rawOutputLines}
                                                searchTerm={searchTerm}
                                                currentMatchIdx={currentMatchIdx}
                                                searchMatches={searchMatches}
                                                scrollToLine={rawScrollToLine}
                                                scrollRequestId={rawScrollRequestId}
                                                fileGroups={rawFileGroups}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col min-h-0 border border-[var(--theme-border)] rounded-xl bg-[var(--theme-surface)]/40 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
                                        <div className="px-3 py-2 border-b border-[var(--theme-border)] flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[var(--theme-text-secondary)] uppercase tracking-wide">Processed</span>
                                            <span className="text-[10px] text-[var(--theme-text-tertiary)]">{codeProcessingMode === 'raw' ? 'Raw output' : codeProcessingMode === 'minify' ? 'Minified' : 'Comments removed'}</span>
                                        </div>
                                        <div className="flex-1 min-h-0">
                                            <VirtualizedCodeViewer
                                                lines={deferredCombinedLines}
                                                searchTerm={searchTerm}
                                                currentMatchIdx={currentMatchIdx}
                                                searchMatches={searchMatches}
                                                scrollToLine={processedScrollToLine}
                                                scrollRequestId={processedScrollRequestId}
                                                fileGroups={processedFileGroups}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <VirtualizedCodeViewer
                                    lines={deferredCombinedLines}
                                    searchTerm={searchTerm}
                                    currentMatchIdx={currentMatchIdx}
                                    searchMatches={searchMatches}
                                    scrollToLine={processedScrollToLine}
                                    scrollRequestId={processedScrollRequestId}
                                    fileGroups={processedFileGroups}
                                />
                            )}
                        </div>
                    </div>
                </div>
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
                                <GoogleIcon icon={UI_ICONS_MAP.upload} className="w-10 h-10" />
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
                        <GoogleIcon icon={UI_ICONS_MAP.check} className="w-5 h-5" />
                        {copiedTemplateName ? `Copied with "${copiedTemplateName}" template` : 'Content copied to clipboard'}
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
                                    <GoogleIcon icon={UI_ICONS_MAP.delete} className="w-6 h-6" />
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

            {/* Export Modal */}
            <AnimatePresence>
                {exportModalOpen && (
                    <ExportModal
                        isOpen={exportModalOpen}
                        onClose={() => setExportModalOpen(false)}
                        content={getCombinedText({ applyTemplate: true })}
                        files={files}
                        outputStyle={outputStyle}
                        sessionName={activeSession?.name || 'export'}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
