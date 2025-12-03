/**
 * Zustand Session Store with Split Storage Architecture
 * 
 * This store manages ONLY lightweight metadata (no file content).
 * Heavy file content is offloaded to IndexedDB via the storage layer.
 * 
 * Key Features:
 * - Immer middleware for immutable updates
 * - Persist middleware for localStorage (metadata only)
 * - Selectors to prevent unnecessary re-renders
 * - Async actions for IndexedDB operations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
    saveFilesContentBulk, 
    deleteSessionData, 
    deleteFileContent,
    copySessionContent,
    getAllSessionContent,
} from '@/lib/storage';
import type { FileData } from '@/types';
import type { 
    OutputStyleType, 
    ViewModeType, 
    CodeProcessingModeType 
} from '@/types/session';

// ============================================
// Types (Metadata Only - No Content!)
// ============================================

/** File metadata without the heavy content string */
export interface SessionFileMeta {
    id: string;
    name: string;
    isText: boolean;
    linesOfCode: number;
    characterCount: number;
    tokenCount: number;
    path: string;
    // content is stored in IndexedDB, NOT here!
}

/** Session with file metadata only */
export interface SessionMeta {
    id: string;
    type: 'editor' | 'settings' | 'report-issue';
    name: string;
    files: SessionFileMeta[];
    outputStyle: OutputStyleType;
    viewMode: ViewModeType;
    codeProcessingMode: CodeProcessingModeType;
    createdAt: number;
    updatedAt: number;
    isActive: boolean;
    isPinned: boolean;
    color?: string;
}

/** Recent project with session snapshot metadata */
export interface RecentProjectMeta {
    id: string;
    name: string;
    fileCount: number;
    totalTokens: number;
    totalLines: number;
    lastOpened: number;
    createdAt: number;
    thumbnail?: string;
    primaryLanguage?: string;
    sessionSnapshot: SessionMeta;
    openSessionIds?: string[];
    isPinned?: boolean;
}

// ============================================
// Store State & Actions
// ============================================

interface SessionState {
    sessions: SessionMeta[];
    activeSessionId: string | null;
    recentProjects: RecentProjectMeta[];
    showHomeView: boolean;
    isLoading: boolean;
    loadingProgress: number;
}

interface SessionActions {
    // Session CRUD
    createSession: (name?: string) => SessionMeta;
    closeSession: (id: string) => Promise<void>;
    closeOtherSessions: (keepId: string) => Promise<void>;
    closeAllSessions: () => Promise<void>;
    switchSession: (id: string) => void;
    renameSession: (id: string, name: string) => void;
    togglePinSession: (id: string) => void;
    duplicateSession: (id: string) => Promise<SessionMeta | null>;
    
    // File management (stores metadata, offloads content to IndexedDB)
    addFilesToSession: (sessionId: string, files: FileData[]) => Promise<void>;
    removeFileFromSession: (sessionId: string, fileId: string) => Promise<void>;
    updateSessionFiles: (sessionId: string, files: SessionFileMeta[]) => void;
    
    // Session settings
    updateSessionSettings: (id: string, settings: {
        outputStyle?: OutputStyleType;
        viewMode?: ViewModeType;
        codeProcessingMode?: CodeProcessingModeType;
    }) => void;
    
    // Recent projects
    openRecentProject: (projectId: string) => void;
    removeRecentProject: (projectId: string) => Promise<void>;
    clearRecentProjects: () => Promise<void>;
    togglePinRecentProject: (projectId: string) => void;
    
    // UI state
    toggleHomeView: (show: boolean) => void;
    reorderSessions: (fromIndex: number, toIndex: number) => void;
    openSettingsTab: () => void;
    openReportIssueTab: () => void;
    
    // Loading state
    setLoading: (isLoading: boolean) => void;
    setLoadingProgress: (progress: number) => void;
    
    // Hydration
    _hasHydrated: boolean;
    setHasHydrated: (hasHydrated: boolean) => void;
}

type SessionStore = SessionState & SessionActions;

// ============================================
// Constants
// ============================================

const TAB_COLORS = [
    '#A8C7FA', '#7FCFB6', '#F2B8B5', '#FFD699',
    '#C8ACF6', '#89D185', '#FFB4A9', '#AECBFA',
] as const;

const MAX_RECENT_PROJECTS = 20;

// ============================================
// Helper Functions
// ============================================

