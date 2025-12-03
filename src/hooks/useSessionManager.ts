// Session Manager Hook - Enterprise-grade session management
// Inspired by VS Code tabs and Adobe Acrobat recent files

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    Session, 
    SessionFile, 
    RecentProject, 
    SessionManagerState,
    OutputStyleType,
    ViewModeType,
    CodeProcessingModeType,
    TAB_COLORS
} from '@/types/session';
import { FileData } from '@/types';
import { 
    loadSessionManagerState, 
    saveSessionManagerState, 
    clearOldLocalStorage 
} from '@/lib/db';

const MAX_RECENT_PROJECTS = 20;

// Generate unique ID
const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get random tab color
const getRandomColor = () => TAB_COLORS[Math.floor(Math.random() * TAB_COLORS.length)];

// Detect primary language from files
const detectPrimaryLanguage = (files: SessionFile[]): string => {
    const extCount: Record<string, number> = {};
    files.forEach(f => {
        const ext = f.name.split('.').pop()?.toLowerCase() || 'txt';
        extCount[ext] = (extCount[ext] || 0) + 1;
    });
    const sorted = Object.entries(extCount).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'txt';
};

// Convert FileData to SessionFile
export const fileDataToSessionFile = (file: FileData): SessionFile => ({
    id: file.id,
    name: file.name,
    content: file.content,
    isText: file.isText,
    linesOfCode: file.linesOfCode,
    characterCount: file.characterCount,
    tokenCount: file.tokenCount,
    path: file.path,
});

// Global cache for converted FileData per session
// Key: sessionId, Value: Map of fileId -> FileData
const fileDataCache = new Map<string, Map<string, FileData>>();

// Lazy blob - only created when actually needed
const createLazyBlob = (content: string): Blob => {
    return new Blob([content], { type: 'text/plain' });
};

// Convert SessionFile to FileData - with per-session caching
export const sessionFileToFileData = (file: SessionFile): FileData => ({
    ...file,
    // Lazy blob creation - most operations don't need this
    get fileObject() {
        return createLazyBlob(file.content);
    }
} as FileData);

// Batch convert with caching - much faster for large file sets
export const convertSessionFiles = (sessionId: string, files: SessionFile[]): FileData[] => {
    // Check if we have this session cached
    let sessionCache = fileDataCache.get(sessionId);
    
    // If cache exists and has same file count, return cached version
    if (sessionCache && sessionCache.size === files.length) {
        // Quick check - if first and last file IDs match, use cache
        const cachedIds = Array.from(sessionCache.keys());
        if (cachedIds[0] === files[0]?.id && cachedIds[cachedIds.length - 1] === files[files.length - 1]?.id) {
            return Array.from(sessionCache.values());
        }
    }
    
    // Create new cache for this session
    sessionCache = new Map();
    const result: FileData[] = [];
    
    for (const file of files) {
        const fileData: FileData = {
            ...file,
            get fileObject() {
                return createLazyBlob(file.content);
            }
        } as FileData;
        sessionCache.set(file.id, fileData);
        result.push(fileData);
    }
    
    fileDataCache.set(sessionId, sessionCache);
    
    // Limit cache size to prevent memory issues (keep last 10 sessions)
    if (fileDataCache.size > 10) {
        const firstKey = fileDataCache.keys().next().value;
        if (firstKey) fileDataCache.delete(firstKey);
    }
    
    return result;
};

