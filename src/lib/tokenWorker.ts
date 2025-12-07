/**
 * Token Worker Utility
 * 
 * Provides an async interface to the tokenizer web worker.
 * Uses singleton pattern to ensure only one worker instance exists.
 * 
 * Features:
 * - Non-blocking token counting via Web Worker
 * - Automatic worker lifecycle management
 * - Request queuing with promise resolution
 * - Batch processing support for multiple files
 * - Graceful fallback for SSR environments
 */

import type { TokenizerRequest, TokenizerResponse } from '@/workers/tokenizer.worker';

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

type PendingRequest = {
    resolve: (value: number) => void;
    reject: (error: Error) => void;
};

type PendingBatchRequest = {
    resolve: (value: Array<{ id: string; count: number }>) => void;
    reject: (error: Error) => void;
};

class TokenWorkerService {
    private worker: Worker | null = null;
    private isReady = false;
    private readyPromise: Promise<void> | null = null;
    private readyResolve: (() => void) | null = null;
    private pendingRequests = new Map<string, PendingRequest>();
    private pendingBatchRequests = new Map<string, PendingBatchRequest>();
    private requestCounter = 0;
    private tauriInvoke: TauriInvoke | null = null;

    constructor() {
        // Only initialize in browser environment
        if (typeof window !== 'undefined') {
            this.tauriInvoke = getTauriInvoker();
            if (!this.tauriInvoke) {
                this.initWorker();
            }
        }
    }

