/**
 * Migration Guide: Using the New Split Storage Architecture
 * 
 * This file demonstrates how to migrate from the old useSessionManager
 * to the new Zustand + IndexedDB architecture.
 * 
 * BEFORE: Everything in React Context (causes OOM)
 * AFTER: Metadata in Zustand, Content in IndexedDB
 */

import React, { useCallback } from 'react';
import type { FileData } from '@/types';
import { useSession, useCurrentSessionFiles } from '@/hooks/useSession';
import { useFileContent, useBulkFileContent } from '@/hooks/useFileContent';
import { useSessionStore, type SessionFileMeta } from '@/store/sessionStore';

// ============================================
// Example 1: Adding Files (Main Use Case)
// ============================================

/**
 * OLD WAY - Content stored in state (BAD for memory)
 * 
 * const { activeSession, updateSessionFiles } = useSessionManager();
 * const handleAddFiles = (newFiles: FileData[]) => {
 *     const sessionFiles = newFiles.map(f => ({
 *         ...f,
 *         content: f.content, // <-- This was stored in React state!
 *     }));
 *     updateSessionFiles(activeSession.id, [...activeSession.files, ...sessionFiles]);
 * };
 */

/**
 * NEW WAY - Content goes to IndexedDB automatically
 */
export const useAddFiles = () => {
    const activeSessionId = useSessionStore(state => state.activeSessionId);
    const addFilesToSession = useSessionStore(state => state.addFilesToSession);

    const handleAddFiles = useCallback(async (newFiles: FileData[]) => {
        if (!activeSessionId) {
            console.error('No active session');
            return;
        }

        // addFilesToSession automatically:
        // 1. Extracts content from FileData
        // 2. Saves content to IndexedDB (async)
        // 3. Stores only metadata in Zustand store
        await addFilesToSession(activeSessionId, newFiles);
    }, [activeSessionId, addFilesToSession]);

    return handleAddFiles;
};

// ============================================
// Example 2: Viewing a Single File
// ============================================

/**
 * OLD WAY - Content directly from session state
 * 
 * const FileViewer = ({ file }: { file: SessionFile }) => {
 *     return <pre>{file.content}</pre>; // Content was always in memory
 * };
 */

/**
 * NEW WAY - Content loaded on-demand from IndexedDB
 */
export const FileViewer: React.FC<{ 
    sessionId: string; 
    file: SessionFileMeta; 
}> = ({ sessionId, file }) => {
    const { content, isLoading, error } = useFileContent(sessionId, file.id);

    if (isLoading) {
        return <div className="animate-pulse">Loading {file.name}...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error loading file: {error.message}</div>;
    }

    if (!content) {
        return <div className="text-gray-500">No content available</div>;
    }

    return (
        <pre className="overflow-auto">
            <code>{content}</code>
        </pre>
    );
};

// ============================================
// Example 3: Exporting/Processing Multiple Files
// ============================================

/**
 * OLD WAY - All content already in memory
 * 
 * const { activeSession } = useSessionManager();
 * const handleExport = () => {
 *     const combined = activeSession.files
 *         .map(f => `// ${f.name}\n${f.content}`)
 *         .join('\n\n');
 *     navigator.clipboard.writeText(combined);
 * };
 */

/**
 * NEW WAY - Fetch content when needed for export
 */
export const useExportSession = (sessionId: string | null) => {
    const files = useSessionStore(state => {
        const session = state.sessions.find(s => s.id === sessionId);
        return session?.files ?? [];
    });
    
    const fileIds = files.map(f => f.id);
    const { contents, isLoading } = useBulkFileContent(sessionId, fileIds);

    const exportToClipboard = useCallback(async () => {
        if (isLoading || !sessionId) return;

        const combined = files
            .map(file => {
                const content = contents.get(file.id) || '';
                return `/* --- ${file.path} --- */\n${content}`;
            })
            .join('\n\n');

        await navigator.clipboard.writeText(combined);
    }, [files, contents, isLoading, sessionId]);

    return { exportToClipboard, isLoading, fileCount: files.length };
};

// ============================================
// Example 4: File List Component (Sidebar)
// ============================================

/**
 * This component ONLY renders file metadata, not content.
 * It won't re-render when you're typing in the editor!
 */
export const FileListSidebar: React.FC<{ sessionId: string }> = ({ sessionId }) => {
    const files = useSessionStore(state => {
        const session = state.sessions.find(s => s.id === sessionId);
        return session?.files ?? [];
    });
    
    const removeFile = useSessionStore(state => state.removeFileFromSession);

    return (
        <ul className="space-y-1">
            {files.map(file => (
                <li 
                    key={file.id} 
                    className="flex items-center justify-between p-2 hover:bg-gray-100 rounded"
                >
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">{file.linesOfCode} lines</span>
                    <button 
                        onClick={() => removeFile(sessionId, file.id)}
                        className="text-red-500 hover:text-red-700"
                    >
                        ×
                    </button>
                </li>
            ))}
        </ul>
    );
};