// Create empty session
const createEmptySession = (name?: string): Session => ({
    id: generateId(),
    type: 'editor',
    name: name || `Untitled ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    files: [],
    outputStyle: 'standard',
    viewMode: 'tree',
    codeProcessingMode: 'raw',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isActive: true,
    isPinned: false,
    color: getRandomColor(),
});

export const useSessionManager = () => {
    const [state, setState] = useState<SessionManagerState>({
        sessions: [],
        activeSessionId: null,
        recentProjects: [],
        showHomeView: true,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const isSaving = useRef(false);
    const isInitialized = useRef(false);

    // Load initial state from IndexedDB - INSTANT, non-blocking
    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        // Immediate async load - no requestIdleCallback delay
        (async () => {
            try {
                clearOldLocalStorage();
                setLoadingProgress(50);
                
                const loaded = await loadSessionManagerState();
                
                // Immediate state update - no transitions or delays
                setState(loaded);
                setLoadingProgress(100);
                setIsLoading(false);
            } catch (e) {
                console.error('Failed to load session state:', e);
                setIsLoading(false);
            }
        })();
    }, []);

    // Save state on change (debounced, using IndexedDB) - Non-blocking
    useEffect(() => {
        if (isLoading || isSaving.current) return;
        
        const timeout = setTimeout(() => {
            // Use requestIdleCallback for non-blocking save
            const saveData = async () => {
                isSaving.current = true;
                try {
                    await saveSessionManagerState(state);
                } catch (e) {
                    console.error('Failed to save session state:', e);
                } finally {
                    isSaving.current = false;
                }
            };

            if ('requestIdleCallback' in window) {
                (window as Window).requestIdleCallback(() => {
                    saveData();
                }, { timeout: 2000 });
            } else {
                saveData();
            }
        }, 500); // Increased debounce for better batching
        
        return () => clearTimeout(timeout);
    }, [state, isLoading]);

    // Active session
    const activeSession = useMemo(() => {
        return state.sessions.find(s => s.id === state.activeSessionId) || null;
    }, [state.sessions, state.activeSessionId]);

    // Create new session
    const createSession = useCallback((name?: string | React.MouseEvent) => {
        // Ignore event objects passed from onClick handlers
        const sessionName = typeof name === 'string' ? name : undefined;
        const newSession = createEmptySession(sessionName);
        
        setState(prev => {
            const updatedSessions = prev.sessions.map(s => ({ ...s, isActive: false }));
            return {
                ...prev,
                sessions: [...updatedSessions, newSession],
                activeSessionId: newSession.id,
                showHomeView: false,
            };
        });

        return newSession;
    }, []);

    // Close session
    const closeSession = useCallback((id: string) => {
        setState(prev => {
            const sessionToClose = prev.sessions.find(s => s.id === id);
            const filteredSessions = prev.sessions.filter(s => s.id !== id);
            
            // Save to recent if has files
            let newRecentProjects = prev.recentProjects;
            if (sessionToClose && sessionToClose.files.length > 0) {
                // Check if this session came from a recent project
                const existingRecent = prev.recentProjects.find(p => 
                    p.openSessionIds?.includes(id)
                );

                if (existingRecent) {
                    // Update existing recent project with latest snapshot and remove from openSessionIds
                    newRecentProjects = prev.recentProjects.map(p => 
                        p.id === existingRecent.id 
                            ? {
                                ...p,
                                sessionSnapshot: sessionToClose,
                                fileCount: sessionToClose.files.length,
                                totalTokens: sessionToClose.files.reduce((a, b) => a + b.tokenCount, 0),
                                totalLines: sessionToClose.files.reduce((a, b) => a + b.linesOfCode, 0),
                                lastOpened: Date.now(),
                                name: sessionToClose.name,
                                openSessionIds: p.openSessionIds?.filter(sid => sid !== id) || [],
                            }
                            : p
                    );
                } else {
                    // Create new recent project
                    const recentProject: RecentProject = {
                        id: generateId(),
                        name: sessionToClose.name,
                        fileCount: sessionToClose.files.length,
                        totalTokens: sessionToClose.files.reduce((a, b) => a + b.tokenCount, 0),
                        totalLines: sessionToClose.files.reduce((a, b) => a + b.linesOfCode, 0),
                        lastOpened: Date.now(),
                        createdAt: sessionToClose.createdAt,
                        primaryLanguage: detectPrimaryLanguage(sessionToClose.files),
                        sessionSnapshot: sessionToClose,
                        openSessionIds: [],
                    };
                    newRecentProjects = [recentProject, ...prev.recentProjects].slice(0, MAX_RECENT_PROJECTS);
                }
            } else {
                // Remove this session ID from any recent project's openSessionIds
                newRecentProjects = prev.recentProjects.map(p => ({
                    ...p,
                    openSessionIds: p.openSessionIds?.filter(sid => sid !== id) || [],
                }));
            }

            // Determine new active session
            let newActiveId = prev.activeSessionId;
            if (id === prev.activeSessionId) {
                const closedIndex = prev.sessions.findIndex(s => s.id === id);
                const nextSession = filteredSessions[closedIndex] || filteredSessions[closedIndex - 1];
                newActiveId = nextSession?.id || null;
            }

            return {
                ...prev,
                sessions: filteredSessions,
                activeSessionId: newActiveId,
                recentProjects: newRecentProjects,
                showHomeView: filteredSessions.length === 0,
            };
        });
    }, []);

    // Close other sessions
    const closeOtherSessions = useCallback((keepId: string) => {
        setState(prev => {
            const sessionsToClose = prev.sessions.filter(s => s.id !== keepId && s.files.length > 0);
            let newRecentProjects = [...prev.recentProjects];

            sessionsToClose.forEach(session => {
                // Check if this session came from a recent project
                const existingRecent = newRecentProjects.find(p => 
                    p.openSessionIds?.includes(session.id)
                );

                if (existingRecent) {
                    // Update existing recent project
                    newRecentProjects = newRecentProjects.map(p => 
                        p.id === existingRecent.id 
                            ? {
                                ...p,
                                sessionSnapshot: session,
                                fileCount: session.files.length,
                                totalTokens: session.files.reduce((a, b) => a + b.tokenCount, 0),
                                totalLines: session.files.reduce((a, b) => a + b.linesOfCode, 0),
                                lastOpened: Date.now(),
                                name: session.name,
                                openSessionIds: p.openSessionIds?.filter(sid => sid !== session.id) || [],
                            }
                            : p
                    );
                } else {
                    // Create new recent project
                    const recentProject: RecentProject = {
                        id: generateId(),
                        name: session.name,
                        fileCount: session.files.length,
                        totalTokens: session.files.reduce((a, b) => a + b.tokenCount, 0),
                        totalLines: session.files.reduce((a, b) => a + b.linesOfCode, 0),
                        lastOpened: Date.now(),
                        createdAt: session.createdAt,
                        primaryLanguage: detectPrimaryLanguage(session.files),
                        sessionSnapshot: session,
                        openSessionIds: [],
                    };
                    newRecentProjects.unshift(recentProject);
                }
            });

            return {
                ...prev,
                sessions: prev.sessions.filter(s => s.id === keepId),
                activeSessionId: keepId,
                recentProjects: newRecentProjects.slice(0, MAX_RECENT_PROJECTS),
            };
        });
    }, []);

    // Close all sessions
    const closeAllSessions = useCallback(() => {
        setState(prev => {
            let newRecentProjects = [...prev.recentProjects];

            prev.sessions.filter(s => s.files.length > 0).forEach(session => {
                // Check if this session came from a recent project
                const existingRecent = newRecentProjects.find(p => 
                    p.openSessionIds?.includes(session.id)
                );

                if (existingRecent) {
                    // Update existing recent project
                    newRecentProjects = newRecentProjects.map(p => 
                        p.id === existingRecent.id 
                            ? {
                                ...p,
                                sessionSnapshot: session,
                                fileCount: session.files.length,
                                totalTokens: session.files.reduce((a, b) => a + b.tokenCount, 0),
                                totalLines: session.files.reduce((a, b) => a + b.linesOfCode, 0),
                                lastOpened: Date.now(),
                                name: session.name,
                                openSessionIds: [],
                            }
                            : p
                    );
                } else {
                    // Create new recent project
                    const recentProject: RecentProject = {
                        id: generateId(),
                        name: session.name,
                        fileCount: session.files.length,
                        totalTokens: session.files.reduce((a, b) => a + b.tokenCount, 0),
                        totalLines: session.files.reduce((a, b) => a + b.linesOfCode, 0),
                        lastOpened: Date.now(),
                        createdAt: session.createdAt,
                        primaryLanguage: detectPrimaryLanguage(session.files),
                        sessionSnapshot: session,
                        openSessionIds: [],
                    };
                    newRecentProjects.unshift(recentProject);
                }
            });

            return {
                ...prev,
                sessions: [],
                activeSessionId: null,
                recentProjects: newRecentProjects.slice(0, MAX_RECENT_PROJECTS),
                showHomeView: true,
            };
    });
    }, []);

    // Switch session - INSTANT, only update activeSessionId without recreating session objects
    const switchSession = useCallback((id: string) => {
        setState(prev => {
            // Skip if already active - prevents unnecessary re-renders
            if (prev.activeSessionId === id && !prev.showHomeView) {
                return prev;
            }
            return {
                ...prev,
                activeSessionId: id,
                showHomeView: false,
            };
        });
    }, []);

    // Rename session
    const renameSession = useCallback((id: string, name: string) => {
        setState(prev => ({
            ...prev,
            sessions: prev.sessions.map(s =>
                s.id === id ? { ...s, name, updatedAt: Date.now() } : s
            ),
        }));
    }, []);

    // Pin/Unpin session
    const togglePinSession = useCallback((id: string) => {
        setState(prev => {
            const sessions = prev.sessions.map(s =>
                s.id === id ? { ...s, isPinned: !s.isPinned } : s
            );
            // Sort: pinned first
            sessions.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
            return { ...prev, sessions };
        });
    }, []);

    // Duplicate session
    const duplicateSession = useCallback((id: string) => {
        setState(prev => {
            const original = prev.sessions.find(s => s.id === id);
            if (!original) return prev;

            const duplicate: Session = {
                ...original,
                id: generateId(),
                name: `${original.name} (Copy)`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isActive: true,
                isPinned: false,
                color: getRandomColor(),
            };

            return {
                ...prev,
                sessions: [...prev.sessions.map(s => ({ ...s, isActive: false })), duplicate],
                activeSessionId: duplicate.id,
            };
        });
    }, []);

    // Open Settings Tab
    const openSettingsTab = useCallback(() => {
        setState(prev => {
            // Check if settings tab already exists
            const existingSettings = prev.sessions.find(s => s.type === 'settings');
            
            if (existingSettings) {
                return {
                    ...prev,
                    sessions: prev.sessions.map(s => ({
                        ...s,
                        isActive: s.id === existingSettings.id,
                    })),
                    activeSessionId: existingSettings.id,
                    showHomeView: false,
                };
            }

            // Create new settings session
            const settingsSession: Session = {
                id: 'settings_tab',
                type: 'settings',
                name: 'Settings',
                files: [],
                outputStyle: 'standard',
                viewMode: 'tree',
                codeProcessingMode: 'raw',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isActive: true,
                isPinned: false,
                color: '#89D185', // Greenish for settings
            };

            const updatedSessions = prev.sessions.map(s => ({ ...s, isActive: false }));
            return {
                ...prev,
                sessions: [...updatedSessions, settingsSession],
                activeSessionId: settingsSession.id,
                showHomeView: false,
            };
        });
    }, []);

    // Open Report Issue Tab
    const openReportIssueTab = useCallback(() => {
        setState(prev => {
            // Check if report issue tab already exists
            const existingReportIssue = prev.sessions.find(s => s.type === 'report-issue');
            
            if (existingReportIssue) {
                return {
                    ...prev,
                    sessions: prev.sessions.map(s => ({
                        ...s,
                        isActive: s.id === existingReportIssue.id,
                    })),
                    activeSessionId: existingReportIssue.id,
                    showHomeView: false,
                };
            }

            // Create new report issue session
            const reportIssueSession: Session = {
                id: 'report_issue_tab',
                type: 'report-issue',
                name: 'Report Issue',
                files: [],
                outputStyle: 'standard',
                viewMode: 'tree',
                codeProcessingMode: 'raw',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isActive: true,
                isPinned: false,
                color: '#EF4444', // Red for issues/bugs
            };

            const updatedSessions = prev.sessions.map(s => ({ ...s, isActive: false }));
            return {
                ...prev,
                sessions: [...updatedSessions, reportIssueSession],
                activeSessionId: reportIssueSession.id,
                showHomeView: false,
            };
        });
    }, []);

    // Update session files
    const updateSessionFiles = useCallback((id: string, files: SessionFile[]) => {
        setState(prev => ({
            ...prev,
            sessions: prev.sessions.map(s =>
                s.id === id ? { ...s, files, updatedAt: Date.now() } : s
            ),
        }));
    }, []);

    // Update session settings
    const updateSessionSettings = useCallback((id: string, settings: { outputStyle?: OutputStyleType; viewMode?: ViewModeType; codeProcessingMode?: CodeProcessingModeType }) => {
        setState(prev => ({
            ...prev,
            sessions: prev.sessions.map(s =>
                s.id === id ? { ...s, ...settings, updatedAt: Date.now() } : s
            ),
        }));
    }, []);

    // Open recent project - INSTANT with proper caching
    // If session from this recent project is already open, switch to it instead
    const openRecentProject = useCallback((projectId: string) => {
        setState(prev => {
            const project = prev.recentProjects.find(p => p.id === projectId);
            if (!project) return prev;

            // Check if any session from this recent project is already open
            const existingSessionId = project.openSessionIds?.find(sid => 
                prev.sessions.some(s => s.id === sid)
            );

            if (existingSessionId) {
                // Session already open - just switch to it
                return {
                    ...prev,
                    sessions: prev.sessions.map(s => ({
                        ...s,
                        isActive: s.id === existingSessionId,
                    })),
                    activeSessionId: existingSessionId,
                    showHomeView: false,
                    recentProjects: prev.recentProjects.map(p =>
                        p.id === projectId ? { ...p, lastOpened: Date.now() } : p
                    ),
                };
            }

            // Create new session from snapshot
            const newSessionId = generateId();
            const restoredSession: Session = {
                ...project.sessionSnapshot,
                id: newSessionId,
                isActive: true,
                updatedAt: Date.now(),
            };

            // Update recent project's last opened and track the new session ID
            const updatedRecent = prev.recentProjects.map(p =>
                p.id === projectId 
                    ? { 
                        ...p, 
                        lastOpened: Date.now(),
                        openSessionIds: [...(p.openSessionIds || []), newSessionId]
                    } 
                    : p
            );

            return {
                ...prev,
                sessions: [...prev.sessions.map(s => ({ ...s, isActive: false })), restoredSession],
                activeSessionId: newSessionId,
                recentProjects: updatedRecent,
                showHomeView: false,
            };
        });
    }, []);

    // Remove recent project
    const removeRecentProject = useCallback((projectId: string) => {
        setState(prev => ({
            ...prev,
            recentProjects: prev.recentProjects.filter(p => p.id !== projectId),
        }));
    }, []);

    // Clear all recent projects
    const clearRecentProjects = useCallback(() => {
        setState(prev => ({
            ...prev,
            recentProjects: [],
        }));
    }, []);

    // Toggle home view
    const toggleHomeView = useCallback((show: boolean) => {
        setState(prev => ({
            ...prev,
            showHomeView: show,
        }));
    }, []);

    // Reorder sessions (for drag & drop)
    const reorderSessions = useCallback((fromIndex: number, toIndex: number) => {
        setState(prev => {
            const sessions = [...prev.sessions];
            const [removed] = sessions.splice(fromIndex, 1);
            sessions.splice(toIndex, 0, removed);
            return { ...prev, sessions };
        });
    }, []);

    // Toggle pin recent project
    const togglePinRecentProject = useCallback((projectId: string) => {
        setState(prev => {
            const recentProjects = prev.recentProjects.map(p =>
                p.id === projectId ? { ...p, isPinned: !p.isPinned } : p
            );
            // Sort: pinned first, then by lastOpened (default)
            // Note: HomeView has its own sorting, but we keep the underlying list somewhat ordered
            recentProjects.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return b.lastOpened - a.lastOpened;
            });
            return { ...prev, recentProjects };
        });
    }, []);

    return {
        // State
        sessions: state.sessions,
        activeSession,
        activeSessionId: state.activeSessionId,
        recentProjects: state.recentProjects,
        showHomeView: state.showHomeView,
        isLoading,
        loadingProgress,

        // Session actions
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

        // Recent projects actions
        openRecentProject,
        removeRecentProject,
        clearRecentProjects,
        togglePinRecentProject,

        // UI actions
        toggleHomeView,
        openSettingsTab,
        openReportIssueTab,
    };
};
