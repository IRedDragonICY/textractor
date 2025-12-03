/**
 * UI Slice
 * 
 * Manages UI state: loading indicators, home view visibility, hydration status
 */

import type { StoreSlice, UISlice } from '../types';

export const createUISlice: StoreSlice<UISlice> = (set) => ({
    // Initial state
    isLoading: true,
    loadingProgress: 0,
    showHomeView: true,
    _hasHydrated: false,

    // Actions
    toggleHomeView: (show) => {
        set({ showHomeView: show });
    },

    setLoading: (isLoading) => {
        set({ isLoading });
    },

    setLoadingProgress: (progress) => {
        set({ loadingProgress: progress });
    },

    setHasHydrated: (hasHydrated) => {
        set({ _hasHydrated: hasHydrated, isLoading: !hasHydrated });
    },
});