    private initWorker(): void {
        if (this.worker) return;

        this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve;
        });

        try {
            // Create worker using module worker syntax for Next.js
            this.worker = new Worker(
                new URL('../workers/tokenizer.worker.ts', import.meta.url),
                { type: 'module' }
            );

            this.worker.onmessage = (event: MessageEvent<TokenizerResponse | { type: 'ready' }>) => {
                const data = event.data;

                if ('type' in data && data.type === 'ready') {
                    this.isReady = true;
                    this.readyResolve?.();
                    return;
                }

                const response = data as TokenizerResponse;
                const { id, type, count, counts, error } = response;

                if (type === 'result') {
                    const pending = this.pendingRequests.get(id);
                    if (pending) {
                        pending.resolve(count ?? 0);
                        this.pendingRequests.delete(id);
                    }
                } else if (type === 'batchResult') {
                    const pending = this.pendingBatchRequests.get(id);
                    if (pending) {
                        pending.resolve(counts ?? []);
                        this.pendingBatchRequests.delete(id);
                    }
                } else if (type === 'error') {
                    const pending = this.pendingRequests.get(id);
                    const pendingBatch = this.pendingBatchRequests.get(id);
                    const err = new Error(error ?? 'Unknown worker error');
                    
                    if (pending) {
                        pending.reject(err);
                        this.pendingRequests.delete(id);
                    }
                    if (pendingBatch) {
                        pendingBatch.reject(err);
                        this.pendingBatchRequests.delete(id);
                    }
                }
            };

            this.worker.onerror = (error) => {
                console.error('Token worker error:', error);
                // Reject all pending requests
                this.pendingRequests.forEach((pending) => {
                    pending.reject(new Error('Worker error'));
                });
                this.pendingBatchRequests.forEach((pending) => {
                    pending.reject(new Error('Worker error'));
                });
                this.pendingRequests.clear();
                this.pendingBatchRequests.clear();
            };
        } catch (error) {
            console.error('Failed to create token worker:', error);
            this.isReady = true; // Allow fallback to work
            this.readyResolve?.();
        }
    }

    private ensureWorker(): void {
        if (!this.worker && typeof window !== 'undefined') {
            this.initWorker();
        }
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${++this.requestCounter}`;
    }

    private estimateTokens(text: string): number {
        // Fallback estimation: ~4 chars per token
        return Math.ceil(text.length / 4);
    }

    /**
     * Calculate token count for a single text string
     * Non-blocking - runs in web worker
     */
    async calculateTokens(text: string): Promise<number> {
        if (!text || text.length === 0) {
            return 0;
        }

        if (!this.tauriInvoke) {
            this.tauriInvoke = getTauriInvoker();
        }

        if (this.tauriInvoke) {
            try {
                const count = await this.tauriInvoke<number>('count_tokens', { text });
                if (typeof count === 'number' && Number.isFinite(count)) {
                    return count;
                }
            } catch (error) {
                console.warn('Tauri count_tokens failed, falling back to worker', error);
                this.tauriInvoke = null;
            }
        }

        this.ensureWorker();

        // Handle SSR or worker unavailable
        if (typeof window === 'undefined' || !this.worker) {
            return this.estimateTokens(text);
        }

        // Wait for worker to be ready
        if (!this.isReady && this.readyPromise) {
            await this.readyPromise;
        }

        const id = this.generateRequestId();

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });

            const request: TokenizerRequest = {
                id,
                type: 'count',
                text
            };

            try {
                this.worker!.postMessage(request);
            } catch {
                this.pendingRequests.delete(id);
                // Fallback to estimation if posting fails
                resolve(this.estimateTokens(text));
            }

            // Timeout after 30 seconds (for very large texts)
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    resolve(this.estimateTokens(text));
                }
            }, 30000);
        });
    }

    /**
     * Calculate token counts for multiple texts in a single batch
     * More efficient than calling calculateTokens multiple times
     */
    async calculateTokensBatch(
        texts: Array<{ id: string; text: string }>
    ): Promise<Array<{ id: string; count: number }>> {
        if (!this.tauriInvoke) {
            this.tauriInvoke = getTauriInvoker();
        }

        if (this.tauriInvoke) {
            try {
                const results = await Promise.all(
                    texts.map(async (item) => ({
                        id: item.id,
                        count: await this.tauriInvoke!<number>('count_tokens', { text: item.text })
                    }))
                );
                return results.map((r, idx) => ({
                    id: r.id,
                    count: Number.isFinite(r.count) ? r.count : this.estimateTokens(texts[idx].text)
                }));
            } catch (error) {
                console.warn('Tauri count_tokens batch failed, falling back to worker', error);
                this.tauriInvoke = null;
            }
        }

        this.ensureWorker();

        // Handle SSR or worker unavailable
        if (typeof window === 'undefined' || !this.worker) {
            return texts.map(item => ({
                id: item.id,
                count: this.estimateTokens(item.text)
            }));
        }

        // Wait for worker to be ready
        if (!this.isReady && this.readyPromise) {
            await this.readyPromise;
        }

        // Handle empty batch
        if (texts.length === 0) {
            return [];
        }

        const requestId = this.generateRequestId();

        return new Promise((resolve, reject) => {
            this.pendingBatchRequests.set(requestId, { resolve, reject });

            const request: TokenizerRequest = {
                id: requestId,
                type: 'countBatch',
                texts
            };

            try {
                this.worker!.postMessage(request);
            } catch {
                this.pendingBatchRequests.delete(requestId);
                // Fallback to estimation
                resolve(texts.map(item => ({
                    id: item.id,
                    count: this.estimateTokens(item.text)
                })));
            }

            // Timeout after 60 seconds for batch operations
            setTimeout(() => {
                if (this.pendingBatchRequests.has(requestId)) {
                    this.pendingBatchRequests.delete(requestId);
                    resolve(texts.map(item => ({
                        id: item.id,
                        count: this.estimateTokens(item.text)
                    })));
                }
            }, 60000);
        });
    }

    /**
     * Terminate the worker (call on app cleanup if needed)
     */
    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isReady = false;
            this.pendingRequests.clear();
            this.pendingBatchRequests.clear();
        }
    }
}

// Singleton instance
let tokenWorkerInstance: TokenWorkerService | null = null;

/**
 * Get the singleton TokenWorkerService instance
 */
export function getTokenWorker(): TokenWorkerService {
    if (!tokenWorkerInstance) {
        tokenWorkerInstance = new TokenWorkerService();
    }
    return tokenWorkerInstance;
}

/**
 * Calculate tokens for a single text (convenience function)
 * Non-blocking - runs in web worker
 */
export async function calculateTokens(text: string): Promise<number> {
    return getTokenWorker().calculateTokens(text);
}

/**
 * Calculate tokens for multiple texts in batch (convenience function)
 * More efficient for processing multiple files
 */
export async function calculateTokensBatch(
    texts: Array<{ id: string; text: string }>
): Promise<Array<{ id: string; count: number }>> {
    return getTokenWorker().calculateTokensBatch(texts);
}

/**
 * Synchronous token estimation (for immediate UI feedback)
 * Use when you need instant results without waiting for worker
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    // Average of ~4 characters per token
    return Math.ceil(text.length / 4);
}
