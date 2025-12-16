import { create } from 'zustand';
import { ProcessingProgress } from '@/types/processing';

interface ProcessedFile {
    id: string;
    content: string;
}

interface ProcessingState {
    isProcessing: boolean;
    progress: ProcessingProgress | null;
    processedContent: ProcessedFile[];

    startProcessing: (totalFiles: number, totalBytes: number) => void;
    updateProgress: (payload: ProcessingProgress) => void;
    endProcessing: (finalContent: ProcessedFile[]) => void;
    reset: () => void;
}

export const useProcessingStore = create<ProcessingState>((set) => ({
    isProcessing: false,
    progress: null,
    processedContent: [],

    startProcessing: (totalFiles, totalBytes) => set({
        isProcessing: true,
        progress: {
            current_file_name: 'Starting...',
            processed_files_count: 0,
            total_files_count: totalFiles,
            processed_bytes: 0,
            total_bytes: totalBytes,
            tokens_saved: 0
        },
        processedContent: []
    }),

    updateProgress: (payload) => set({
        progress: payload
    }),

    endProcessing: (finalContent) => set({
        isProcessing: false,
        processedContent: finalContent
    }),

    reset: () => set({
        isProcessing: false,
        progress: null,
        processedContent: []
    })
}));
