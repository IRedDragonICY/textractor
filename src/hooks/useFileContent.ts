/**
 * useFileContent Hook
 * 
 * Fetches heavy file content from IndexedDB on-demand.
 * Only loads content when a file is being viewed/processed,
 * preventing OOM issues from loading all content at once.
 * 
 * Features:
 * - Lazy loading with caching
 * - Loading/error states
 * - Automatic cache invalidation
 * - Supports single and bulk content fetching
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
    getFileContent, 
    getFilesContentBulk, 
    getAllSessionContent,
    saveFileContent,
} from '@/lib/storage';

// ============================================
// Types
// ============================================

interface FileContentState {
    content: string | undefined;
    isLoading: boolean;
    error: Error | null;
}

interface BulkContentState {
    contents: Map<string, string>;
    isLoading: boolean;
    error: Error | null;
    loadedCount: number;
    totalCount: number;
}

// ============================================
// In-Memory Content Cache
// ============================================

// LRU-style cache to avoid repeated IndexedDB lookups
const contentCache = new Map<string, { content: string; timestamp: number }>();
const MAX_CACHE_SIZE = 50; // Keep last 50 files in memory
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (sessionId: string, fileId: string) => `${sessionId}:${fileId}`;

const getCachedContent = (sessionId: string, fileId: string): string | undefined => {
    const key = getCacheKey(sessionId, fileId);
    const cached = contentCache.get(key);
    
    if (!cached) return undefined;
    
    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        contentCache.delete(key);
        return undefined;
    }
    
    return cached.content;
};

const setCachedContent = (sessionId: string, fileId: string, content: string): void => {
    const key = getCacheKey(sessionId, fileId);
    
    // Enforce cache size limit (remove oldest entries)
    if (contentCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = contentCache.keys().next().value;
        if (oldestKey) contentCache.delete(oldestKey);
    }
    
    contentCache.set(key, { content, timestamp: Date.now() });
};

const invalidateCache = (sessionId: string, fileId?: string): void => {
    if (fileId) {
        contentCache.delete(getCacheKey(sessionId, fileId));
    } else {
        // Invalidate all entries for this session
        for (const key of contentCache.keys()) {
            if (key.startsWith(`${sessionId}:`)) {
                contentCache.delete(key);
            }
        }
    }
};

// ============================================
// Single File Content Hook
// ============================================

/**
 * Fetch content for a single file
 * Use this when viewing/editing a specific file
 */
export const useFileContent = (
    sessionId: string | null,
    fileId: string | null
): FileContentState & { 
    refetch: () => Promise<void>;
    updateContent: (newContent: string) => Promise<void>;
} => {
    const [state, setState] = useState<FileContentState>({
        content: undefined,
        isLoading: false,
        error: null,
    });
    
    const isMountedRef = useRef(true);
    const fetchIdRef = useRef(0);

    const fetchContent = useCallback(async () => {
        if (!sessionId || !fileId) {
            setState({ content: undefined, isLoading: false, error: null });
            return;
        }

        // Check cache first
        const cached = getCachedContent(sessionId, fileId);
        if (cached !== undefined) {
            setState({ content: cached, isLoading: false, error: null });
            return;
        }

        const currentFetchId = ++fetchIdRef.current;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const content = await getFileContent(sessionId, fileId);
            
            // Only update if this is still the latest fetch and component is mounted
            if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
                if (content !== undefined) {
                    setCachedContent(sessionId, fileId, content);
                }
                setState({ content, isLoading: false, error: null });
            }
        } catch (err) {
            if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
                setState({ 
                    content: undefined, 
                    isLoading: false, 
                    error: err instanceof Error ? err : new Error('Failed to load content') 
                });
            }
        }
    }, [sessionId, fileId]);

    const updateContent = useCallback(async (newContent: string) => {
        if (!sessionId || !fileId) return;
        
        try {
            await saveFileContent(sessionId, fileId, newContent);
            setCachedContent(sessionId, fileId, newContent);
            setState(prev => ({ ...prev, content: newContent }));
        } catch (err) {
            console.error('Failed to save content:', err);
            throw err;
        }
    }, [sessionId, fileId]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchContent();
        
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchContent]);

    return {
        ...state,
        refetch: fetchContent,
        updateContent,
    };
};

// ============================================
// Bulk File Content Hook
// ============================================

/**
 * Fetch content for multiple files
 * Use this for export/processing operations
 */