const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getRandomColor = () => TAB_COLORS[Math.floor(Math.random() * TAB_COLORS.length)];

const detectPrimaryLanguage = (files: SessionFileMeta[]): string => {
    const extCount: Record<string, number> = {};
    files.forEach(f => {
        const ext = f.name.split('.').pop()?.toLowerCase() || 'txt';
        extCount[ext] = (extCount[ext] || 0) + 1;
    });
    const sorted = Object.entries(extCount).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'txt';
};

/** Strip content from FileData to create SessionFileMeta */
const fileDataToMeta = (file: FileData): SessionFileMeta => ({
    id: file.id,
    name: file.name,
    isText: file.isText,
    linesOfCode: file.linesOfCode,
    characterCount: file.characterCount,
    tokenCount: file.tokenCount,
    path: file.path,
});

const createEmptySession = (name?: string): SessionMeta => ({
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

// ============================================
// Store Creation
// ============================================

export const useSessionStore = create<SessionStore>()(
    persist(
        immer((set, get) => ({
            // Initial state
            sessions: [],
            activeSessionId: null,
            recentProjects: [],
            showHomeView: true,
            isLoading: true,
            loadingProgress: 0,
            _hasHydrated: false,

            setHasHydrated: (hasHydrated) => {
                set({ _hasHydrated: hasHydrated, isLoading: !hasHydrated });
            },

            setLoading: (isLoading) => set({ isLoading }),
            setLoadingProgress: (progress) => set({ loadingProgress: progress }),

            // ========== Session CRUD ==========
            
            createSession: (name) => {
                const newSession = createEmptySession(name);
                
                set((state) => {
                    state.sessions.forEach(s => { s.isActive = false; });
                    state.sessions.push(newSession);
                    state.activeSessionId = newSession.id;
                    state.showHomeView = false;
                });
                
                return newSession;
            },

            closeSession: async (id) => {
                const state = get();
                const sessionToClose = state.sessions.find(s => s.id === id);
                
                if (!sessionToClose) return;
                
                // Delete content from IndexedDB
                await deleteSessionData(id);
                
                set((draft) => {
                    const filteredSessions = draft.sessions.filter(s => s.id !== id);
                    
                    // Save to recent if has files
                    if (sessionToClose.files.length > 0) {
                        const existingRecent = draft.recentProjects.find(p => 
                            p.openSessionIds?.includes(id)
                        );
                        
                        if (existingRecent) {
                            existingRecent.sessionSnapshot = sessionToClose;
                            existingRecent.fileCount = sessionToClose.files.length;
                            existingRecent.totalTokens = sessionToClose.files.reduce((a, b) => a + b.tokenCount, 0);
                            existingRecent.totalLines = sessionToClose.files.reduce((a, b) => a + b.linesOfCode, 0);
                            existingRecent.lastOpened = Date.now();
                            existingRecent.name = sessionToClose.name;
                            existingRecent.openSessionIds = existingRecent.openSessionIds?.filter(sid => sid !== id) || [];
                        } else {
                            const recentProject: RecentProjectMeta = {
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
                            draft.recentProjects.unshift(recentProject);
                            if (draft.recentProjects.length > MAX_RECENT_PROJECTS) {
                                draft.recentProjects.pop();
                            }
                        }
                    }
                    
                    // Determine new active session
                    if (id === draft.activeSessionId) {
                        const closedIndex = draft.sessions.findIndex(s => s.id === id);
                        const nextSession = filteredSessions[closedIndex] || filteredSessions[closedIndex - 1];
                        draft.activeSessionId = nextSession?.id || null;
                    }
                    
                    draft.sessions = filteredSessions;
                    draft.showHomeView = filteredSessions.length === 0;
                });
            },

            closeOtherSessions: async (keepId) => {
                const state = get();
                const sessionsToClose = state.sessions.filter(s => s.id !== keepId);
                
                // Delete content from IndexedDB for all closing sessions
                await Promise.all(
                    sessionsToClose.map(s => deleteSessionData(s.id))
                );
                
                set((draft) => {
                    sessionsToClose.filter(s => s.files.length > 0).forEach(session => {
                        const existingRecent = draft.recentProjects.find(p => 
                            p.openSessionIds?.includes(session.id)
                        );
                        
                        if (existingRecent) {
                            existingRecent.sessionSnapshot = session;
                            existingRecent.fileCount = session.files.length;
                            existingRecent.totalTokens = session.files.reduce((a, b) => a + b.tokenCount, 0);
                            existingRecent.totalLines = session.files.reduce((a, b) => a + b.linesOfCode, 0);
                            existingRecent.lastOpened = Date.now();
                            existingRecent.name = session.name;
                            existingRecent.openSessionIds = existingRecent.openSessionIds?.filter(sid => sid !== session.id) || [];
                        } else {
                            draft.recentProjects.unshift({
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
                            });
                        }
                    });
                    
                    draft.recentProjects = draft.recentProjects.slice(0, MAX_RECENT_PROJECTS);
                    draft.sessions = draft.sessions.filter(s => s.id === keepId);
                    draft.activeSessionId = keepId;
                });
            },

            closeAllSessions: async () => {
                const state = get();
                
                // Delete content from IndexedDB for all sessions
                await Promise.all(
                    state.sessions.map(s => deleteSessionData(s.id))
                );
                
                set((draft) => {
                    draft.sessions.filter(s => s.files.length > 0).forEach(session => {
                        const existingRecent = draft.recentProjects.find(p => 
                            p.openSessionIds?.includes(session.id)
                        );
                        
                        if (existingRecent) {
                            existingRecent.sessionSnapshot = session;
                            existingRecent.fileCount = session.files.length;
                            existingRecent.totalTokens = session.files.reduce((a, b) => a + b.tokenCount, 0);
                            existingRecent.totalLines = session.files.reduce((a, b) => a + b.linesOfCode, 0);
                            existingRecent.lastOpened = Date.now();
                            existingRecent.name = session.name;
                            existingRecent.openSessionIds = [];
                        } else {
                            draft.recentProjects.unshift({
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
                            });
                        }
                    });
                    
                    draft.recentProjects = draft.recentProjects.slice(0, MAX_RECENT_PROJECTS);
                    draft.sessions = [];
                    draft.activeSessionId = null;
                    draft.showHomeView = true;
                });
            },

            switchSession: (id) => {
                set((state) => {
                    if (state.activeSessionId === id && !state.showHomeView) return;
                    state.activeSessionId = id;
                    state.showHomeView = false;
                });
            },

            renameSession: (id, name) => {
                set((state) => {
                    const session = state.sessions.find(s => s.id === id);
                    if (session) {
                        session.name = name;
                        session.updatedAt = Date.now();
                    }
                });
            },

            togglePinSession: (id) => {
                set((state) => {
                    const session = state.sessions.find(s => s.id === id);
                    if (session) {
                        session.isPinned = !session.isPinned;
                    }
                    // Sort: pinned first
                    state.sessions.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
                });
            },

            duplicateSession: async (id) => {
                const state = get();
                const original = state.sessions.find(s => s.id === id);
                if (!original) return null;
                
                const newId = generateId();
                const duplicate: SessionMeta = {
                    ...original,
                    id: newId,
                    name: `${original.name} (Copy)`,
                    files: original.files.map(f => ({ ...f, id: `${f.id}_copy_${Date.now()}` })),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    isActive: true,
                    isPinned: false,
                    color: getRandomColor(),
                };
                
                // Copy file contents in IndexedDB
                const fileIdMapping = new Map<string, string>();
                original.files.forEach((f, i) => {
                    fileIdMapping.set(f.id, duplicate.files[i].id);
                });
                
                await copySessionContent(id, newId, fileIdMapping);
                
                set((draft) => {
                    draft.sessions.forEach(s => { s.isActive = false; });
                    draft.sessions.push(duplicate);
                    draft.activeSessionId = duplicate.id;
                });
                
                return duplicate;
            },

            // ========== File Management ==========

            addFilesToSession: async (sessionId, files) => {
                if (files.length === 0) return;
                
                // Extract content for IndexedDB storage
                const contentData = files.map(f => ({
                    fileId: f.id,
                    content: f.content,
                }));
                
                // Store content in IndexedDB (async, non-blocking for UI)
                const savePromise = saveFilesContentBulk(sessionId, contentData);
                
                // Convert to metadata (strips content)
                const fileMetas = files.map(fileDataToMeta);
                
                // Update store immediately (metadata only)
                set((state) => {
                    const session = state.sessions.find(s => s.id === sessionId);
                    if (session) {
                        session.files.push(...fileMetas);
                        session.updatedAt = Date.now();
                    }
                });
                
                // Wait for IndexedDB save to complete
                await savePromise;
            },

            removeFileFromSession: async (sessionId, fileId) => {
                // Delete from IndexedDB
                await deleteFileContent(sessionId, fileId);
                
                set((state) => {
                    const session = state.sessions.find(s => s.id === sessionId);
                    if (session) {
                        session.files = session.files.filter(f => f.id !== fileId);
                        session.updatedAt = Date.now();
                    }
                });
            },

            updateSessionFiles: (sessionId, files) => {
                set((state) => {
                    const session = state.sessions.find(s => s.id === sessionId);
                    if (session) {
                        session.files = files;
                        session.updatedAt = Date.now();
                    }
                });
            },

            // ========== Session Settings ==========

            updateSessionSettings: (id, settings) => {
                set((state) => {
                    const session = state.sessions.find(s => s.id === id);
                    if (session) {
                        if (settings.outputStyle !== undefined) session.outputStyle = settings.outputStyle;
                        if (settings.viewMode !== undefined) session.viewMode = settings.viewMode;
                        if (settings.codeProcessingMode !== undefined) session.codeProcessingMode = settings.codeProcessingMode;
                        session.updatedAt = Date.now();
                    }
                });
            },

            // ========== Recent Projects ==========

            openRecentProject: (projectId) => {
                set((state) => {
                    const project = state.recentProjects.find(p => p.id === projectId);
                    if (!project) return;
                    
                    // Check if session already open
                    const existingSessionId = project.openSessionIds?.find(sid => 
                        state.sessions.some(s => s.id === sid)
                    );
                    
                    if (existingSessionId) {
                        state.sessions.forEach(s => { s.isActive = s.id === existingSessionId; });
                        state.activeSessionId = existingSessionId;
                        state.showHomeView = false;
                        project.lastOpened = Date.now();
                        return;
                    }
                    
                    // Create new session from snapshot
                    const newSessionId = generateId();
                    const restoredSession: SessionMeta = {
                        ...project.sessionSnapshot,
                        id: newSessionId,
                        isActive: true,
                        updatedAt: Date.now(),
                    };
                    
                    state.sessions.forEach(s => { s.isActive = false; });
                    state.sessions.push(restoredSession);
                    state.activeSessionId = newSessionId;
                    state.showHomeView = false;
                    
                    project.lastOpened = Date.now();
                    if (!project.openSessionIds) project.openSessionIds = [];
                    project.openSessionIds.push(newSessionId);
                });
            },

            removeRecentProject: async (projectId) => {
                const state = get();
                const project = state.recentProjects.find(p => p.id === projectId);
                
                // Clean up any associated content from IndexedDB
                if (project?.sessionSnapshot) {
                    await deleteSessionData(project.sessionSnapshot.id);
                }
                
                set((draft) => {
                    draft.recentProjects = draft.recentProjects.filter(p => p.id !== projectId);
                });
            },

            clearRecentProjects: async () => {
                const state = get();
                
                // Clean up all content from IndexedDB
                await Promise.all(
                    state.recentProjects.map(p => 
                        p.sessionSnapshot ? deleteSessionData(p.sessionSnapshot.id) : Promise.resolve()
                    )
                );
                
                set((draft) => {
                    draft.recentProjects = [];
                });
            },

            togglePinRecentProject: (projectId) => {
                set((state) => {
                    const project = state.recentProjects.find(p => p.id === projectId);
                    if (project) {
                        project.isPinned = !project.isPinned;
                    }
                    state.recentProjects.sort((a, b) => {
                        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                        return b.lastOpened - a.lastOpened;
                    });
                });
            },

            // ========== UI State ==========

            toggleHomeView: (show) => {
                set({ showHomeView: show });
            },

            reorderSessions: (fromIndex, toIndex) => {
                set((state) => {
                    const [removed] = state.sessions.splice(fromIndex, 1);
                    state.sessions.splice(toIndex, 0, removed);
                });
            },

            openSettingsTab: () => {
                set((state) => {
                    const existingSettings = state.sessions.find(s => s.type === 'settings');
                    
                    if (existingSettings) {
                        state.sessions.forEach(s => { s.isActive = s.id === existingSettings.id; });
                        state.activeSessionId = existingSettings.id;
                        state.showHomeView = false;
                        return;
                    }
                    
                    const settingsSession: SessionMeta = {
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
                        color: '#89D185',
                    };
                    
                    state.sessions.forEach(s => { s.isActive = false; });
                    state.sessions.push(settingsSession);
                    state.activeSessionId = settingsSession.id;
                    state.showHomeView = false;
                });
            },

            openReportIssueTab: () => {
                set((state) => {
                    const existingReportIssue = state.sessions.find(s => s.type === 'report-issue');
                    
                    if (existingReportIssue) {
                        state.sessions.forEach(s => { s.isActive = s.id === existingReportIssue.id; });
                        state.activeSessionId = existingReportIssue.id;
                        state.showHomeView = false;
                        return;
                    }
                    
                    const reportIssueSession: SessionMeta = {
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
                        color: '#EF4444',
                    };
                    
                    state.sessions.forEach(s => { s.isActive = false; });
                    state.sessions.push(reportIssueSession);
                    state.activeSessionId = reportIssueSession.id;
                    state.showHomeView = false;
                });
            },
        })),
        {
            name: 'contextractor-session-store',
            storage: createJSONStorage(() => localStorage),
            // Only persist lightweight metadata - no heavy data!
            partialize: (state) => ({
                sessions: state.sessions,
                activeSessionId: state.activeSessionId,
                recentProjects: state.recentProjects,
                showHomeView: state.showHomeView,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

// ============================================
// Selectors (Prevents unnecessary re-renders!)
// ============================================

/** Get all sessions (use sparingly - causes re-render on any session change) */
export const useSessions = () => useSessionStore((state) => state.sessions);

/** Get active session ID only */
export const useActiveSessionId = () => useSessionStore((state) => state.activeSessionId);

/** Get active session (derived selector) */
export const useActiveSession = () => useSessionStore((state) => 
    state.sessions.find(s => s.id === state.activeSessionId) ?? null
);

/** Get session by ID */
export const useSession = (id: string) => useSessionStore((state) =>
    state.sessions.find(s => s.id === id)
);

/** Get files for a specific session (isolated from other session changes) */
export const useSessionFiles = (sessionId: string) => useSessionStore((state) =>
    state.sessions.find(s => s.id === sessionId)?.files ?? []
);

/** Get recent projects */
export const useRecentProjects = () => useSessionStore((state) => state.recentProjects);

/** Get UI state */
export const useShowHomeView = () => useSessionStore((state) => state.showHomeView);
export const useIsLoading = () => useSessionStore((state) => state.isLoading);
export const useLoadingProgress = () => useSessionStore((state) => state.loadingProgress);
export const useHasHydrated = () => useSessionStore((state) => state._hasHydrated);

/** Get session count (for tab bar) */
export const useSessionCount = () => useSessionStore((state) => state.sessions.length);

/** Get session tabs data (minimal data for tab bar) */
export const useSessionTabs = () => useSessionStore((state) => 
    state.sessions.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        color: s.color,
        isPinned: s.isPinned,
        isActive: s.id === state.activeSessionId,
        fileCount: s.files.length,
    }))
);

// ============================================
// Actions (stable references, no re-renders)
// ============================================

export const useSessionActions = () => useSessionStore((state) => ({
    createSession: state.createSession,
    closeSession: state.closeSession,
    closeOtherSessions: state.closeOtherSessions,
    closeAllSessions: state.closeAllSessions,
    switchSession: state.switchSession,
    renameSession: state.renameSession,
    togglePinSession: state.togglePinSession,
    duplicateSession: state.duplicateSession,
    addFilesToSession: state.addFilesToSession,
    removeFileFromSession: state.removeFileFromSession,
    updateSessionFiles: state.updateSessionFiles,
    updateSessionSettings: state.updateSessionSettings,
    openRecentProject: state.openRecentProject,
    removeRecentProject: state.removeRecentProject,
    clearRecentProjects: state.clearRecentProjects,
    togglePinRecentProject: state.togglePinRecentProject,
    toggleHomeView: state.toggleHomeView,
    reorderSessions: state.reorderSessions,
    openSettingsTab: state.openSettingsTab,
    openReportIssueTab: state.openReportIssueTab,
}));

// ============================================
// Utility Export for Content Retrieval
// ============================================

export { getAllSessionContent, getFilesContentBulk } from '@/lib/storage';
