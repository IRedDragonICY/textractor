// Web Worker for Code Processing
// Runs in separate thread to prevent UI blocking
// With smart caching for instant tab switching

import { CodeProcessingMode } from '@/types';
import { processCode as regexProcess } from '@/lib/code-processing';
import type { WorkerMessage, WorkerResponse } from '@/workers/code-processing.worker';

// ============================================
// SMART PROCESSING CACHE - Instant Tab Switching
// ============================================

interface CacheEntry {
    lines: string[];
    tokenSavings: number;
    timestamp: number;
    filesHash: string;
}

interface SessionCache {
    entries: Map<string, CacheEntry>; // key: outputStyle_mode
    filesHash: string;
}

// Per-session cache for processed results
const processingCache = new Map<string, SessionCache>();

// Maximum cache entries per session (for different outputStyle/mode combinations)
const MAX_CACHE_ENTRIES_PER_SESSION = 15; // allow additional AST modes

// Cache TTL: 5 minutes (in ms)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate a fast hash for file content comparison
 * Uses file IDs and content lengths for quick equality check
 */
function generateFilesHash(files: Array<{ id: string; content: string }>): string {
    if (files.length === 0) return 'empty';
    // Fast hash: combine file IDs and content lengths
    return files.map(f => `${f.id}:${f.content.length}`).join('|');
}

/**
 * Get cached result for a session
 */
export function getCachedResult(
    sessionId: string,
    files: Array<{ id: string; content: string }>,
    outputStyle: string,
    mode: CodeProcessingMode
): { lines: string[]; tokenSavings: number } | null {
    const sessionCache = processingCache.get(sessionId);
    if (!sessionCache) return null;
    
    const currentHash = generateFilesHash(files);
    
    // If files changed, invalidate entire session cache
    if (sessionCache.filesHash !== currentHash) {
        processingCache.delete(sessionId);
        return null;
    }
    
    const cacheKey = `${outputStyle}_${mode}`;
    const entry = sessionCache.entries.get(cacheKey);
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        sessionCache.entries.delete(cacheKey);
        return null;
    }
    
    return { lines: entry.lines, tokenSavings: entry.tokenSavings };
}

/**
 * Store result in cache
 */
export function setCachedResult(
    sessionId: string,
    files: Array<{ id: string; content: string }>,
    outputStyle: string,
    mode: CodeProcessingMode,
    lines: string[],
    tokenSavings: number
): void {
    const filesHash = generateFilesHash(files);
    let sessionCache = processingCache.get(sessionId);
    
    // Create new session cache or invalidate if files changed
    if (!sessionCache || sessionCache.filesHash !== filesHash) {
        sessionCache = {
            entries: new Map(),
            filesHash
        };
        processingCache.set(sessionId, sessionCache);
    }
    
    // Evict old entries if at capacity
    if (sessionCache.entries.size >= MAX_CACHE_ENTRIES_PER_SESSION) {
        // Remove oldest entry
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        sessionCache.entries.forEach((entry, key) => {
            if (entry.timestamp < oldestTime) {
                oldestKey = key;
                oldestTime = entry.timestamp;
            }
        });
        if (oldestKey) sessionCache.entries.delete(oldestKey);
    }
    
    const cacheKey = `${outputStyle}_${mode}`;
    sessionCache.entries.set(cacheKey, {
        lines,
        tokenSavings,
        timestamp: Date.now(),
        filesHash
    });
}

/**
 * Clear cache for a specific session
 */
export function clearSessionCache(sessionId: string): void {
    processingCache.delete(sessionId);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
    processingCache.clear();
}

// ============================================
// Worker + fallback plumbing
// ============================================

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

interface TauriWindow {
    __TAURI__?: {
        core?: {
            invoke: TauriInvoke;
        };
    };
}

function getTauriInvoker(): TauriInvoke | null {
    if (typeof window === 'undefined') return null;
    const invoke = (window as unknown as TauriWindow).__TAURI__?.core?.invoke;
    return typeof invoke === 'function' ? invoke : null;
}

function appendFileLines(
    lines: string[],
    outputStyle: string,
    pathLabel: string,
    ext: string,
    content: string,
    isFirst: boolean
): void {
    if (!isFirst) {
        lines.push('');
    }

    switch (outputStyle) {
        case 'hash':
            lines.push(`# --- ${pathLabel} ---`);
            break;
        case 'minimal':
            lines.push(`--- ${pathLabel} ---`);
            break;
        case 'xml':
            lines.push(`<file name="${pathLabel}">`);
            break;
        case 'markdown':
            lines.push(`### ${pathLabel}`);
            lines.push(`\`\`\`${ext}`);
            break;
        case 'standard':
        default:
            lines.push(`/* --- ${pathLabel} --- */`);
            break;
    }

    const contentLines = content.split('\n');
    for (const line of contentLines) {
        lines.push(line);
    }

    if (outputStyle === 'xml') {
        lines.push('</file>');
    } else if (outputStyle === 'markdown') {
        lines.push('```');
    }
}

async function processWithTauri(
    files: Array<{ id: string; name: string; path: string; content: string; isText: boolean }>,
    outputStyle: string,
    mode: CodeProcessingMode,
    invoke: TauriInvoke
): Promise<{ lines: string[]; tokenSavings: number }> {
    const textFiles = files.filter(f => f.isText);
    const lines: string[] = [];
    let originalLength = 0;
    let processedLength = 0;

    for (let i = 0; i < textFiles.length; i++) {
        const f = textFiles[i];
        const pathLabel = f.path || f.name;
        const ext = f.name.split('.').pop() || 'txt';
        const processedContent = await invoke<string>('process_code', {
            code: f.content,
            mode,
            extension: ext
        });

        const finalContent = processedContent ?? f.content;
        appendFileLines(lines, outputStyle, pathLabel, ext, finalContent, i === 0);
        originalLength += f.content.length;
        processedLength += finalContent.length;
    }

    const tokenSavings = mode === 'raw' || originalLength === 0
        ? 0
        : Math.max(0, Math.round(((originalLength - processedLength) / originalLength) * 100));

    return { lines, tokenSavings };
}

