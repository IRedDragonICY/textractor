// Git Import Background Worker Service
// Professional-grade background processing - optimized to prevent UI blocking
// Uses chunked processing and deferred token counting

import { FileData, GitTreeNode, GitRepoMetadata } from '@/types';
import { getEncoding, Tiktoken } from 'js-tiktoken';

// Token encoder instance (initialized lazily)
let tokenEncoder: Tiktoken | null = null;

const loadTokenEncoder = (): Tiktoken => {
    if (!tokenEncoder) {
        try {
            // Try o200k_base first (GPT-4o encoding)
            tokenEncoder = getEncoding('o200k_base');
        } catch {
            try {
                // Fallback to cl100k_base (GPT-4/3.5 encoding)
                tokenEncoder = getEncoding('cl100k_base');
            } catch (error) {
                console.error('Failed to initialize tokenizer:', error);
                throw new Error('Failed to initialize tokenizer');
            }
        }
    }
    return tokenEncoder;
};

// Estimate tokens for very large texts
const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
};

// Count tokens with fallback
const countTokens = (text: string): number => {
    // For very large texts, use estimation to prevent blocking
    if (text.length > 500_000) {
        return estimateTokens(text);
    }
    try {
        const encoder = loadTokenEncoder();
        return encoder.encode(text).length;
    } catch {
        return estimateTokens(text);
    }
};

export interface ImportProgress {
    phase: 'initializing' | 'fetching' | 'processing' | 'complete' | 'error';
    current: number;
    total: number;
    bytesDownloaded: number;
    bytesTotal: number;
    speed: number; // bytes per second
    eta: number; // seconds remaining
    currentFile: string;
    startTime: number;
    errors: string[];
    completedFiles: FileData[];
}

export interface ImportTask {
    id: string;
    repoUrl: string;
    metadata: GitRepoMetadata | null;
    tree: GitTreeNode[];
    progress: ImportProgress;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
    abortController: AbortController;
    onProgress: (progress: ImportProgress) => void;
    onComplete: (files: FileData[]) => void;
    onError: (error: Error) => void;
}

// Singleton task manager
class GitImportManager {
    private tasks: Map<string, ImportTask> = new Map();
    private activeTaskId: string | null = null;
    private listeners: Map<string, Set<(progress: ImportProgress) => void>> = new Map();
    private speedSamples: number[] = [];
    private lastBytesDownloaded = 0;
    private lastSpeedUpdate = 0;

    // Configuration - adaptive for speed and UI responsiveness
    private readonly BASE_CONCURRENCY = 6;
    private readonly MAX_CONCURRENCY = 12;
    private readonly SPEED_SAMPLE_SIZE = 5;
    private readonly SPEED_UPDATE_INTERVAL = 300; // ms

    subscribe(taskId: string, callback: (progress: ImportProgress) => void): () => void {
        if (!this.listeners.has(taskId)) {
            this.listeners.set(taskId, new Set());
        }
        this.listeners.get(taskId)!.add(callback);

        // Send current progress immediately if task exists
        const task = this.tasks.get(taskId);
        if (task) {
            callback(task.progress);
        }

        return () => {
            const set = this.listeners.get(taskId);
            if (set) {
                set.delete(callback);
                if (set.size === 0) {
                    this.listeners.delete(taskId);
                }
            }
        };
    }

    private notifyListeners(taskId: string, progress: ImportProgress) {
        const set = this.listeners.get(taskId);
        if (set) {
            set.forEach(callback => callback(progress));
        }
    }

