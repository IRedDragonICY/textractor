/**
 * Custom file extraction utility for react-dropzone
 * Enhanced to handle drag-and-drop from GUI applications like VSCode
 * Uses Tauri's file system access when running in Tauri environment
 */

import { fromEvent } from 'file-selector';

// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Type for Tauri invoke function
type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

// Get Tauri invoke function
const getTauriInvoke = async (): Promise<TauriInvoke | null> => {
    if (!isTauri) return null;
    try {
        // Dynamic import to avoid SSR issues
        const { invoke } = await import('@tauri-apps/api/core');
        return invoke;
    } catch {
        return null;
    }
};

// File info from Tauri backend
interface TauriFileInfo {
    name: string;
    path: string;
    content: string;
    is_text: boolean;
}

/**
 * Parse file:// URIs and convert them to file paths
 * Handles both Unix and Windows paths
 */
const parseFileUri = (uri: string): string | null => {
    try {
        // Handle file:// protocol
        if (uri.startsWith('file://')) {
            const url = new URL(uri);
            let path = decodeURIComponent(url.pathname);

            // Windows paths have an extra leading slash (file:///C:/path)
            if (/^\/[a-zA-Z]:/.test(path)) {
                path = path.substring(1);
            }

            return path;
        }
        // Handle plain Windows paths (C:\path\to\file)
        if (/^[a-zA-Z]:[/\\]/.test(uri)) {
            return uri;
        }
        // Handle Unix absolute paths
        if (uri.startsWith('/')) {
            return uri;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Extract file paths from text/uri-list format
 */
const extractPathsFromUriList = (uriList: string): string[] => {
    const paths: string[] = [];
    const lines = uriList.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
        const path = parseFileUri(line.trim());
        if (path) {
            paths.push(path);
        }
    }

    return paths;
};

/**
 * Extract file paths from text/plain format
 */
const extractPathsFromPlainText = (text: string): string[] => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const pathPattern = /^(file:\/\/|\/|[a-zA-Z]:[/\\])/;

    if (!lines.every(line => pathPattern.test(line.trim()))) {
        return [];
    }

    const paths: string[] = [];
    for (const line of lines) {
        let path = line.trim();
        if (path.startsWith('file://')) {
            const parsed = parseFileUri(path);
            if (parsed) path = parsed;
        }
        paths.push(path);
    }

    return paths;
};

/**
 * Convert Tauri file info to File object
 */
const tauriFileToFile = (info: TauriFileInfo): File => {
    const blob = new Blob([info.content], { type: 'text/plain' });
    const file = new File([blob], info.name, { type: 'text/plain' });

    // Add path property
    Object.defineProperty(file, 'path', {
        value: info.path,
        writable: false,
        enumerable: true
    });

    return file;
};

/**
 * Read files from paths using Tauri backend
 */
const readFilesViaTauri = async (paths: string[]): Promise<File[]> => {
    const invoke = await getTauriInvoke();
    if (!invoke) return [];

    try {
        console.log('[Dropzone] Reading files via Tauri:', paths);
        const fileInfos = await invoke<TauriFileInfo[]>('read_files_from_paths', { paths });

        // Calculate common root for relative paths
        let commonRoot = '';
        if (fileInfos.length > 0) {
            const dirPaths = fileInfos.map(f => {
                const normalized = f.path.replace(/\\/g, '/');
                const lastSlash = normalized.lastIndexOf('/');
                return lastSlash >= 0 ? normalized.substring(0, lastSlash) : '';
            });

            if (dirPaths.length > 0) {
                const sortedDirs = dirPaths.sort();
                const first = sortedDirs[0];
                const last = sortedDirs[sortedDirs.length - 1];
                let i = 0;
                while (i < first.length && first.charAt(i) === last.charAt(i)) {
                    i++;
                }
                commonRoot = first.substring(0, i);

                const lastSlashRoot = commonRoot.lastIndexOf('/');
                if (lastSlashRoot >= 0) {
                    commonRoot = commonRoot.substring(0, lastSlashRoot + 1);
                }
            }
        }

        let baseDirToStrip = '';
        if (commonRoot && commonRoot.length > 2) {
            const cleanRoot = commonRoot.endsWith('/') ? commonRoot.substring(0, commonRoot.length - 1) : commonRoot;
            const lastSlash = cleanRoot.lastIndexOf('/');
            if (lastSlash > 0) {
                baseDirToStrip = cleanRoot.substring(0, lastSlash + 1);
            }
        }

        console.log('[Dropzone] Common root:', commonRoot);
        console.log('[Dropzone] Base to strip:', baseDirToStrip);

        const files = fileInfos
            .filter(info => info.is_text && info.content)
            .map(info => {
                // Calculate relative path
                const normalizedPath = info.path.replace(/\\/g, '/');
                let relativePath = normalizedPath;

                // Apply base stripping
                if (baseDirToStrip && normalizedPath.startsWith(baseDirToStrip)) {
                    relativePath = normalizedPath.substring(baseDirToStrip.length);
                } else if (fileInfos.length === 1 && !info.path.includes(baseDirToStrip)) {
                    // Fallback for single file
                    relativePath = info.name;
                }

                // Final cleanup
                if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);

                // Create file manually (do NOT use tauriFileToFile to avoid double definition of path)
                const blob = new Blob([info.content], { type: 'text/plain' });
                const file = new File([blob], info.name, { type: 'text/plain' });

                // Add path property safely
                Object.defineProperty(file, 'path', {
                    value: relativePath,
                    writable: false,
                    enumerable: true
                });

                // Add webkitRelativePath for consistency
                Object.defineProperty(file, 'webkitRelativePath', {
                    value: relativePath,
                    writable: false,
                    enumerable: true
                });

                return file;
            });

        console.log('[Dropzone] Read', files.length, 'files via Tauri');
        if (files.length > 0) console.log('[Dropzone] Sample relative path:', (files[0] as any).path);
        return files;
    } catch (error) {
        console.error('[Dropzone] Failed to read files via Tauri:', error);
        return [];
    }
};