export const useBulkFileContent = (
    sessionId: string | null,
    fileIds: string[]
): BulkContentState & { refetch: () => Promise<void> } => {
    const [state, setState] = useState<BulkContentState>({
        contents: new Map(),
        isLoading: false,
        error: null,
        loadedCount: 0,
        totalCount: fileIds.length,
    });

    const isMountedRef = useRef(true);
    const fetchIdRef = useRef(0);

    const fetchContents = useCallback(async () => {
        if (!sessionId || fileIds.length === 0) {
            setState({
                contents: new Map(),
                isLoading: false,
                error: null,
                loadedCount: 0,
                totalCount: 0,
            });
            return;
        }

        const currentFetchId = ++fetchIdRef.current;
        setState(prev => ({ 
            ...prev, 
            isLoading: true, 
            error: null,
            totalCount: fileIds.length,
        }));

        try {
            // Check cache for already loaded content
            const cachedContents = new Map<string, string>();
            const uncachedIds: string[] = [];

            for (const fileId of fileIds) {
                const cached = getCachedContent(sessionId, fileId);
                if (cached !== undefined) {
                    cachedContents.set(fileId, cached);
                } else {
                    uncachedIds.push(fileId);
                }
            }

            // Update with cached content immediately
            if (cachedContents.size > 0 && isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    contents: new Map([...prev.contents, ...cachedContents]),
                    loadedCount: cachedContents.size,
                }));
            }

            // Fetch uncached content from IndexedDB
            if (uncachedIds.length > 0) {
                const fetchedContents = await getFilesContentBulk(sessionId, uncachedIds);
                
                // Cache the fetched content
                for (const [fileId, content] of fetchedContents) {
                    setCachedContent(sessionId, fileId, content);
                }

                if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
                    const allContents = new Map([...cachedContents, ...fetchedContents]);
                    setState({
                        contents: allContents,
                        isLoading: false,
                        error: null,
                        loadedCount: allContents.size,
                        totalCount: fileIds.length,
                    });
                }
            } else {
                // All content was cached
                if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
                    setState({
                        contents: cachedContents,
                        isLoading: false,
                        error: null,
                        loadedCount: cachedContents.size,
                        totalCount: fileIds.length,
                    });
                }
            }
        } catch (err) {
            if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: err instanceof Error ? err : new Error('Failed to load contents'),
                }));
            }
        }
    }, [sessionId, fileIds]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchContents();
        
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchContents]);

    return {
        ...state,
        refetch: fetchContents,
    };
};

// ============================================
// Session Content Hook
// ============================================

/**
 * Fetch all content for a session
 * Use this sparingly - only for full export
 */
export const useSessionContent = (
    sessionId: string | null
): BulkContentState & { refetch: () => Promise<void> } => {
    const [state, setState] = useState<BulkContentState>({
        contents: new Map(),
        isLoading: false,
        error: null,
        loadedCount: 0,
        totalCount: 0,
    });

    const isMountedRef = useRef(true);
    const fetchIdRef = useRef(0);

    const fetchContents = useCallback(async () => {
        if (!sessionId) {
            setState({
                contents: new Map(),
                isLoading: false,
                error: null,
                loadedCount: 0,
                totalCount: 0,
            });
            return;
        }

        const currentFetchId = ++fetchIdRef.current;
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const contents = await getAllSessionContent(sessionId);
            
            // Cache all fetched content
            for (const [fileId, content] of contents) {
                setCachedContent(sessionId, fileId, content);
            }

            if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
                setState({
                    contents,
                    isLoading: false,
                    error: null,
                    loadedCount: contents.size,
                    totalCount: contents.size,
                });
            }
        } catch (err) {
            if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: err instanceof Error ? err : new Error('Failed to load session content'),
                }));
            }
        }
    }, [sessionId]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchContents();
        
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchContents]);

    return {
        ...state,
        refetch: fetchContents,
    };
};

// ============================================
// Utility Exports
// ============================================

export { invalidateCache };

/**
 * Preload content for files (call this before user needs to view)
 * Useful for predictive loading based on user behavior
 */
export const preloadFileContent = async (
    sessionId: string,
    fileIds: string[]
): Promise<void> => {
    const uncachedIds = fileIds.filter(
        fileId => getCachedContent(sessionId, fileId) === undefined
    );
    
    if (uncachedIds.length === 0) return;
    
    try {
        const contents = await getFilesContentBulk(sessionId, uncachedIds);
        for (const [fileId, content] of contents) {
            setCachedContent(sessionId, fileId, content);
        }
    } catch (err) {
        console.error('Failed to preload content:', err);
    }
};

/**
 * Get content synchronously if cached (returns undefined if not cached)
 * Use this for immediate access when you know content might be cached
 */
export const getCachedFileContent = (
    sessionId: string,
    fileId: string
): string | undefined => getCachedContent(sessionId, fileId);
