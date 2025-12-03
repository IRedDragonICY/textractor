/**
 * Tokenizer Web Worker
 * 
 * Runs js-tiktoken in a background thread to prevent UI blocking
 * when counting tokens for large files.
 * 
 * Uses o200k_base encoding (gpt-4o) with fallback to cl100k_base
 */

import { getEncoding, Tiktoken } from 'js-tiktoken';

let encoder: Tiktoken | null = null;
let initPromise: Promise<void> | null = null;

// Initialize encoder with fallback
async function initEncoder(): Promise<void> {
    if (encoder) return;
    
    try {
        // Try o200k_base first (GPT-4o encoding)
        encoder = getEncoding('o200k_base');
    } catch {
        try {
            // Fallback to cl100k_base (GPT-4/3.5 encoding)
            encoder = getEncoding('cl100k_base');
        } catch (error) {
            console.error('Failed to initialize tokenizer:', error);
            throw new Error('Failed to initialize tokenizer');
        }
    }
}

// Message types
export interface TokenizerRequest {
    id: string;
    type: 'count' | 'countBatch';
    text?: string;
    texts?: Array<{ id: string; text: string }>;
}

export interface TokenizerResponse {
    id: string;
    type: 'result' | 'batchResult' | 'error';
    count?: number;
    counts?: Array<{ id: string; count: number }>;
    error?: string;
}

// Estimate tokens for very large texts to avoid blocking
const LARGE_TEXT_THRESHOLD = 500_000; // 500KB
function estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token on average
    return Math.ceil(text.length / 4);
}

// Count tokens for a single text
function countTokens(text: string): number {
    if (!encoder) {
        return estimateTokens(text);
    }
    
    // For very large texts, use estimation to prevent long blocking
    if (text.length > LARGE_TEXT_THRESHOLD) {
        return estimateTokens(text);
    }
    
    try {
        return encoder.encode(text).length;
    } catch {
        return estimateTokens(text);
    }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<TokenizerRequest>) => {
    const { id, type, text, texts } = event.data;
    
    try {
        // Ensure encoder is initialized
        if (!initPromise) {
            initPromise = initEncoder();
        }
        await initPromise;
        
        if (type === 'count' && text !== undefined) {
            const count = countTokens(text);
            const response: TokenizerResponse = { id, type: 'result', count };
            self.postMessage(response);
        } else if (type === 'countBatch' && texts) {
            const counts = texts.map(item => ({
                id: item.id,
                count: countTokens(item.text)
            }));
            const response: TokenizerResponse = { id, type: 'batchResult', counts };
            self.postMessage(response);
        }
    } catch (error) {
        const response: TokenizerResponse = {
            id,
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
        self.postMessage(response);
    }
};

// Signal worker is ready
self.postMessage({ type: 'ready' });
