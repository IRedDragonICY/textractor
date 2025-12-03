/**
 * Store Creation
 * 
 * Combines all slices and applies middleware (persist + immer)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { AppStore } from './types';
import { createUISlice, createProjectSlice, createSessionSlice } from './slices';

// ============================================
// Store Creation with Combined Slices
// ============================================

export const useSessionStore = create<AppStore>()(
    persist(
        immer((...args) => ({
            // Combine all slices
            ...createUISlice(...args),
            ...createProjectSlice(...args),
            ...createSessionSlice(...args),
        })),
        {
            name: 'contextractor-session-store',
            storage: createJSONStorage(() => localStorage),
            // Only persist lightweight metadata - no heavy data!
            partialize: (state) => ({
                sessions: state.sessions,
                activeSessionId: state.activeSessionId,
                recentProjects: state.recentProjects,
                gitHubImportHistory: state.gitHubImportHistory,
                showHomeView: state.showHomeView,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
