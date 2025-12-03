// Smart Code Processing Utilities
// Professional-grade comment removal and minification for token optimization
// Optimized for large files with safe regex patterns and error handling

export type CodeProcessingMode = 'raw' | 'remove-comments' | 'minify';

// Maximum file size to process (500KB) - larger files skip processing to prevent crashes
const MAX_PROCESS_SIZE = 500 * 1024;

/**
 * Language-specific comment patterns for accurate removal
 * Using non-greedy patterns and avoiding catastrophic backtracking
 */
interface CommentPattern {
    single?: RegExp;
    multi?: RegExp;
    preserveStrings?: boolean;
    docstring?: RegExp;
}

const COMMENT_PATTERNS: Record<string, CommentPattern> = {
    // JavaScript/TypeScript family - optimized regex
    js: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    mjs: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    cjs: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    ts: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    mts: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    tsx: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    jsx: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    
    // C-style languages
    c: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    h: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    cpp: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    hpp: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    cc: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    cs: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    java: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    go: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    rs: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    swift: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    kt: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    kts: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    dart: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    scala: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    groovy: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    
    // Python - handle docstrings carefully
    py: { single: /#[^\n]*/g, docstring: /"""[^"]*(?:"")?[^"]*"""|'''[^']*(?:'')?[^']*'''/g, preserveStrings: true },
    pyw: { single: /#[^\n]*/g, docstring: /"""[^"]*(?:"")?[^"]*"""|'''[^']*(?:'')?[^']*'''/g, preserveStrings: true },
    pyx: { single: /#[^\n]*/g, preserveStrings: true },
    
    // Ruby
    rb: { single: /#[^\n]*/g, multi: /=begin[^=]*=end/g, preserveStrings: true },
    
    // Shell scripts
    sh: { single: /#[^\n]*/g },
    bash: { single: /#[^\n]*/g },
    zsh: { single: /#[^\n]*/g },
    fish: { single: /#[^\n]*/g },
    
    // Perl
    pl: { single: /#[^\n]*/g, preserveStrings: true },
    pm: { single: /#[^\n]*/g, preserveStrings: true },
    
    // R
    r: { single: /#[^\n]*/g },
    
    // Config files
    yaml: { single: /#[^\n]*/g },
    yml: { single: /#[^\n]*/g },
    toml: { single: /#[^\n]*/g },
    ini: { single: /[;#][^\n]*/g },
    conf: { single: /#[^\n]*/g },
    
    // HTML/XML style
    html: { multi: /<!--[^>]*-->/g },
    htm: { multi: /<!--[^>]*-->/g },
    xml: { multi: /<!--[^>]*-->/g },
    svg: { multi: /<!--[^>]*-->/g },
    xhtml: { multi: /<!--[^>]*-->/g },
    
    // Vue/Svelte
    vue: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|<!--[^>]*-->/g, preserveStrings: true },
    svelte: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|<!--[^>]*-->/g, preserveStrings: true },
    
    // CSS family
    css: { multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g },
    scss: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g },
    sass: { single: /\/\/[^\n]*/g },
    less: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g },
    
    // SQL
    sql: { single: /--[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g },
    
    // Lua
    lua: { single: /--[^\n]*/g },
    
    // PHP
    php: { single: /(?:\/\/|#)[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, preserveStrings: true },
    
    // Haskell
    hs: { single: /--[^\n]*/g },
    
    // Lisp family
    clj: { single: /;[^\n]*/g },
    cljs: { single: /;[^\n]*/g },
    lisp: { single: /;[^\n]*/g },
    el: { single: /;[^\n]*/g },
    scm: { single: /;[^\n]*/g },
    
    // PowerShell
    ps1: { single: /#[^\n]*/g, multi: /<#[^#]*#>/g },
    psm1: { single: /#[^\n]*/g, multi: /<#[^#]*#>/g },
    
    // Batch
    bat: { single: /^[ \t]*(?:REM|rem|::)[^\n]*/gm },
    cmd: { single: /^[ \t]*(?:REM|rem|::)[^\n]*/gm },
    
    // JSONC - JSON with comments
    jsonc: { single: /\/\/[^\n]*/g, multi: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g },
};

/**
 * Safe string placeholder using control characters
 */
const PLACEHOLDER_PREFIX = '\x00STR';
const PLACEHOLDER_SUFFIX = 'END\x00';

/**
 * Extract and protect string literals using state machine
 * Much safer than regex for complex nested strings
 */
function protectStrings(code: string): { protected: string; strings: string[] } {
    const strings: string[] = [];
    let result = '';
    let i = 0;
    const len = code.length;
    
    while (i < len) {
        const char = code[i];
        
        // Template literal
        if (char === '`') {
            const start = i;
            i++;
            let depth = 1;
            while (i < len && depth > 0) {
                if (code[i] === '\\' && i + 1 < len) {
                    i += 2;
                } else if (code[i] === '`') {
                    depth--;
                    i++;
                } else if (code[i] === '$' && code[i + 1] === '{') {
                    // Template expression - skip to closing brace
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
            result += `${PLACEHOLDER_PREFIX}${strings.length - 1}${PLACEHOLDER_SUFFIX}`;
            continue;
        }
        
        // Double-quoted string
        if (char === '"') {
            const start = i;
            i++;
            while (i < len) {
                if (code[i] === '\\' && i + 1 < len) {
                    i += 2;
                } else if (code[i] === '"') {
                    i++;
                    break;
                } else if (code[i] === '\n') {
                    break;
                } else {
                    i++;
                }
            }
            strings.push(code.slice(start, i));
            result += `${PLACEHOLDER_PREFIX}${strings.length - 1}${PLACEHOLDER_SUFFIX}`;
            continue;
        }
        
        // Single-quoted string
        if (char === "'") {
            const start = i;
            i++;
            while (i < len) {
                if (code[i] === '\\' && i + 1 < len) {
                    i += 2;
                } else if (code[i] === "'") {
                    i++;
                    break;
                } else if (code[i] === '\n') {
                    break;
                } else {
                    i++;
                }
            }
            strings.push(code.slice(start, i));
            result += `${PLACEHOLDER_PREFIX}${strings.length - 1}${PLACEHOLDER_SUFFIX}`;
            continue;
        }
        
        result += char;
        i++;
    }
    
    return { protected: result, strings };
}

/**
 * Restore protected strings efficiently
 */
function restoreStrings(code: string, strings: string[]): string {
    if (strings.length === 0) return code;
    
    let result = code;
    for (let i = 0; i < strings.length; i++) {
        result = result.replace(`${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`, strings[i]);
    }
    return result;
}

/**
 * Remove comments from code based on file extension
 * Optimized with early returns and size checks
 */
export function removeComments(code: string, extension: string): string {
    if (!code || code.length < 2) return code;
    
    if (code.length > MAX_PROCESS_SIZE) {
        console.warn(`File too large for processing (${(code.length / 1024).toFixed(1)}KB), skipping...`);
        return code;
    }
    
    const ext = extension.toLowerCase().replace(/^\./, '');
    const patterns = COMMENT_PATTERNS[ext];
    
    if (!patterns || (!patterns.single && !patterns.multi && !patterns.docstring)) {
        return code;
    }
    
    let result = code;
    let strings: string[] = [];
    
    // Protect string literals
    if (patterns.preserveStrings) {
        try {
            const protected_ = protectStrings(result);
            result = protected_.protected;
            strings = protected_.strings;
        } catch {
            // Continue without protection
        }
    }
    
    // Remove comments safely
    try {
        if (patterns.docstring) {
            result = result.replace(patterns.docstring, '');
        }
        if (patterns.multi) {
            result = result.replace(patterns.multi, '');
        }
        if (patterns.single) {
            result = result.replace(patterns.single, '');
        }
    } catch {
        // Return original on regex failure
        return code;
    }
    
    // Restore strings
    if (strings.length > 0) {
        try {
            result = restoreStrings(result, strings);
        } catch {
            return code;
        }
    }
    
    // Clean up blank lines
    result = result.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '');
    
    return result;
}

/**
 * Minify code - safe, conservative approach
 */
export function minifyCode(code: string, extension: string): string {
    if (!code || code.length < 2) return code;
    
    if (code.length > MAX_PROCESS_SIZE) {
        return code;
    }
    
    const ext = extension.toLowerCase().replace(/^\./, '');
    
    // Remove comments first
    let result = removeComments(code, ext);
    
    // Whitespace-sensitive languages
    if (['py', 'pyw', 'yaml', 'yml', 'coffee', 'sass', 'pug', 'haml'].includes(ext)) {
        return result.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    
    // JSON: compact stringify
    if (['json', 'jsonc'].includes(ext)) {
        try {
            const clean = result.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|\/\/[^\n]*/g, '');
            return JSON.stringify(JSON.parse(clean));
        } catch {
            return result.replace(/\s+/g, ' ').trim();
        }
    }
    
    // HTML/XML
    if (['html', 'htm', 'xml', 'svg'].includes(ext)) {
        return result.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
    }
    
    // Protect strings for C-style
    let strings: string[] = [];
    try {
        const protected_ = protectStrings(result);
        result = protected_.protected;
        strings = protected_.strings;
    } catch {
        return result.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n').trim();
    }
    
    // Conservative minification
    result = result
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{2,}/g, '\n')
        .replace(/^[ \t]+/gm, ' ')
        .trim();
    
    // Restore strings
    try {
        result = restoreStrings(result, strings);
    } catch {
        // Return partial result
    }
    
    return result;
}

/**
 * Process code based on mode - main entry point
 */
export function processCode(code: string, extension: string, mode: CodeProcessingMode): string {
    if (mode === 'raw' || !code) return code || '';
    
    try {
        return mode === 'remove-comments' 
            ? removeComments(code, extension)
            : minifyCode(code, extension);
    } catch {
        return code;
    }
}

/**
 * Calculate token savings estimate
 */
export function estimateTokenSavings(original: string, processed: string): {
    originalTokens: number;
    processedTokens: number;
    savedTokens: number;
    savingsPercent: number;
} {
    const estimateTokens = (text: string) => Math.ceil((text?.length || 0) / 4);
    
    const originalTokens = estimateTokens(original);
    const processedTokens = estimateTokens(processed);
    const savedTokens = Math.max(0, originalTokens - processedTokens);
    const savingsPercent = originalTokens > 0 ? Math.round((savedTokens / originalTokens) * 100) : 0;
    
    return { originalTokens, processedTokens, savedTokens, savingsPercent };
}
