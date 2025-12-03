/**
 * Session Slice
 * 
 * Manages session CRUD operations, file management, and session settings
 */

import {
    saveFilesContentBulk,
    deleteSessionData,
    deleteFileContent,
    copySessionContent,
} from '@/lib/storage';
import type { FileData } from '@/types';
import type {
    OutputStyleType,
    ViewModeType,
    CodeProcessingModeType
} from '@/types/session';
import type { StoreSlice, SessionSlice, SessionMeta, SessionFileMeta } from '../types';

// ============================================
// Constants
// ============================================

const TAB_COLORS = [
    '#A8C7FA', '#7FCFB6', '#F2B8B5', '#FFD699',
    '#C8ACF6', '#89D185', '#FFB4A9', '#AECBFA',
] as const;

// ============================================
// Helper Functions
// ============================================

const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getRandomColor = () => TAB_COLORS[Math.floor(Math.random() * TAB_COLORS.length)];

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
// Slice Creator
// ============================================

export const createSessionSlice: StoreSlice<SessionSlice> = (set, get) => ({
    // Initial state
    sessions: [],
    activeSessionId: null,

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
            // Save to recent if has files
            if (sessionToClose.files.length > 0) {
                // Use the project slice's addOrUpdateRecentProject action
                const addOrUpdateRecentProject = get().addOrUpdateRecentProject;
                addOrUpdateRecentProject(sessionToClose);
            }

            const filteredSessions = draft.sessions.filter(s => s.id !== id);

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
            const addOrUpdateRecentProject = get().addOrUpdateRecentProject;
            
            // Save sessions with files to recent projects
            sessionsToClose.filter(s => s.files.length > 0).forEach(session => {
                addOrUpdateRecentProject(session);
            });

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
            const addOrUpdateRecentProject = get().addOrUpdateRecentProject;
            
            // Save sessions with files to recent projects
            draft.sessions.filter(s => s.files.length > 0).forEach(session => {
                addOrUpdateRecentProject(session);
            });

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

    // ========== UI-Related Session Actions ==========

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
});
