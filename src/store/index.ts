/**
 * Store Exports
 * 
 * Central export point for all Zustand stores and related utilities.
 * Maintains backward compatibility with existing component imports.
 */

// Re-export the store
export { useSessionStore } from './createStore';

import type { AppStore } from './types';

// Re-export types
export type {
    SessionFileMeta,
    SessionMeta,
    RecentProjectMeta,
    UISlice,
    ProjectSlice,
    SessionSlice,
    TemplateSlice,
    AppStore,
    StoreSlice,
} from './types';

// Re-export content utilities from storage
export { getAllSessionContent, getFilesContentBulk } from '@/lib/storage';

// ============================================
// Selectors (Prevents unnecessary re-renders!)
// ============================================

import { useSessionStore } from './createStore';

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

/** Get GitHub import history */
export const useGitHubImportHistory = () => useSessionStore((state) => state.gitHubImportHistory);

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

/** Get template state */
export const useTemplateState = () => {
    const customTemplates = useSessionStore((state: AppStore) => state.customTemplates);
    const selectedTemplateId = useSessionStore((state: AppStore) => state.selectedTemplateId);
    return { customTemplates, selectedTemplateId };
};

// ============================================
// Actions (stable references, no re-renders)
// ============================================

export const useSessionActions = () => useSessionStore((state) => ({
    // Session actions
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
    reorderSessions: state.reorderSessions,
    openSettingsTab: state.openSettingsTab,
    openReportIssueTab: state.openReportIssueTab,
    // Project actions
    openRecentProject: state.openRecentProject,
    removeRecentProject: state.removeRecentProject,
    clearRecentProjects: state.clearRecentProjects,
    togglePinRecentProject: state.togglePinRecentProject,
    addToGitHubHistory: state.addToGitHubHistory,
    // UI actions
    toggleHomeView: state.toggleHomeView,
}));

export const useTemplateActions = () => {
    const addCustomTemplate = useSessionStore((state: AppStore) => state.addCustomTemplate);
    const updateCustomTemplate = useSessionStore((state: AppStore) => state.updateCustomTemplate);
    const removeCustomTemplate = useSessionStore((state: AppStore) => state.removeCustomTemplate);
    const setSelectedTemplate = useSessionStore((state: AppStore) => state.setSelectedTemplate);
    return {
        addCustomTemplate,
        updateCustomTemplate,
        removeCustomTemplate,
        setSelectedTemplate,
    };
};

// ============================================
// Granular Action Hooks (for components that only need specific actions)
// ============================================

/** Get only UI-related actions */
export const useUIActions = () => useSessionStore((state) => ({
    toggleHomeView: state.toggleHomeView,
    setLoading: state.setLoading,
    setLoadingProgress: state.setLoadingProgress,
}));

/** Get only project-related actions */
export const useProjectActions = () => useSessionStore((state) => ({
    openRecentProject: state.openRecentProject,
    removeRecentProject: state.removeRecentProject,
    clearRecentProjects: state.clearRecentProjects,
    togglePinRecentProject: state.togglePinRecentProject,
    addToGitHubHistory: state.addToGitHubHistory,
}));
