/**
 * Project Slice
 * 
 * Manages recent projects history and GitHub import history
 */

import { deleteSessionData } from '@/lib/storage';
import type { StoreSlice, ProjectSlice, SessionMeta, RecentProjectMeta, SessionFileMeta } from '../types';

// ============================================
// Constants
// ============================================

const MAX_RECENT_PROJECTS = 20;

// ============================================
// Helper Functions
// ============================================

const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const detectPrimaryLanguage = (files: SessionFileMeta[]): string => {
    const extCount: Record<string, number> = {};
    files.forEach(f => {
        const ext = f.name.split('.').pop()?.toLowerCase() || 'txt';
        extCount[ext] = (extCount[ext] || 0) + 1;
    });
    const sorted = Object.entries(extCount).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'txt';
};

// ============================================
// Slice Creator
// ============================================

export const createProjectSlice: StoreSlice<ProjectSlice> = (set, get) => ({
    // Initial state
    recentProjects: [],
    gitHubImportHistory: [],

    // Actions
    addOrUpdateRecentProject: (session, existingProjectId) => {
        set((state) => {
            // Find existing project by ID or by openSessionIds
            const existingRecent = existingProjectId 
                ? state.recentProjects.find(p => p.id === existingProjectId)
                : state.recentProjects.find(p => p.openSessionIds?.includes(session.id));

            if (existingRecent) {
                // Update existing project
                existingRecent.sessionSnapshot = session;
                existingRecent.fileCount = session.files.length;
                existingRecent.totalTokens = session.files.reduce((a, b) => a + b.tokenCount, 0);
                existingRecent.totalLines = session.files.reduce((a, b) => a + b.linesOfCode, 0);
                existingRecent.lastOpened = Date.now();
                existingRecent.name = session.name;
                existingRecent.primaryLanguage = detectPrimaryLanguage(session.files);
                // Remove the session ID from open sessions since it's being closed
                existingRecent.openSessionIds = existingRecent.openSessionIds?.filter(
                    sid => sid !== session.id
                ) || [];
            } else {
                // Create new recent project
                const recentProject: RecentProjectMeta = {
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
                state.recentProjects.unshift(recentProject);
            }

            // Trim to max size
            if (state.recentProjects.length > MAX_RECENT_PROJECTS) {
                state.recentProjects = state.recentProjects.slice(0, MAX_RECENT_PROJECTS);
            }
        });
    },

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

    addToGitHubHistory: (url) => {
        set((state) => {
            // Remove existing occurrence if present (to move to top)
            const filtered = state.gitHubImportHistory.filter(u => u !== url);
            // Add to beginning and limit to 5 items
            state.gitHubImportHistory = [url, ...filtered].slice(0, 5);
        });
    },
});
