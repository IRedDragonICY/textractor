/**
 * IndexedDB Storage Layer for Heavy File Content
 * 
 * This module handles the storage of file content separately from metadata.
 * File content is stored in IndexedDB to avoid OOM issues with large codebases,
 * while lightweight metadata stays in the Zustand store (localStorage).
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema for type safety
interface ContentDBSchema extends DBSchema {
    fileContents: {
        key: string; // Composite key: `${sessionId}:${fileId}`
        value: {
            sessionId: string;
            fileId: string;
            content: string;
            size: number;
            updatedAt: number;
        };
        indexes: {
            'by-session': string;
        };
    };
    // Bulk storage for entire session content (faster restore)
    sessionBulk: {
        key: string; // sessionId
        value: {
            sessionId: string;
            files: Map<string, string>; // fileId -> content
            updatedAt: number;
        };
    };
}

const DB_NAME = 'ContextractorContentDB';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ContentDBSchema> | null = null;
let dbPromise: Promise<IDBPDatabase<ContentDBSchema>> | null = null;

/**
 * Initialize or get the IndexedDB database instance
 * Uses singleton pattern to avoid multiple connections
 */
const getDB = async (): Promise<IDBPDatabase<ContentDBSchema>> => {
    if (dbInstance) return dbInstance;
    
    if (dbPromise) return dbPromise;
    
    dbPromise = openDB<ContentDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Create fileContents store with session index
            if (!db.objectStoreNames.contains('fileContents')) {
                const store = db.createObjectStore('fileContents', {
                    keyPath: undefined, // We'll use explicit keys
                });
                store.createIndex('by-session', 'sessionId');
            }
            
            // Create bulk session store for faster operations
            if (!db.objectStoreNames.contains('sessionBulk')) {
                db.createObjectStore('sessionBulk');
            }
        },
        blocked() {
            console.warn('IndexedDB blocked - close other tabs');
        },
        blocking() {
            // Close our connection so the new version can proceed
            dbInstance?.close();
            dbInstance = null;
        },
        terminated() {
            dbInstance = null;
            dbPromise = null;
        },
    });
    
    dbInstance = await dbPromise;
    return dbInstance;
};

/**
 * Generate composite key for file content
 */
const getContentKey = (sessionId: string, fileId: string): string => {
    return `${sessionId}:${fileId}`;
};

// ============================================
// Core Storage Functions
// ============================================

/**
 * Save file content to IndexedDB
 * Optimized for individual file updates during editing
 */
export const saveFileContent = async (
    sessionId: string,
    fileId: string,
    content: string
): Promise<void> => {
    try {
        const db = await getDB();
        const key = getContentKey(sessionId, fileId);
        
        await db.put('fileContents', {
            sessionId,
            fileId,
            content,
            size: content.length,
            updatedAt: Date.now(),
        }, key);
    } catch (error) {
        console.error('Failed to save file content:', error);
        throw error;
    }
};

/**
 * Get file content from IndexedDB
 * Returns undefined if not found
 */
export const getFileContent = async (
    sessionId: string,
    fileId: string
): Promise<string | undefined> => {
    try {
        const db = await getDB();
        const key = getContentKey(sessionId, fileId);
        const record = await db.get('fileContents', key);
        return record?.content;
    } catch (error) {
        console.error('Failed to get file content:', error);
        return undefined;
    }
};

/**
 * Delete all content for a session
 * Used when closing/deleting a session
 */
export const deleteSessionData = async (sessionId: string): Promise<void> => {
    try {
        const db = await getDB();
        const tx = db.transaction(['fileContents', 'sessionBulk'], 'readwrite');
        
        // Delete individual file contents using index
        const contentStore = tx.objectStore('fileContents');
        const index = contentStore.index('by-session');
        
        let cursor = await index.openCursor(IDBKeyRange.only(sessionId));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        
        // Delete bulk session data
        await tx.objectStore('sessionBulk').delete(sessionId);
        
        await tx.done;
    } catch (error) {
        console.error('Failed to delete session data:', error);
        throw error;
    }
};

/**
 * Delete specific file content
 */
export const deleteFileContent = async (
    sessionId: string,
    fileId: string
): Promise<void> => {
    try {
        const db = await getDB();
        const key = getContentKey(sessionId, fileId);
        await db.delete('fileContents', key);
    } catch (error) {
        console.error('Failed to delete file content:', error);
        throw error;
    }
};

// ============================================
// Batch Operations (Performance Critical)
// ============================================

/**
 * Save multiple file contents in a single transaction
 * Much faster than individual saves for bulk operations
 */
export const saveFilesContentBulk = async (
    sessionId: string,
    files: Array<{ fileId: string; content: string }>
): Promise<void> => {
    if (files.length === 0) return;
    
    try {
        const db = await getDB();
        const tx = db.transaction('fileContents', 'readwrite');
        const store = tx.objectStore('fileContents');
        const now = Date.now();
        
        await Promise.all(
            files.map(({ fileId, content }) =>
                store.put({
                    sessionId,
                    fileId,
                    content,
                    size: content.length,
                    updatedAt: now,
                }, getContentKey(sessionId, fileId))
            )
        );
        
        await tx.done;
    } catch (error) {
        console.error('Failed to save files content bulk:', error);
        throw error;
    }
};