// ============================================
// Example 5: Session Tabs (Tab Bar)
// ============================================

/**
 * Uses granular selector - only re-renders when tabs change,
 * not when file content or other session data changes
 */
import { useSessionTabsData } from '@/hooks/useSession';

export const SessionTabBar: React.FC = () => {
    const { tabs, switchSession, closeSession, createSession } = useSessionTabsData();

    return (
        <div className="flex items-center gap-1 border-b">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => switchSession(tab.id)}
                    className={`
                        px-3 py-2 text-sm rounded-t
                        ${tab.isActive ? 'bg-white border-b-white' : 'bg-gray-100'}
                    `}
                    style={{ borderColor: tab.color }}
                >
                    <span>{tab.name}</span>
                    {tab.fileCount > 0 && (
                        <span className="ml-1 text-xs text-gray-500">
                            ({tab.fileCount})
                        </span>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); closeSession(tab.id); }}
                        className="ml-2 hover:text-red-500"
                    >
                        ×
                    </button>
                </button>
            ))}
            <button 
                onClick={() => createSession()}
                className="px-3 py-2 text-gray-500 hover:text-gray-700"
            >
                +
            </button>
        </div>
    );
};

// ============================================
// Example 6: Complete File Drop Handler
// ============================================

/**
 * Complete example of handling file drops with the new architecture
 */
export const useFileDropHandler = () => {
    const activeSessionId = useSessionStore(state => state.activeSessionId);
    const addFilesToSession = useSessionStore(state => state.addFilesToSession);
    const createSession = useSessionStore(state => state.createSession);

    return useCallback(async (droppedFiles: File[]) => {
        // Process files (this would use your existing file-processing.ts logic)
        const processedFiles: FileData[] = await Promise.all(
            droppedFiles.map(async (file) => {
                const content = await file.text();
                const lines = content.split('\n').length;
                
                return {
                    id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    content, // This will be stripped and stored in IndexedDB
                    isText: true,
                    fileObject: file,
                    linesOfCode: lines,
                    characterCount: content.length,
                    tokenCount: Math.ceil(content.length / 4), // Rough estimate
                    path: file.name,
                };
            })
        );

        // Get or create session
        let sessionId = activeSessionId;
        if (!sessionId) {
            const newSession = createSession('Dropped Files');
            sessionId = newSession.id;
        }

        // Add files - content automatically goes to IndexedDB
        await addFilesToSession(sessionId, processedFiles);
    }, [activeSessionId, addFilesToSession, createSession]);
};

// ============================================
// Migration Checklist
// ============================================

/**
 * MIGRATION STEPS:
 * 
 * 1. Install dependencies:
 *    npm install zustand idb immer
 * 
 * 2. Replace imports:
 *    OLD: import { useSessionManager } from '@/hooks/useSessionManager';
 *    NEW: import { useSession } from '@/hooks/useSession';
 *         import { useFileContent } from '@/hooks/useFileContent';
 * 
 * 3. Update file access patterns:
 *    OLD: file.content
 *    NEW: const { content } = useFileContent(sessionId, file.id);
 * 
 * 4. Use granular hooks for better performance:
 *    - useSessionTabsData() for tab bar
 *    - useCurrentSessionFiles() for file list
 *    - useSessionSettings() for settings panel
 *    - useHomeView() for home screen
 * 
 * 5. Make file operations async:
 *    OLD: closeSession(id);
 *    NEW: await closeSession(id);
 * 
 * 6. Remove content from types:
 *    - SessionFile.content is NO LONGER AVAILABLE
 *    - Use SessionFileMeta type instead
 *    - Content is fetched separately via useFileContent
 * 
 * PERFORMANCE TIPS:
 * 
 * 1. Use specific selectors:
 *    BAD:  const { sessions } = useSession();
 *    GOOD: const files = useSessionStore(s => s.sessions.find(...)?.files);
 * 
 * 2. Avoid selecting the entire store:
 *    BAD:  const store = useSessionStore();
 *    GOOD: const activeId = useSessionStore(s => s.activeSessionId);
 * 
 * 3. Preload content when you know it'll be needed:
 *    import { preloadFileContent } from '@/hooks/useFileContent';
 *    // When user hovers over file
 *    onMouseEnter={() => preloadFileContent(sessionId, [file.id])}
 */