function buildRawLines(
    files: Array<{ id: string; name: string; path: string; content: string; isText: boolean }>,
    outputStyle: string
): string[] {
    const textFiles = files.filter(f => f.isText);
    const lines: string[] = [];

    for (let i = 0; i < textFiles.length; i++) {
        const f = textFiles[i];
        const pathLabel = f.path || f.name;
        const ext = f.name.split('.').pop() || 'txt';

        appendFileLines(lines, outputStyle, pathLabel, ext, f.content, i === 0);
    }

    return lines;
}

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
const pendingRequests = new Map<string, { resolve: (value: { lines: string[]; tokenSavings: number }) => void; reject: (reason?: unknown) => void }>();

function getCodeProcessingWorker(): Worker {
    if (typeof window === 'undefined') {
        throw new Error('Worker can only be created in browser environment');
    }

    if (worker) return worker;

    readyPromise = new Promise((resolve) => {
        readyResolve = resolve;
    });

    worker = new Worker(new URL('../workers/code-processing.worker.ts', import.meta.url), {
        type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse | { type: 'ready'; id: string }>) => {
        const data = event.data;
        if ('type' in data && data.type === 'ready') {
            readyResolve?.();
            return;
        }

        const { id, type, lines, tokenSavings } = data as WorkerResponse;
        if (type === 'result') {
            const pending = pendingRequests.get(id);
            if (pending) {
                pending.resolve({ lines: lines || [], tokenSavings: tokenSavings ?? 0 });
                pendingRequests.delete(id);
            }
        }
    };

    worker.onerror = (error) => {
        console.error('Worker error:', error);
        pendingRequests.forEach((pending) => pending.reject(error));
        pendingRequests.clear();
    };

    return worker;
}

async function processWithWorker(
    files: Array<{ id: string; name: string; path: string; content: string; isText: boolean }>,
    outputStyle: string,
    mode: CodeProcessingMode
): Promise<{ lines: string[]; tokenSavings: number }> {
    const w = getCodeProcessingWorker();
    await readyPromise;

    return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        pendingRequests.set(id, { resolve, reject });

        (w as Worker).postMessage({
            type: 'process',
            id,
            files,
            outputStyle,
            mode,
        } satisfies WorkerMessage);

        // Safety net: if the worker never responds, fall back to synchronous processing instead of throwing.
        setTimeout(() => {
            const pending = pendingRequests.get(id);
            if (pending) {
                console.warn('Code processing timed out; falling back to synchronous processing.');
                pendingRequests.delete(id);
                try {
                    const fallback = processSynchronously(files, outputStyle, mode);
                    pending.resolve(fallback);
                } catch (error) {
                    pending.reject(error instanceof Error ? error : new Error('Processing timeout'));
                }
            }
        }, 30000);
    });
}

function processSynchronously(
    files: Array<{ id: string; name: string; path: string; content: string; isText: boolean }>,
    outputStyle: string,
    mode: CodeProcessingMode
): { lines: string[]; tokenSavings: number } {
    const textFiles = files.filter(f => f.isText);
    const lines: string[] = [];
    let originalLength = 0;
    let processedLength = 0;

    for (let i = 0; i < textFiles.length; i++) {
        const f = textFiles[i];
        const ext = f.name.split('.').pop() || 'txt';
        const pathLabel = f.path || f.name;

        const processedContent = mode === 'raw' ? f.content : regexProcess(f.content, ext, mode);
        appendFileLines(lines, outputStyle, pathLabel, ext, processedContent, i === 0);

        originalLength += f.content.length;
        processedLength += processedContent.length;
    }

    const tokenSavings = mode === 'raw' || originalLength === 0
        ? 0
        : Math.max(0, Math.round(((originalLength - processedLength) / originalLength) * 100));

    return { lines, tokenSavings };
}

const TAURI_SUPPORTED_MODES: CodeProcessingMode[] = ['raw', 'remove-comments', 'minify'];

export function processCodeAsync(
    files: Array<{ id: string; name: string; path: string; content: string; isText: boolean }>,
    outputStyle: string,
    mode: CodeProcessingMode
): Promise<{ lines: string[]; tokenSavings: number }> {
    // Fast path for raw mode - no worker needed, build lines directly
    if (mode === 'raw') {
        return Promise.resolve({ lines: buildRawLines(files, outputStyle), tokenSavings: 0 });
    }

    const tauriInvoke = getTauriInvoker();
    if (tauriInvoke && TAURI_SUPPORTED_MODES.includes(mode)) {
        return processWithTauri(files, outputStyle, mode, tauriInvoke).catch(() =>
            processWithWorker(files, outputStyle, mode)
        );
    }

    // Preferred path: AST worker with regex fallback inside the worker. If worker creation fails,
    // fall back synchronously on main thread.
    try {
        return processWithWorker(files, outputStyle, mode);
    } catch (error) {
        console.warn('Worker unavailable, falling back to synchronous processing', error);
        return Promise.resolve(processSynchronously(files, outputStyle, mode));
    }
}

export function terminateWorker(): void {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    pendingRequests.clear();
    readyPromise = null;
    readyResolve = null;
}
