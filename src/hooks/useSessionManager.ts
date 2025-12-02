// Session Manager Hook - Enterprise-grade session management
// Inspired by VS Code tabs and Adobe Acrobat recent files

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Session, 
    SessionFile, 
    RecentProject, 
    SessionManagerState,
    OutputStyleType,
    ViewModeType,
    SESSION_STORAGE_KEY,
    RECENT_PROJECTS_KEY,
    SESSION_STATE_KEY,
    TAB_COLORS
} from '@/types/session';
import { FileData } from '@/types';

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

// Convert SessionFile to FileData
export const sessionFileToFileData = (file: SessionFile): FileData => ({
    ...file,
    fileObject: new Blob([file.content], { type: 'text/plain' }),
});

// Create empty session
const createEmptySession = (name?: string): Session => ({
    id: generateId(),
    name: name || `Untitled ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    files: [],
    outputStyle: 'standard',
    viewMode: 'tree',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isActive: true,
    isPinned: false,
    color: getRandomColor(),
});

// Load state from localStorage
const loadStateFromStorage = (): SessionManagerState => {
    if (typeof window === 'undefined') {
        return {
            sessions: [],
            activeSessionId: null,
            recentProjects: [],
            showHomeView: true,
        };
    }

    try {
        const stateStr = localStorage.getItem(SESSION_STATE_KEY);
        const sessionsStr = localStorage.getItem(SESSION_STORAGE_KEY);
        const recentStr = localStorage.getItem(RECENT_PROJECTS_KEY);

        const sessions: Session[] = sessionsStr ? JSON.parse(sessionsStr) : [];
        const recentProjects: RecentProject[] = recentStr ? JSON.parse(recentStr) : [];
        const savedState = stateStr ? JSON.parse(stateStr) : {};

        return {
            sessions,
            activeSessionId: savedState.activeSessionId || null,
            recentProjects,
            showHomeView: sessions.length === 0,
        };
    } catch (e) {
        console.error('Failed to load session state:', e);
        return {
            sessions: [],
            activeSessionId: null,
            recentProjects: [],
            showHomeView: true,
        };
    }
};

// Save state to localStorage
const saveStateToStorage = (state: SessionManagerState) => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state.sessions));
        localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(state.recentProjects));
        localStorage.setItem(SESSION_STATE_KEY, JSON.stringify({
            activeSessionId: state.activeSessionId,
        }));
    } catch (e) {
        console.error('Failed to save session state:', e);
    }
};

export const useSessionManager = () => {
    const [state, setState] = useState<SessionManagerState>({
        sessions: [],
        activeSessionId: null,
        recentProjects: [],
        showHomeView: true,
    });
    const [isLoading, setIsLoading] = useState(true);

    // Load initial state
    useEffect(() => {
        const loaded = loadStateFromStorage();
        setState(loaded);
        setIsLoading(false);
    }, []);

    // Save state on change (debounced)
    useEffect(() => {
        if (!isLoading) {
            const timeout = setTimeout(() => {
                saveStateToStorage(state);
            }, 300);
            return () => clearTimeout(timeout);
        }
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
                };
                newRecentProjects = [recentProject, ...prev.recentProjects].slice(0, MAX_RECENT_PROJECTS);
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
            const newRecentProjects = [...prev.recentProjects];

            sessionsToClose.forEach(session => {
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
                };
                newRecentProjects.unshift(recentProject);
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
            const newRecentProjects = [...prev.recentProjects];

            prev.sessions.filter(s => s.files.length > 0).forEach(session => {
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
                };
                newRecentProjects.unshift(recentProject);
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

    // Switch session
    const switchSession = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            sessions: prev.sessions.map(s => ({
                ...s,
                isActive: s.id === id,
            })),
            activeSessionId: id,
            showHomeView: false,
        }));
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
    const updateSessionSettings = useCallback((id: string, settings: { outputStyle?: OutputStyleType; viewMode?: ViewModeType }) => {
        setState(prev => ({
            ...prev,
            sessions: prev.sessions.map(s =>
                s.id === id ? { ...s, ...settings, updatedAt: Date.now() } : s
            ),
        }));
    }, []);

    // Open recent project
    const openRecentProject = useCallback((projectId: string) => {
        setState(prev => {
            const project = prev.recentProjects.find(p => p.id === projectId);
            if (!project) return prev;

            const restoredSession: Session = {
                ...project.sessionSnapshot,
                id: generateId(),
                isActive: true,
                updatedAt: Date.now(),
            };

            // Update recent project's last opened
            const updatedRecent = prev.recentProjects.map(p =>
                p.id === projectId ? { ...p, lastOpened: Date.now() } : p
            );

            return {
                ...prev,
                sessions: [...prev.sessions.map(s => ({ ...s, isActive: false })), restoredSession],
                activeSessionId: restoredSession.id,
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

    return {
        // State
        sessions: state.sessions,
        activeSession,
        activeSessionId: state.activeSessionId,
        recentProjects: state.recentProjects,
        showHomeView: state.showHomeView,
        isLoading,

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

        // UI actions
        toggleHomeView,
    };
};