/**
 * Get multiple file contents in a single transaction
 * Returns a Map of fileId -> content
 */
export const getFilesContentBulk = async (
    sessionId: string,
    fileIds: string[]
): Promise<Map<string, string>> => {
    if (fileIds.length === 0) return new Map();
    
    try {
        const db = await getDB();
        const tx = db.transaction('fileContents', 'readonly');
        const store = tx.objectStore('fileContents');
        
        const results = await Promise.all(
            fileIds.map(async (fileId) => {
                const record = await store.get(getContentKey(sessionId, fileId));
                return [fileId, record?.content] as const;
            })
        );
        
        const contentMap = new Map<string, string>();
        for (const [fileId, content] of results) {
            if (content !== undefined) {
                contentMap.set(fileId, content);
            }
        }
        
        return contentMap;
    } catch (error) {
        console.error('Failed to get files content bulk:', error);
        return new Map();
    }
};

/**
 * Get all file contents for a session
 * Useful for export/restore operations
 */
export const getAllSessionContent = async (
    sessionId: string
): Promise<Map<string, string>> => {
    try {
        const db = await getDB();
        const tx = db.transaction('fileContents', 'readonly');
        const index = tx.objectStore('fileContents').index('by-session');
        
        const contentMap = new Map<string, string>();
        let cursor = await index.openCursor(IDBKeyRange.only(sessionId));
        
        while (cursor) {
            contentMap.set(cursor.value.fileId, cursor.value.content);
            cursor = await cursor.continue();
        }
        
        return contentMap;
    } catch (error) {
        console.error('Failed to get all session content:', error);
        return new Map();
    }
};

/**
 * Delete multiple file contents
 */
export const deleteFilesContentBulk = async (
    sessionId: string,
    fileIds: string[]
): Promise<void> => {
    if (fileIds.length === 0) return;
    
    try {
        const db = await getDB();
        const tx = db.transaction('fileContents', 'readwrite');
        const store = tx.objectStore('fileContents');
        
        await Promise.all(
            fileIds.map((fileId) =>
                store.delete(getContentKey(sessionId, fileId))
            )
        );
        
        await tx.done;
    } catch (error) {
        console.error('Failed to delete files content bulk:', error);
        throw error;
    }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Check if content exists for a file
 */
export const hasFileContent = async (
    sessionId: string,
    fileId: string
): Promise<boolean> => {
    try {
        const db = await getDB();
        const key = getContentKey(sessionId, fileId);
        const count = await db.count('fileContents', key);
        return count > 0;
    } catch (error) {
        console.error('Failed to check file content:', error);
        return false;
    }
};

/**
 * Get storage statistics
 */
export const getStorageStats = async (): Promise<{
    totalFiles: number;
    totalSize: number;
    sessionCount: number;
}> => {
    try {
        const db = await getDB();
        const tx = db.transaction('fileContents', 'readonly');
        const store = tx.objectStore('fileContents');
        
        let totalSize = 0;
        const sessions = new Set<string>();
        let cursor = await store.openCursor();
        let totalFiles = 0;
        
        while (cursor) {
            totalFiles++;
            totalSize += cursor.value.size;
            sessions.add(cursor.value.sessionId);
            cursor = await cursor.continue();
        }
        
        return {
            totalFiles,
            totalSize,
            sessionCount: sessions.size,
        };
    } catch (error) {
        console.error('Failed to get storage stats:', error);
        return { totalFiles: 0, totalSize: 0, sessionCount: 0 };
    }
};

/**
 * Clear all stored content (use with caution!)
 */
export const clearAllContent = async (): Promise<void> => {
    try {
        const db = await getDB();
        const tx = db.transaction(['fileContents', 'sessionBulk'], 'readwrite');
        await tx.objectStore('fileContents').clear();
        await tx.objectStore('sessionBulk').clear();
        await tx.done;
    } catch (error) {
        console.error('Failed to clear all content:', error);
        throw error;
    }
};

// ============================================
// Content Migration Helpers
// ============================================

/**
 * Migrate content from one session to another
 * Useful for duplicating sessions
 */
export const copySessionContent = async (
    fromSessionId: string,
    toSessionId: string,
    fileIdMapping?: Map<string, string> // old fileId -> new fileId
): Promise<void> => {
    try {
        const content = await getAllSessionContent(fromSessionId);
        
        if (content.size === 0) return;
        
        const filesToSave: Array<{ fileId: string; content: string }> = [];
        
        for (const [oldFileId, fileContent] of content) {
            const newFileId = fileIdMapping?.get(oldFileId) ?? oldFileId;
            filesToSave.push({ fileId: newFileId, content: fileContent });
        }
        
        await saveFilesContentBulk(toSessionId, filesToSave);
    } catch (error) {
        console.error('Failed to copy session content:', error);
        throw error;
    }
};
