/**
 * IndexedDB Storage Layer for Heavy File Content
 *
 * Implements a repository pattern to enforce strict separation between
 * heavy content (strings) and light metadata (JSON). Only explicit content
 * loaders return the content field to avoid accidental OOMs in the UI thread.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SessionFileMeta } from '@/store/types';

export interface StoredContent {
    sessionId: string;
    fileId: string;
    content: string;
    size: number;
    updatedAt: number;
}

export type StoredContentHeader = Omit<StoredContent, 'content'>;
export type StoredMetadata = SessionFileMeta;

interface ContentDBSchema extends DBSchema {
    fileContents: {
        key: string; // Composite key: `${sessionId}:${fileId}`
        value: StoredContent;
        indexes: {
            'by-session': string;
        };
    };
    // Bulk storage for entire session content (kept for forward-compatibility)
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

class ContentRepository {
    async saveContent(
        sessionId: string,
        fileId: string,
        content: string
    ): Promise<void> {
        try {
            const db = await getDB();
            const tx = db.transaction('fileContents', 'readwrite');
            const store = tx.objectStore('fileContents');
            const now = Date.now();

            await store.put(
                {
                    sessionId,
                    fileId,
                    content,
                    size: content.length,
                    updatedAt: now,
                },
                getContentKey(sessionId, fileId)
            );

            await tx.done;
        } catch (error) {
            console.error('Failed to save file content:', error);
            throw error;
        }
    }

    async saveFilesContentBulk(
        sessionId: string,
        files: Array<{ fileId: string; content: string }>
    ): Promise<void> {
        if (files.length === 0) return;

        try {
            const db = await getDB();
            const tx = db.transaction('fileContents', 'readwrite');
            const store = tx.objectStore('fileContents');
            const now = Date.now();

            for (const { fileId, content } of files) {
                await store.put(
                    {
                        sessionId,
                        fileId,
                        content,
                        size: content.length,
                        updatedAt: now,
                    },
                    getContentKey(sessionId, fileId)
                );
            }

            await tx.done;
        } catch (error) {
            console.error('Failed to save files content bulk:', error);
            throw error;
        }
    }

    async loadContentOnly(
        sessionId: string,
        fileId: string
    ): Promise<string | undefined> {
        try {
            const db = await getDB();
            const record = await db.get('fileContents', getContentKey(sessionId, fileId));
            return record?.content;
        } catch (error) {
            console.error('Failed to load file content:', error);
            return undefined;
        }
    }

    async loadContentRecord(
        sessionId: string,
        fileId: string
    ): Promise<StoredContent | undefined> {
        try {
            const db = await getDB();
            return db.get('fileContents', getContentKey(sessionId, fileId));
        } catch (error) {
            console.error('Failed to load content record:', error);
            return undefined;
        }
    }

    async getContentMetadata(
        sessionId: string,
        fileId: string
    ): Promise<StoredContentHeader | undefined> {
        const record = await this.loadContentRecord(sessionId, fileId);
        if (!record) return undefined;
        return (({ content, ...meta }) => {
            void content; // explicitly discard heavy content
            return meta;
        })(record);
    }

    async listSessionContentMetadata(sessionId: string): Promise<StoredContentHeader[]> {
        try {
            const db = await getDB();
            const tx = db.transaction('fileContents', 'readonly');
            const index = tx.objectStore('fileContents').index('by-session');

            const results: StoredContentHeader[] = [];
            let cursor = await index.openCursor(IDBKeyRange.only(sessionId));

            while (cursor) {
                const rest = (({ content, ...meta }) => {
                    void content; // explicitly discard heavy content
                    return meta;
                })(cursor.value);
                results.push(rest);
                cursor = await cursor.continue();
            }

            await tx.done;
            return results;
        } catch (error) {
            console.error('Failed to list session content metadata:', error);
            return [];
        }
    }

    async getFilesContentBulk(
        sessionId: string,
        fileIds: string[]
    ): Promise<Map<string, string>> {
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

            await tx.done;

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
    }

    async getAllSessionContent(sessionId: string): Promise<Map<string, string>> {
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

            await tx.done;
            return contentMap;
        } catch (error) {
            console.error('Failed to get all session content:', error);
            return new Map();
        }
    }

    async deleteFileContent(sessionId: string, fileId: string): Promise<void> {
        try {
            const db = await getDB();
            const tx = db.transaction('fileContents', 'readwrite');
            await tx.objectStore('fileContents').delete(getContentKey(sessionId, fileId));
            await tx.done;
        } catch (error) {
            console.error('Failed to delete file content:', error);
            throw error;
        }
    }

    async deleteFilesContentBulk(sessionId: string, fileIds: string[]): Promise<void> {
        if (fileIds.length === 0) return;

        try {
            const db = await getDB();
            const tx = db.transaction('fileContents', 'readwrite');
            const store = tx.objectStore('fileContents');

            for (const fileId of fileIds) {
                await store.delete(getContentKey(sessionId, fileId));
            }

            await tx.done;
        } catch (error) {
            console.error('Failed to delete files content bulk:', error);
            throw error;
        }
    }

    async deleteSessionData(sessionId: string): Promise<void> {
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
    }

    async hasFileContent(sessionId: string, fileId: string): Promise<boolean> {
        try {
            const db = await getDB();
            const count = await db.count('fileContents', getContentKey(sessionId, fileId));
            return count > 0;
        } catch (error) {
            console.error('Failed to check file content:', error);
            return false;
        }
    }

    async getStorageStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        sessionCount: number;
    }> {
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

            await tx.done;

            return {
                totalFiles,
                totalSize,
                sessionCount: sessions.size,
            };
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            return { totalFiles: 0, totalSize: 0, sessionCount: 0 };
        }
    }

    async clearAllContent(): Promise<void> {
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
    }

    async copySessionContent(
        fromSessionId: string,
        toSessionId: string,
        fileIdMapping?: Map<string, string> // old fileId -> new fileId
    ): Promise<void> {
        try {
            const db = await getDB();
            const tx = db.transaction('fileContents', 'readwrite');
            const store = tx.objectStore('fileContents');
            const index = store.index('by-session');
            const now = Date.now();

            let cursor = await index.openCursor(IDBKeyRange.only(fromSessionId));
            while (cursor) {
                const newFileId = fileIdMapping?.get(cursor.value.fileId) ?? cursor.value.fileId;
                const content = cursor.value.content;

                await store.put(
                    {
                        sessionId: toSessionId,
                        fileId: newFileId,
                        content,
                        size: content.length,
                        updatedAt: now,
                    },
                    getContentKey(toSessionId, newFileId)
                );

                cursor = await cursor.continue();
            }

            await tx.done;
        } catch (error) {
            console.error('Failed to copy session content:', error);
            throw error;
        }
    }
}

const contentRepository = new ContentRepository();

// ============================================
// Public API (type-safe wrappers)
// ============================================

export const saveFileContent = (
    sessionId: string,
    fileId: string,
    content: string
): Promise<void> => contentRepository.saveContent(sessionId, fileId, content);

export const saveFilesContentBulk = (
    sessionId: string,
    files: Array<{ fileId: string; content: string }>
): Promise<void> => contentRepository.saveFilesContentBulk(sessionId, files);

export const getFileContent = (
    sessionId: string,
    fileId: string
): Promise<string | undefined> => contentRepository.loadContentOnly(sessionId, fileId);

export const loadContentOnly = (
    sessionId: string,
    fileId: string
): Promise<string | undefined> => contentRepository.loadContentOnly(sessionId, fileId);

export const getFilesContentBulk = (
    sessionId: string,
    fileIds: string[]
): Promise<Map<string, string>> => contentRepository.getFilesContentBulk(sessionId, fileIds);

export const getAllSessionContent = (
    sessionId: string
): Promise<Map<string, string>> => contentRepository.getAllSessionContent(sessionId);

export const deleteFileContent = (
    sessionId: string,
    fileId: string
): Promise<void> => contentRepository.deleteFileContent(sessionId, fileId);

export const deleteFilesContentBulk = (
    sessionId: string,
    fileIds: string[]
): Promise<void> => contentRepository.deleteFilesContentBulk(sessionId, fileIds);

export const deleteSessionData = (sessionId: string): Promise<void> =>
    contentRepository.deleteSessionData(sessionId);

export const hasFileContent = (
    sessionId: string,
    fileId: string
): Promise<boolean> => contentRepository.hasFileContent(sessionId, fileId);

export const getStorageStats = (): Promise<{
    totalFiles: number;
    totalSize: number;
    sessionCount: number;
}> => contentRepository.getStorageStats();

export const clearAllContent = (): Promise<void> => contentRepository.clearAllContent();

export const copySessionContent = (
    fromSessionId: string,
    toSessionId: string,
    fileIdMapping?: Map<string, string> // old fileId -> new fileId
): Promise<void> =>
    contentRepository.copySessionContent(fromSessionId, toSessionId, fileIdMapping);

export const listSessionContentMetadata = (
    sessionId: string
): Promise<StoredContentHeader[]> =>
    contentRepository.listSessionContentMetadata(sessionId);

export const getContentMetadata = (
    sessionId: string,
    fileId: string
): Promise<StoredContentHeader | undefined> =>
    contentRepository.getContentMetadata(sessionId, fileId);
