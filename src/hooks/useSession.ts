/**
 * useSession Hook - Zustand Store Wrapper
 * 
 * This hook provides a drop-in replacement for the old useSessionManager,
 * but uses the new Zustand store under the hood.
 * 
 * Key differences from the old implementation:
 * 1. No more React Context - just Zustand selectors
 * 2. File content is NOT stored in state - it's in IndexedDB
 * 3. Uses selectors to prevent unnecessary re-renders
 */

import {
    useSessionStore,
    useSessions,
    useActiveSession,
    useActiveSessionId,
    useRecentProjects,
    useShowHomeView,
    useIsLoading,
    useLoadingProgress,
    useSessionTabs,
    useHasHydrated,
    type SessionFileMeta,
    type SessionMeta,
    type RecentProjectMeta,
} from '@/store/sessionStore';

// ============================================
// Re-export types for consumers
// ============================================

export type { SessionFileMeta, SessionMeta, RecentProjectMeta };

// ============================================
// Main Hook (Compatibility Layer)
// ============================================

/**
 * Main session hook - provides all session management functionality
 * 
 * This is designed to be API-compatible with the old useSessionManager,
 * making migration easier. However, note these key differences:
 * 
 * 1. Files no longer contain `content` property - use useFileContent hook
 * 2. Some methods are now async (closeSession, addFilesToSession, etc.)
 * 3. Better performance due to Zustand selectors
 */
export const useSession = () => {
    // Use individual selectors instead of selecting entire store
    const sessions = useSessions();
    const activeSession = useActiveSession();
    const activeSessionId = useActiveSessionId();
    const recentProjects = useRecentProjects();
    const showHomeView = useShowHomeView();
    const isLoading = useIsLoading();
    const loadingProgress = useLoadingProgress();

    // Get actions (these are stable references)
    const actions = useSessionStore((state) => ({
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

    return {
        // State
        sessions,
        activeSession,
        activeSessionId,
        recentProjects,
        showHomeView,
        isLoading,
        loadingProgress,

        // Session actions
        ...actions,
    };
};

// ============================================
// Granular Hooks (Better Performance)
// ============================================

/**
 * Hook for components that only need session tabs (sidebar, tab bar)
 * Much more efficient than useSession for UI components
 */
export const useSessionTabsData = () => {
    const tabs = useSessionTabs();
    const actions = useSessionStore((state) => ({
        switchSession: state.switchSession,
        closeSession: state.closeSession,
        renameSession: state.renameSession,
        togglePinSession: state.togglePinSession,
        reorderSessions: state.reorderSessions,
        createSession: state.createSession,
    }));

    return { tabs, ...actions };
};

/**
 * Hook for components that only need file list for current session
 */
export const useCurrentSessionFiles = () => {
    const activeSessionId = useActiveSessionId();
    const files = useSessionStore((state) => {
        if (!state.activeSessionId) return [];
        const session = state.sessions.find(s => s.id === state.activeSessionId);
        return session?.files ?? [];
    });

    const actions = useSessionStore((state) => ({
        addFilesToSession: state.addFilesToSession,
        removeFileFromSession: state.removeFileFromSession,
        updateSessionFiles: state.updateSessionFiles,
    }));

    return {
        sessionId: activeSessionId,
        files,
        ...actions,
    };
};

/**
 * Hook for session settings (output style, view mode, etc.)
 */
export const useSessionSettings = (sessionId: string | null) => {
    const settings = useSessionStore((state) => {
        if (!sessionId) return null;
        const session = state.sessions.find(s => s.id === sessionId);
        if (!session) return null;
        return {
            outputStyle: session.outputStyle,
            viewMode: session.viewMode,
            codeProcessingMode: session.codeProcessingMode,
        };
    });

    const updateSettings = useSessionStore((state) => state.updateSessionSettings);

    return {
        settings,
        updateSettings: (newSettings: Parameters<typeof updateSettings>[1]) => {
            if (sessionId) updateSettings(sessionId, newSettings);
        },
    };
};

/**
 * Hook for home view with recent projects
 */
export const useHomeView = () => {
    const showHomeView = useShowHomeView();
    const recentProjects = useRecentProjects();
    const isLoading = useIsLoading();
    const hasHydrated = useHasHydrated();

    const actions = useSessionStore((state) => ({
        openRecentProject: state.openRecentProject,
        removeRecentProject: state.removeRecentProject,
        clearRecentProjects: state.clearRecentProjects,
        togglePinRecentProject: state.togglePinRecentProject,
        toggleHomeView: state.toggleHomeView,
        createSession: state.createSession,
    }));

    return {
        showHomeView,
        recentProjects,
        isLoading: isLoading && !hasHydrated,
        ...actions,
    };
};

// ============================================
// Store Hydration Check
// ============================================

/**
 * Hook to check if the store has been hydrated from localStorage
 * Use this to show loading states on initial app load
 */
export const useStoreHydration = () => {
    const hasHydrated = useHasHydrated();
    const isLoading = useIsLoading();
    const loadingProgress = useLoadingProgress();

    return {
        hasHydrated,
        isLoading: isLoading && !hasHydrated,
        loadingProgress,
    };
};
