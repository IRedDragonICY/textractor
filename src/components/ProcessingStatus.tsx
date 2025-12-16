import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { useProcessingStore } from '@/stores/processingStore';

export const ProcessingStatus = () => {
    const { isProcessing, progress } = useProcessingStore();

    if (!isProcessing || !progress) return null;

    const percent = progress.total_bytes > 0
        ? Math.min(100, Math.round((progress.processed_bytes / progress.total_bytes) * 100))
        : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 right-6 z-50 w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-4 overflow-hidden"
            >
                {/* Background Progress Bar */}
                <div
                    className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${percent}%` }}
                />

                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="text-sm font-medium text-zinc-100">Processing Files...</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                        {percent}%
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 overflow-hidden">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{progress.current_file_name}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-zinc-500">
                        <span>
                            {progress.processed_files_count} / {progress.total_files_count} files
                        </span>
                        {progress.tokens_saved > 0 && (
                            <span className="text-green-400">
                                {progress.tokens_saved.toLocaleString()} chars saved
                            </span>
                        )}
                        {progress.tokens_saved < 0 && (
                            <span className="text-amber-400">
                                {Math.abs(progress.tokens_saved).toLocaleString()} chars added
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
