import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useProcessingStore } from '@/stores/processingStore';
import { ProcessingProgress } from '@/types/processing';

export function useTauriProcessingEvents() {
    const { updateProgress } = useProcessingStore();
    // Use a ref to keep the listener stable if strict mode double-invokes
    const unlistenRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Only run if in Tauri
        if (typeof window === 'undefined' || !('__TAURI__' in window)) return;

        console.log("Setting up Tauri processing event listeners");

        const setupListener = async () => {
            const unlisten = await listen<ProcessingProgress>('processing-progress', (event) => {
                // console.log('Progress event:', event.payload);
                updateProgress(event.payload);
            });
            unlistenRef.current = unlisten;
        };

        setupListener();

        return () => {
            if (unlistenRef.current) {
                unlistenRef.current();
                unlistenRef.current = null;
            }
        };
    }, [updateProgress]);
}
