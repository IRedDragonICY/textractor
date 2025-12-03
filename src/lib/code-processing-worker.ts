// Web Worker for Code Processing
// Runs in separate thread to prevent UI blocking
// With smart caching for instant tab switching

import { CodeProcessingMode } from '@/types';

export interface WorkerMessage {
    type: 'process';
    id: string;
    files: Array<{
        id: string;
        name: string;
        path: string;
        content: string;
        isText: boolean;
    }>;
    outputStyle: string;
    mode: CodeProcessingMode;
}

export interface WorkerResponse {
    type: 'result' | 'progress';
    id: string;
    result?: string;
    lines?: string[];
    progress?: number;
    tokenSavings?: number;
}

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
const MAX_CACHE_ENTRIES_PER_SESSION = 9; // 3 output styles × 3 processing modes

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

// Worker code as string - will be converted to Blob URL
export const workerCode = `
const MAX_PROCESS_SIZE = 500 * 1024;
const PLACEHOLDER_PREFIX = '\\x00STR';
const PLACEHOLDER_SUFFIX = 'END\\x00';

const COMMENT_PATTERNS = {
    js: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    mjs: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    cjs: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    ts: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    mts: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    tsx: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    jsx: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    c: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    h: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    cpp: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    hpp: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    cc: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    cs: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    java: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    go: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    rs: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    swift: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    kt: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    kts: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    dart: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    scala: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    groovy: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    py: { single: /#[^\\n]*/g, docstring: /"""[^"]*(?:"")?[^"]*"""|'''[^']*(?:'')?[^']*'''/g, preserveStrings: true },
    pyw: { single: /#[^\\n]*/g, docstring: /"""[^"]*(?:"")?[^"]*"""|'''[^']*(?:'')?[^']*'''/g, preserveStrings: true },
    pyx: { single: /#[^\\n]*/g, preserveStrings: true },
    rb: { single: /#[^\\n]*/g, multi: /=begin[^=]*=end/g, preserveStrings: true },
    sh: { single: /#[^\\n]*/g },
    bash: { single: /#[^\\n]*/g },
    zsh: { single: /#[^\\n]*/g },
    fish: { single: /#[^\\n]*/g },
    pl: { single: /#[^\\n]*/g, preserveStrings: true },
    pm: { single: /#[^\\n]*/g, preserveStrings: true },
    r: { single: /#[^\\n]*/g },
    yaml: { single: /#[^\\n]*/g },
    yml: { single: /#[^\\n]*/g },
    toml: { single: /#[^\\n]*/g },
    ini: { single: /[;#][^\\n]*/g },
    conf: { single: /#[^\\n]*/g },
    html: { multi: /<!--[^>]*-->/g },
    htm: { multi: /<!--[^>]*-->/g },
    xml: { multi: /<!--[^>]*-->/g },
    svg: { multi: /<!--[^>]*-->/g },
    xhtml: { multi: /<!--[^>]*-->/g },
    vue: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\/|<!--[^>]*-->/g, preserveStrings: true },
    svelte: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\/|<!--[^>]*-->/g, preserveStrings: true },
    css: { multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g },
    scss: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g },
    sass: { single: /\\/\\/[^\\n]*/g },
    less: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g },
    sql: { single: /--[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g },
    lua: { single: /--[^\\n]*/g },
    php: { single: /(?:\\/\\/|#)[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g, preserveStrings: true },
    hs: { single: /--[^\\n]*/g },
    clj: { single: /;[^\\n]*/g },
    cljs: { single: /;[^\\n]*/g },
    lisp: { single: /;[^\\n]*/g },
    el: { single: /;[^\\n]*/g },
    scm: { single: /;[^\\n]*/g },
    ps1: { single: /#[^\\n]*/g, multi: /<#[^#]*#>/g },
    psm1: { single: /#[^\\n]*/g, multi: /<#[^#]*#>/g },
    bat: { single: /^[ \\t]*(?:REM|rem|::)[^\\n]*/gm },
    cmd: { single: /^[ \\t]*(?:REM|rem|::)[^\\n]*/gm },
    jsonc: { single: /\\/\\/[^\\n]*/g, multi: /\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\//g },
};

function protectStrings(code) {
    const strings = [];
    let result = '';
    let i = 0;
    const len = code.length;
    
    while (i < len) {
        const char = code[i];
        
        if (char === '\`') {
            const start = i;
            i++;
            let depth = 1;
            while (i < len && depth > 0) {
                if (code[i] === '\\\\' && i + 1 < len) {
                    i += 2;
                } else if (code[i] === '\`') {
                    depth--;
                    i++;
                } else if (code[i] === '$' && code[i + 1] === '{') {
                    i += 2;
                    let braceDepth = 1;
                    while (i < len && braceDepth > 0) {
                        if (code[i] === '{') braceDepth++;
                        else if (code[i] === '}') braceDepth--;
                        i++;
                    }
                } else {
                    i++;
                }
            }
            strings.push(code.slice(start, i));
            result += PLACEHOLDER_PREFIX + (strings.length - 1) + PLACEHOLDER_SUFFIX;
            continue;
        }
        
        if (char === '"') {
            const start = i;
            i++;
            while (i < len) {
                if (code[i] === '\\\\' && i + 1 < len) {
                    i += 2;
                } else if (code[i] === '"') {
                    i++;
                    break;
                } else if (code[i] === '\\n') {
                    break;
                } else {
                    i++;
                }
            }
            strings.push(code.slice(start, i));
            result += PLACEHOLDER_PREFIX + (strings.length - 1) + PLACEHOLDER_SUFFIX;
            continue;
        }
        
        if (char === "'") {
            const start = i;
            i++;
            while (i < len) {
                if (code[i] === '\\\\' && i + 1 < len) {
                    i += 2;
                } else if (code[i] === "'") {
                    i++;
                    break;
                } else if (code[i] === '\\n') {
                    break;
                } else {
                    i++;
                }
            }
            strings.push(code.slice(start, i));
            result += PLACEHOLDER_PREFIX + (strings.length - 1) + PLACEHOLDER_SUFFIX;
            continue;
        }
        
        result += char;
        i++;
    }
    
    return { protected: result, strings };
}

function restoreStrings(code, strings) {
    if (strings.length === 0) return code;
    let result = code;
    for (let i = 0; i < strings.length; i++) {
        result = result.replace(PLACEHOLDER_PREFIX + i + PLACEHOLDER_SUFFIX, strings[i]);
    }
    return result;
}

function removeComments(code, extension) {
    if (!code || code.length < 2) return code;
    if (code.length > MAX_PROCESS_SIZE) return code;
    
    const ext = extension.toLowerCase().replace(/^\\./, '');
    const patterns = COMMENT_PATTERNS[ext];
    
    if (!patterns || (!patterns.single && !patterns.multi && !patterns.docstring)) {
        return code;
    }
    
    let result = code;
    let strings = [];
    
    if (patterns.preserveStrings) {
        try {
            const protected_ = protectStrings(result);
            result = protected_.protected;
            strings = protected_.strings;
        } catch (e) {}
    }
    
    try {
        if (patterns.docstring) result = result.replace(patterns.docstring, '');
        if (patterns.multi) result = result.replace(patterns.multi, '');
        if (patterns.single) result = result.replace(patterns.single, '');
    } catch (e) {
        return code;
    }
    
    if (strings.length > 0) {
        try {
            result = restoreStrings(result, strings);
        } catch (e) {
            return code;
        }
    }
    
    result = result.replace(/\\n{3,}/g, '\\n\\n').replace(/[ \\t]+$/gm, '');
    return result;
}

function minifyCode(code, extension) {
    if (!code || code.length < 2) return code;
    if (code.length > MAX_PROCESS_SIZE) return code;
    
    const ext = extension.toLowerCase().replace(/^\\./, '');
    let result = removeComments(code, ext);
    
    if (['py', 'pyw', 'yaml', 'yml', 'coffee', 'sass', 'pug', 'haml'].includes(ext)) {
        return result.replace(/[ \\t]+$/gm, '').replace(/\\n{3,}/g, '\\n\\n').trim();
    }
    
    if (['json', 'jsonc'].includes(ext)) {
        try {
            const clean = result.replace(/\\/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*\\/|\\/\\/[^\\n]*/g, '');
            return JSON.stringify(JSON.parse(clean));
        } catch (e) {
            return result.replace(/\\s+/g, ' ').trim();
        }
    }
    
    if (['html', 'htm', 'xml', 'svg'].includes(ext)) {
        return result.replace(/>\\s+</g, '><').replace(/\\s+/g, ' ').trim();
    }
    
    let strings = [];
    try {
        const protected_ = protectStrings(result);
        result = protected_.protected;
        strings = protected_.strings;
    } catch (e) {
        return result.replace(/[ \\t]+$/gm, '').replace(/\\n{2,}/g, '\\n').trim();
    }
    
    result = result
        .replace(/[ \\t]+$/gm, '')
        .replace(/\\n{2,}/g, '\\n')
        .replace(/^[ \\t]+/gm, ' ')
        .trim();
    
    try {
        result = restoreStrings(result, strings);
    } catch (e) {}
    
    return result;
}

function processCode(code, extension, mode) {
    if (mode === 'raw' || !code) return code || '';
    try {
        return mode === 'remove-comments' 
            ? removeComments(code, extension)
            : minifyCode(code, extension);
    } catch (e) {
        return code;
    }
}

function formatFile(pathLabel, content, ext, outputStyle) {
    switch (outputStyle) {
        case 'hash': return '# --- ' + pathLabel + ' ---\\n' + content;
        case 'minimal': return '--- ' + pathLabel + ' ---\\n' + content;
        case 'xml': return '<file name="' + pathLabel + '">\\n' + content + '\\n</file>';
        case 'markdown': return '### ' + pathLabel + '\\n\\\`\\\`\\\`' + ext + '\\n' + content + '\\n\\\`\\\`\\\`';
        case 'standard': 
        default: return '/* --- ' + pathLabel + ' --- */\\n' + content;
    }
}

self.onmessage = function(e) {
    const { type, id, files, outputStyle, mode } = e.data;
    
    if (type !== 'process') return;
    
    const textFiles = files.filter(f => f.isText);
    const total = textFiles.length;
    let processed = 0;
    let originalLength = 0;
    let processedLength = 0;
    
    // Build lines array directly - no intermediate string joins
    const lines = [];
    
    for (let i = 0; i < textFiles.length; i++) {
        const f = textFiles[i];
        const pathLabel = f.path || f.name;
        const ext = f.name.split('.').pop() || 'txt';
        
        originalLength += f.content.length;
        
        const processedContent = processCode(f.content, ext, mode);
        processedLength += processedContent.length;
        
        // Add separator between files (empty line)
        if (i > 0) {
            lines.push('');
        }
        
        // Add header line(s) based on output style
        switch (outputStyle) {
            case 'hash':
                lines.push('# --- ' + pathLabel + ' ---');
                break;
            case 'minimal':
                lines.push('--- ' + pathLabel + ' ---');
                break;
            case 'xml':
                lines.push('<file name="' + pathLabel + '">');
                break;
            case 'markdown':
                lines.push('### ' + pathLabel);
                lines.push('\`\`\`' + ext);
                break;
            case 'standard':
            default:
                lines.push('/* --- ' + pathLabel + ' --- */');
                break;
        }
        
        // Split processed content into lines and push each one
        const contentLines = processedContent.split('\\n');
        for (let j = 0; j < contentLines.length; j++) {
            lines.push(contentLines[j]);
        }
        
        // Add closing tag for xml/markdown
        if (outputStyle === 'xml') {
            lines.push('</file>');
        } else if (outputStyle === 'markdown') {
            lines.push('\`\`\`');
        }
        
        processed++;
        
        // Report progress every 10 files or at the end
        if (processed % 10 === 0 || processed === total) {
            self.postMessage({
                type: 'progress',
                id,
                progress: Math.round((processed / total) * 100)
            });
        }
    }
    
    const tokenSavings = mode === 'raw' ? 0 : 
        Math.round(((originalLength - processedLength) / originalLength) * 100);
    
    self.postMessage({
        type: 'result',
        id,
        lines,
        tokenSavings: Math.max(0, tokenSavings)
    });
};
`;

