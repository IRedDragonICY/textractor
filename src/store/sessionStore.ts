/**
 * Session Store - Backward Compatibility Re-exports
 * 
 * This file maintains backward compatibility with existing imports.
 * The actual store implementation has been refactored into slices.
 * 
 * @deprecated Import from '@/store' instead
 */

// Re-export everything from the new modular structure
export {
    useSessionStore,
    // Types
    type SessionFileMeta,
    type SessionMeta,
    type RecentProjectMeta,
    // Selectors
    useSessions,
    useActiveSessionId,
    useActiveSession,
    useSession,
    useSessionFiles,
    useRecentProjects,
    useGitHubImportHistory,
    useShowHomeView,
    useIsLoading,
    useLoadingProgress,
    useHasHydrated,
    useSessionCount,
    useSessionTabs,
    // Actions
    useSessionActions,
    // Content utilities
    getAllSessionContent,
    getFilesContentBulk,
} from './index';