    generateTaskId(): string {
        return `import-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    createTask(
        repoUrl: string,
        tree: GitTreeNode[],
        metadata: GitRepoMetadata,
        onProgress: (progress: ImportProgress) => void,
        onComplete: (files: FileData[]) => void,
        onError: (error: Error) => void
    ): string {
        const taskId = this.generateTaskId();

        const task: ImportTask = {
            id: taskId,
            repoUrl,
            metadata,
            tree,
            progress: {
                phase: 'initializing',
                current: 0,
                total: 0,
                bytesDownloaded: 0,
                bytesTotal: 0,
                speed: 0,
                eta: 0,
                currentFile: '',
                startTime: Date.now(),
                errors: [],
                completedFiles: []
            },
            status: 'pending',
            abortController: new AbortController(),
            onProgress: (p) => {
                onProgress(p);
                this.notifyListeners(taskId, p);
            },
            onComplete,
            onError
        };

        this.tasks.set(taskId, task);
        return taskId;
    }

    async startTask(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error('Task not found');
        if (task.status === 'running') return;

        task.status = 'running';
        this.activeTaskId = taskId;
        this.speedSamples = [];
        this.lastBytesDownloaded = 0;
        this.lastSpeedUpdate = Date.now();

        // Start import in next tick to not block current execution
        await this.yieldToMain();

        try {
            await this.executeImport(task);
        } catch (error) {
            const currentStatus = task.status as string;
            if (currentStatus !== 'cancelled') {
                task.status = 'error';
                task.progress.phase = 'error';
                task.onError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    private async executeImport(task: ImportTask): Promise<void> {
        const selectedItems = this.getSelectedItems(task.tree);

        if (selectedItems.length === 0) {
            throw new Error('No files selected');
        }

        // Initialize progress
        task.progress.phase = 'fetching';
        task.progress.total = selectedItems.length;

        // Calculate total bytes directly from items
        const fallback = 3000;
        task.progress.bytesTotal = selectedItems.reduce((total, item) => total + (item.size ?? fallback), 0);
        task.progress.startTime = Date.now();
        task.onProgress({ ...task.progress });

        // Yield after initializing
        await this.yieldToMain();

        const filesToFetch = selectedItems.map(item => ({
            name: item.path.split('/').pop() || item.path,
            path: item.path,
            url: item.url || `${task.metadata?.baseUrl}/${item.path}`
        }));

        const completedFiles: FileData[] = [];
        const errors: string[] = [];
        let processed = 0;
        let cursor = 0;
        const total = filesToFetch.length;
        const workerCount = Math.min(this.getConcurrency(total), total);
        const batchSize = this.getBatchSize(workerCount);

        const processItem = async (item: { name: string; path: string; url: string }) => {
            if (task.status === 'cancelled' || task.abortController.signal.aborted) {
                return;
            }

            try {
                const result = await this.fetchFileLightweight(item, task);
                if (result.success && result.file) {
                    completedFiles.push(result.file);
                } else if (result.error) {
                    errors.push(result.error);
                }
            } catch {
                errors.push(`Failed: ${item.path}`);
            }

            processed += 1;
            task.progress.currentFile = item.path;
            task.progress.current = processed;
            task.progress.completedFiles = completedFiles;
            task.progress.errors = errors;
            this.updateSpeed(task);

            // Throttle yielding but keep UI informed
            task.onProgress({ ...task.progress });
            if (processed % batchSize === 0) {
                await this.yieldToMain();
            }
        };

        const worker = async () => {
            while (true) {
                if (task.status === 'cancelled' || task.abortController.signal.aborted) {
                    break;
                }
                const nextIndex = cursor++;
                if (nextIndex >= total) break;
                const item = filesToFetch[nextIndex];
                await processItem(item);
            }
        };

        await Promise.all(Array.from({ length: workerCount }, worker));

        if (task.status === 'cancelled' || task.abortController.signal.aborted) {
            return;
        }

        // Processing phase - count tokens in background
        task.progress.phase = 'processing';
        task.onProgress({ ...task.progress });

        // Count tokens in chunks to not block UI
        await this.countTokensInChunks(completedFiles, task);

        // Complete
        task.progress.phase = 'complete';
        task.progress.current = task.progress.total;
        task.status = 'completed';
        task.progress.completedFiles = completedFiles;
        task.onProgress({ ...task.progress });
        task.onComplete(completedFiles);
    }

    private async fetchFileLightweight(
        item: { name: string; path: string; url: string },
        task: ImportTask
    ): Promise<{ success: boolean; file?: FileData; error?: string }> {
        try {
            task.progress.currentFile = item.path;

            const response = await fetch(item.url, {
                signal: task.abortController.signal,
                headers: { 'Accept': 'text/plain, */*' }
            });

            if (!response.ok) {
                return { success: false, error: `${item.path}: ${response.status}` };
            }

            const text = await response.text();
            const contentLength = text.length;

            // Update bytes downloaded
            task.progress.bytesDownloaded += contentLength;

            // Create FileData WITHOUT token counting (will be done later)
            const fileId = `git-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const file: FileData = {
                id: fileId,
                name: item.name,
                content: text,
                isText: true,
                fileObject: new Blob([text], { type: 'text/plain' }),
                linesOfCode: text.split('\n').length,
                characterCount: contentLength,
                tokenCount: 0, // Will be counted later
                path: item.path
            };

            return { success: true, file };
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                return { success: false, error: 'Cancelled' };
            }
            return { success: false, error: `${item.path}: ${(error as Error).message}` };
        }
    }

    private async countTokensInChunks(files: FileData[], task: ImportTask): Promise<void> {
        // Process in small chunks
        const CHUNK_SIZE = 3;

        for (let i = 0; i < files.length; i += CHUNK_SIZE) {
            if (task.status === 'cancelled') return;

            const chunk = files.slice(i, i + CHUNK_SIZE);

            for (const file of chunk) {
                file.tokenCount = countTokens(file.content);
            }

            // Yield after each chunk
            await this.yieldToMain();
        }
    }

    private updateSpeed(task: ImportTask): void {
        const now = Date.now();
        const timeDelta = now - this.lastSpeedUpdate;

        if (timeDelta >= this.SPEED_UPDATE_INTERVAL) {
            const bytesDelta = task.progress.bytesDownloaded - this.lastBytesDownloaded;
            const speed = (bytesDelta / timeDelta) * 1000;

            this.speedSamples.push(speed);
            if (this.speedSamples.length > this.SPEED_SAMPLE_SIZE) {
                this.speedSamples.shift();
            }

            const avgSpeed = this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length;
            task.progress.speed = avgSpeed;

            const remainingFiles = task.progress.total - task.progress.current;
            const avgTimePerFile = (now - task.progress.startTime) / Math.max(task.progress.current, 1);
            task.progress.eta = (remainingFiles * avgTimePerFile) / 1000;

            this.lastBytesDownloaded = task.progress.bytesDownloaded;
            this.lastSpeedUpdate = now;
        }
    }

    private getSelectedItems(nodes: GitTreeNode[]): { path: string, url?: string, size?: number }[] {
        const items: { path: string, url?: string, size?: number }[] = [];
        const stack = [...nodes];

        while (stack.length > 0) {
            const node = stack.pop()!;
            if (node.type === 'file' && node.selected) {
                items.push({
                    path: node.path,
                    url: node.url,
                    size: node.size
                });
            }
            if (node.children.length > 0) {
                stack.push(...node.children);
            }
        }

        return items;
    }

    private estimateTotalBytes_UNUSED(nodes: GitTreeNode[], selectedPaths: string[]): number {
        const sizeMap = new Map<string, number>();
        const stack = [...nodes];

        while (stack.length > 0) {
            const node = stack.pop()!;
            if (node.type === 'file' && typeof node.size === 'number') {
                sizeMap.set(node.path, node.size);
            }
            if (node.children.length > 0) {
                stack.push(...node.children);
            }
        }

        const fallback = 3000; // Rough average per file when size is unknown
        return selectedPaths.reduce((total, path) => total + (sizeMap.get(path) ?? fallback), 0);
    }

    private getConcurrency(totalFiles: number): number {
        if (totalFiles >= 200) return this.MAX_CONCURRENCY;
        if (totalFiles >= 80) return Math.min(this.MAX_CONCURRENCY, 10);
        if (totalFiles >= 30) return Math.min(this.MAX_CONCURRENCY, 8);
        return this.BASE_CONCURRENCY;
    }

    private getBatchSize(concurrency: number): number {
        return Math.max(8, Math.min(24, concurrency * 2));
    }

    private yieldToMain(): Promise<void> {
        return new Promise(resolve => {
            // Use setTimeout for more reliable yielding
            setTimeout(resolve, 0);
        });
    }

    cancelTask(taskId: string): void {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = 'cancelled';
            task.abortController.abort();
        }
    }

    pauseTask(taskId: string): void {
        const task = this.tasks.get(taskId);
        if (task && task.status === 'running') {
            task.status = 'paused';
        }
    }

    getTask(taskId: string): ImportTask | undefined {
        return this.tasks.get(taskId);
    }

    getActiveTask(): ImportTask | null {
        return this.activeTaskId ? this.tasks.get(this.activeTaskId) || null : null;
    }

    clearCompletedTasks(): void {
        for (const [id, task] of this.tasks) {
            if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'error') {
                this.tasks.delete(id);
            }
        }
    }
}

// Export singleton instance
export const gitImportManager = new GitImportManager();

// Utility functions
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
    return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatETA(seconds: number): string {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}
