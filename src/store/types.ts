/**
 * Store Types
 * 
 * Shared interface definitions for the Zustand store slices
 */

import type { StateCreator } from 'zustand';
import type { 
    OutputStyleType, 
    ViewModeType, 
    CodeProcessingModeType 
} from '@/types/session';
import type { FileData } from '@/types';

// ============================================
// Data Types (Metadata Only - No Content!)
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
// Slice State Interfaces
// ============================================

export interface UISliceState {
    isLoading: boolean;
    loadingProgress: number;
    showHomeView: boolean;
    _hasHydrated: boolean;
}

export interface UISliceActions {
    toggleHomeView: (show: boolean) => void;
    setLoading: (isLoading: boolean) => void;
    setLoadingProgress: (progress: number) => void;
    setHasHydrated: (hasHydrated: boolean) => void;
}

export type UISlice = UISliceState & UISliceActions;

// ============================================

export interface ProjectSliceState {
    recentProjects: RecentProjectMeta[];
    gitHubImportHistory: string[];
}

export interface ProjectSliceActions {
    openRecentProject: (projectId: string) => void;
    removeRecentProject: (projectId: string) => Promise<void>;
    clearRecentProjects: () => Promise<void>;
    togglePinRecentProject: (projectId: string) => void;
    addOrUpdateRecentProject: (session: SessionMeta, existingProjectId?: string) => void;
    addToGitHubHistory: (url: string) => void;
}

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

// ============================================

export interface SessionSliceState {
    sessions: SessionMeta[];
    activeSessionId: string | null;
}

export interface SessionSliceActions {
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
    
    // UI-related session actions
    reorderSessions: (fromIndex: number, toIndex: number) => void;
    openSettingsTab: () => void;
    openReportIssueTab: () => void;
}

export type SessionSlice = SessionSliceState & SessionSliceActions;

// ============================================
// Combined App Store
// ============================================

export type AppStore = UISlice & ProjectSlice & SessionSlice;

// ============================================
// Slice Creator Type Helper
// ============================================

/**
 * Type helper for creating slices with immer and persist middleware
 * Usage: const createMySlice: StoreSlice<MySlice> = (set, get, store) => ({ ... })
 */
export type StoreSlice<T> = StateCreator<
    AppStore,
    [['zustand/immer', never], ['zustand/persist', unknown]],
    [],
    T
>;