/**
 * Custom getFilesFromEvent that handles both standard drops and GUI applications
 * Uses Tauri's file system access when available for reading files from paths
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getFilesFromEvent = async (event: any): Promise<(File | DataTransferItem)[]> => {
    // Debug: Log all data types available in the drop event
    let dataTransfer: DataTransfer | null = null;

    if (event && 'dataTransfer' in event && event.dataTransfer) {
        dataTransfer = event.dataTransfer;
    } else if (event instanceof DataTransfer) {
        dataTransfer = event;
    }

    if (dataTransfer) {
        const types = Array.from(dataTransfer.types || []);
        console.log('[Dropzone] DataTransfer types:', types);
    }

    // First, try the default file-selector approach
    const defaultFiles = await fromEvent(event);
    console.log('[Dropzone] Default files from fromEvent:', defaultFiles.length);

    // If we got files from the standard approach, use them
    if (defaultFiles.length > 0) {
        // If we have files but they are empty (common in some drag interactions), check paths
        // But usually default is good enough for Explorer
        return defaultFiles;
    }

    if (!dataTransfer) {
        return defaultFiles;
    }

    const types = Array.from(dataTransfer.types || []);
    let paths: string[] = [];

    // VSCode and other editors often put the path in "Code" or "codeeditors" or "text/plain" or "text/uri-list"
    // Check text/uri-list first (standard for files)
    if (types.includes('text/uri-list')) {
        const uriList = dataTransfer.getData('text/uri-list');
        if (uriList) {
            const extracted = extractPathsFromUriList(uriList);
            if (extracted.length > 0) {
                console.log('[Dropzone] Found paths in text/uri-list:', extracted);
                paths = extracted;
            }
        }
    }

    // Fallback to text/plain which VSCode definitely sets for file paths
    if (paths.length === 0 && types.includes('text/plain')) {
        const text = dataTransfer.getData('text/plain');
        if (text) {
            // Check if text looks like a path
            const potentialPaths = extractPathsFromPlainText(text);
            if (potentialPaths.length > 0) {
                console.log('[Dropzone] Found paths in text/plain:', potentialPaths);
                paths = potentialPaths;
            }
        }
    }

    // Also try to get "text/html" or just raw items if possible (less likely to work without special parsing)

    // If we have paths and running in Tauri, read files via Tauri backend
    if (paths.length > 0 && isTauri) {
        console.log('[Dropzone] Attempting to read files via Tauri backend...');
        const files = await readFilesViaTauri(paths);
        if (files.length > 0) {
            return files;
        }
    }

    // If not in Tauri or failed, return empty
    if (paths.length > 0 && !isTauri) {
        console.log('[Dropzone] Cannot read files from paths in browser context');
        console.log('[Dropzone] Tip: Use Windows Explorer to drag files, or use the file picker');
    }

    return defaultFiles;
};

/**
 * Check if a dropped File has a valid path that we can use
 */
export const hasValidPath = (file: File): boolean => {
    return !!(file as File & { path?: string }).path ||
        !!(file as File & { webkitRelativePath?: string }).webkitRelativePath;
};

/**
 * Get the file path from a dropped File
 */
export const getFilePath = (file: File): string => {
    const fileWithPath = file as File & { path?: string; webkitRelativePath?: string };
    return fileWithPath.path || fileWithPath.webkitRelativePath || file.name;
};

/**
 * Check if running in Tauri environment
 */
export const isRunningInTauri = (): boolean => isTauri;
