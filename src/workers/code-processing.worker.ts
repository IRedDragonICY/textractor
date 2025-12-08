import type { CodeProcessingMode } from '@/types';
import { transformWithExtension } from '@/lib/ast/transforms';
import { processCode as regexProcess } from '@/lib/code-processing';

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
    type: 'result' | 'progress' | 'error';
    id: string;
    result?: string;
    lines?: string[];
    progress?: number;
    tokenSavings?: number;
    error?: string;
}

const MAX_PROCESS_SIZE = 2 * 1024 * 1024; // 2MB limit to avoid skipping large files too aggressively

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

async function processFile(
    content: string,
    extension: string,
    mode: CodeProcessingMode
): Promise<string> {
    if (mode === 'raw' || !content) return content;

    if (content.length > MAX_PROCESS_SIZE) {
        return content;
    }

    if (mode === 'minify') {
        return regexProcess(content, extension, mode);
    }

    // AST-capable modes (remove-comments, signatures-only, interfaces-only)
    if (mode === 'remove-comments' || mode === 'signatures-only' || mode === 'interfaces-only') {
        try {
            const astResult = await transformWithExtension(content, extension, mode);
            if (astResult !== null) {
                return astResult;
            }
        } catch (error) {
            console.warn('AST transform failed, falling back to regex', error);
        }
    }

    // Fallback to regex pipeline
    return regexProcess(content, extension, mode === 'remove-comments' ? 'remove-comments' : 'raw');
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, id, files, outputStyle, mode } = e.data;
    if (type !== 'process') return;

    const textFiles = files.filter(f => f.isText);
    const total = textFiles.length;
    const lines: string[] = [];

    let processed = 0;
    let originalLength = 0;
    let processedLength = 0;

    for (let i = 0; i < textFiles.length; i++) {
        const file = textFiles[i];
        const ext = file.name.split('.').pop() || 'txt';
        const pathLabel = file.path || file.name;

        originalLength += file.content.length;

        const processedContent = await processFile(file.content, ext, mode);
        processedLength += processedContent.length;

        appendFileLines(lines, outputStyle, pathLabel, ext, processedContent, i === 0);

        processed++;
        if (processed % 10 === 0 || processed === total) {
            self.postMessage({
                type: 'progress',
                id,
                progress: Math.round((processed / total) * 100)
            } satisfies WorkerResponse);
        }
    }

    const tokenSavings = mode === 'raw' || originalLength === 0
        ? 0
        : Math.max(0, Math.round(((originalLength - processedLength) / originalLength) * 100));

    self.postMessage({
        type: 'result',
        id,
        lines,
        tokenSavings
    } satisfies WorkerResponse);
};

self.postMessage({ type: 'ready', id: 'code-processing' });