// Create worker instance
let worker: Worker | null = null;
let pendingRequest: { id: string; resolve: (value: { lines: string[]; tokenSavings: number }) => void; reject: (reason?: unknown) => void } | null = null;

export function getCodeProcessingWorker(): Worker {
    if (typeof window === 'undefined') {
        throw new Error('Worker can only be created in browser environment');
    }
    
    if (!worker) {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        worker = new Worker(url);
        
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            if (e.data.type === 'result' && pendingRequest && e.data.id === pendingRequest.id) {
                pendingRequest.resolve({
                    lines: e.data.lines || [],
                    tokenSavings: e.data.tokenSavings || 0
                });
                pendingRequest = null;
            }
        };
        
        worker.onerror = (error) => {
            console.error('Worker error:', error);
            if (pendingRequest) {
                pendingRequest.reject(error);
                pendingRequest = null;
            }
        };
    }
    
    return worker;
}

export function processCodeAsync(
    files: Array<{ id: string; name: string; path: string; content: string; isText: boolean }>,
    outputStyle: string,
    mode: CodeProcessingMode
): Promise<{ lines: string[]; tokenSavings: number }> {
    return new Promise((resolve, reject) => {
        // Fast path for raw mode - no worker needed, build lines directly
        if (mode === 'raw') {
            const textFiles = files.filter(f => f.isText);
            const lines: string[] = [];
            
            for (let i = 0; i < textFiles.length; i++) {
                const f = textFiles[i];
                const pathLabel = f.path || f.name;
                const ext = f.name.split('.').pop() || 'txt';
                
                // Add separator between files
                if (i > 0) {
                    lines.push('');
                }
                
                // Add header based on output style
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
                
                // Push each content line
                const contentLines = f.content.split('\n');
                for (const line of contentLines) {
                    lines.push(line);
                }
                
                // Add closing tags
                if (outputStyle === 'xml') {
                    lines.push('</file>');
                } else if (outputStyle === 'markdown') {
                    lines.push('```');
                }
            }
            
            resolve({ lines, tokenSavings: 0 });
            return;
        }
        
        try {
            const w = getCodeProcessingWorker();
            const id = crypto.randomUUID();
            
            // Cancel previous request
            if (pendingRequest) {
                pendingRequest.reject(new Error('Cancelled'));
            }
            
            pendingRequest = { id, resolve, reject };
            
            w.postMessage({
                type: 'process',
                id,
                files: files.map(f => ({
                    id: f.id,
                    name: f.name,
                    path: f.path,
                    content: f.content,
                    isText: f.isText
                })),
                outputStyle,
                mode
            });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (pendingRequest?.id === id) {
                    pendingRequest.reject(new Error('Processing timeout'));
                    pendingRequest = null;
                }
            }, 30000);
        } catch (error) {
            reject(error);
        }
    });
}

export function terminateWorker(): void {
    if (worker) {
        worker.terminate();
        worker = null;
        pendingRequest = null;
    }
}
