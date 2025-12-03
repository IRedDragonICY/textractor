'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleButton } from './ui/GoogleButton';
import { GoogleIcon } from '@/lib/icons';
import { UI_ICONS_MAP } from '@/lib/icon-mapping';
import { ImportProgress, formatSpeed, formatETA, formatBytes, gitImportManager } from '@/lib/git-import-worker';

interface GlobalImportIndicatorProps {
    taskId: string | null;
    repoName: string;
    onComplete: () => void;
}

export const GlobalImportIndicator: React.FC<GlobalImportIndicatorProps> = ({ 
    taskId, 
    repoName, 
    onComplete 
}) => {
    const [progress, setProgress] = useState<ImportProgress | null>(null);
    const [isMinimized, setIsMinimized] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!taskId) {
            setProgress(null);
            return;
        }

        // Subscribe to task updates
        const unsubscribe = gitImportManager.subscribe(taskId, (newProgress) => {
            setProgress({ ...newProgress });
        });

        return () => {
            unsubscribe();
        };
    }, [taskId]);

    const handleCancel = () => {
        if (taskId) {
            gitImportManager.cancelTask(taskId);
        }
    };

    const isComplete = progress?.phase === 'complete';

    // Handle completion auto-dismiss
    useEffect(() => {
        if (isComplete) {
            const timer = setTimeout(() => {
                onComplete();
            }, 5000); // Auto-dismiss after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [isComplete, onComplete]);

    if (!progress || !taskId) return null;

    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    const isError = progress.phase === 'error';

    if (!isMinimized) {
        // Full modal view
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-[var(--theme-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setIsMinimized(true)}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[var(--theme-surface)] rounded-[28px] w-full max-w-lg shadow-2xl border border-[var(--theme-border)] overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center gap-4 p-6 border-b border-[var(--theme-border)]">
                        <div className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                            ${isComplete 
                                ? 'bg-green-500/20' 
                                : isError 
                                    ? 'bg-red-500/20'
                                    : 'bg-[var(--theme-primary)]/20'
                            }
                        `}>
                            {isComplete ? (
                                <GoogleIcon icon={UI_ICONS_MAP.check} className="w-6 h-6 text-green-500" />
                            ) : isError ? (
                                <GoogleIcon icon={UI_ICONS_MAP.warning} className="w-6 h-6 text-red-500" />
                            ) : (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                >
                                    <GoogleIcon icon={UI_ICONS_MAP.github} className="w-6 h-6 text-[var(--theme-primary)]" />
                                </motion.div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl text-[var(--theme-text-primary)] font-medium">
                                {isComplete ? 'Import Complete!' : isError ? 'Import Failed' : 'Importing Repository'}
                            </h3>
                            <p className="text-sm text-[var(--theme-text-tertiary)] truncate">
                                {repoName}
                            </p>
                        </div>
                        {!isComplete && !isError && (
                            <GoogleButton 
                                variant="icon" 
                                icon={UI_ICONS_MAP.minimize} 
                                onClick={() => setIsMinimized(true)}
                            />
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Progress Bar */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[var(--theme-text-secondary)]">
                                    {progress.phase === 'initializing' && 'Preparing...'}
                                    {progress.phase === 'fetching' && `Fetching files (${progress.current}/${progress.total})`}
                                    {progress.phase === 'processing' && 'Processing files...'}
                                    {progress.phase === 'complete' && `Successfully imported ${progress.completedFiles.length} files`}
                                    {progress.phase === 'error' && 'An error occurred'}
                                </span>
                                <span className="text-[var(--theme-text-primary)] font-mono font-medium">
                                    {Math.round(percentage)}%
                                </span>
                            </div>

                            <div className="h-2 bg-[var(--theme-surface-elevated)] rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${
                                        isComplete ? 'bg-green-500' : 
                                        isError ? 'bg-red-500' : 
                                        'bg-gradient-to-r from-[var(--theme-primary)] to-[#7FCFB6]'
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>

                        {/* Stats Grid - Only show during import */}
                        {!isComplete && !isError && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-[var(--theme-surface-elevated)] rounded-xl p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <GoogleIcon icon={UI_ICONS_MAP.speed} className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                                        <span className="text-xs text-[var(--theme-text-tertiary)]">Speed</span>
                                    </div>
                                    <span className="text-sm font-medium text-[var(--theme-text-primary)]">
                                        {formatSpeed(progress.speed)}
                                    </span>
                                </div>

                                <div className="bg-[var(--theme-surface-elevated)] rounded-xl p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <GoogleIcon icon={UI_ICONS_MAP.download} className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                                        <span className="text-xs text-[var(--theme-text-tertiary)]">Downloaded</span>
                                    </div>
                                    <span className="text-sm font-medium text-[var(--theme-text-primary)]">
                                        {formatBytes(progress.bytesDownloaded)}
                                    </span>
                                </div>

                                <div className="bg-[var(--theme-surface-elevated)] rounded-xl p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <GoogleIcon icon={UI_ICONS_MAP.timer} className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
                                        <span className="text-xs text-[var(--theme-text-tertiary)]">ETA</span>
                                    </div>
                                    <span className="text-sm font-medium text-[var(--theme-text-primary)]">
                                        {progress.eta > 0 ? formatETA(progress.eta) : '--'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Current file */}
                        {progress.phase === 'fetching' && progress.currentFile && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--theme-surface-elevated)] rounded-lg">
                                <motion.div
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <GoogleIcon icon={UI_ICONS_MAP.default_file} className="w-4 h-4 text-[var(--theme-primary)]" />
                                </motion.div>
                                <span className="text-xs text-[var(--theme-text-secondary)] font-mono truncate flex-1">
                                    {progress.currentFile}
                                </span>
                            </div>
                        )}

                        {/* Errors */}
                        {progress.errors.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <GoogleIcon icon={UI_ICONS_MAP.warning} className="w-4 h-4 text-red-500" />
                                    <span className="text-sm font-medium text-red-500">
                                        {progress.errors.length} {progress.errors.length === 1 ? 'error' : 'errors'}
                                    </span>
                                </div>
                                <div className="max-h-24 overflow-y-auto">
                                    {progress.errors.slice(0, 5).map((err, i) => (
                                        <p key={i} className="text-xs text-[var(--theme-text-secondary)] font-mono truncate">
                                            {err}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Success stats */}
                        {isComplete && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-500/10 rounded-xl p-4 text-center">
                                    <span className="text-2xl font-medium text-green-500">
                                        {progress.completedFiles.length}
                                    </span>
                                    <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">Files Imported</p>
                                </div>
                                <div className="bg-[var(--theme-surface-elevated)] rounded-xl p-4 text-center">
                                    <span className="text-2xl font-medium text-[var(--theme-text-primary)]">
                                        {formatBytes(progress.bytesDownloaded)}
                                    </span>
                                    <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">Total Size</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg)] flex justify-end gap-3">
                        {isComplete || isError ? (
                            <GoogleButton variant="filled" onClick={onComplete}>
                                {isComplete ? 'Done' : 'Close'}
                            </GoogleButton>
                        ) : (
                            <>
                                <GoogleButton variant="text" onClick={() => setIsMinimized(true)}>
                                    Minimize
                                </GoogleButton>
                                <GoogleButton 
                                    variant="tonal" 
                                    onClick={handleCancel}
                                    className="text-red-500"
                                >
                                    Cancel Import
                                </GoogleButton>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    // Minimized floating indicator
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 right-4 z-[60]"
        >
            <motion.div
                layout
                className={`
                    rounded-2xl shadow-lg border backdrop-blur-sm overflow-hidden
                    ${isComplete 
                        ? 'bg-green-500/20 border-green-500/30' 
                        : isError 
                            ? 'bg-red-500/20 border-red-500/30'
                            : 'bg-[var(--theme-surface)]/95 border-[var(--theme-border)]'
                    }
                `}
            >
                {/* Main indicator */}
                <motion.div
                    onClick={() => setIsMinimized(false)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer w-full"
                    role="button"
                    tabIndex={0}
                >
                    {/* Progress Ring */}
                    <div className="relative w-10 h-10 shrink-0">
                        <svg className="w-10 h-10 transform -rotate-90">
                            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--theme-border)" strokeWidth="3" />
                            <motion.circle
                                cx="20" cy="20" r="16" fill="none"
                                stroke={isComplete ? '#22c55e' : isError ? '#ef4444' : 'var(--theme-primary)'}
                                strokeWidth="3" strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: percentage / 100 }}
                                style={{ strokeDasharray: '100.5', strokeDashoffset: 0 }}
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--theme-text-primary)]">
                            {Math.round(percentage)}%
                        </span>
                    </div>

                    <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium text-[var(--theme-text-primary)] truncate max-w-[160px]">
                            {isComplete ? '✓ Import Complete' : isError ? '✗ Import Failed' : `Importing ${repoName}`}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)]">
                            {!isComplete && !isError && (
                                <>
                                    <span>{progress.current}/{progress.total}</span>
                                    <span className="text-[var(--theme-primary)]">•</span>
                                    <span>{formatSpeed(progress.speed)}</span>
                                    {progress.eta > 0 && (
                                        <>
                                            <span className="text-[var(--theme-primary)]">•</span>
                                            <span>{formatETA(progress.eta)}</span>
                                        </>
                                    )}
                                </>
                            )}
                            {isComplete && <span>{progress.completedFiles.length} files imported</span>}
                            {isError && <span>Click for details</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                        {/* Expand button */}
                        <div
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className="p-1.5 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
                            role="button"
                            tabIndex={0}
                        >
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                <GoogleIcon icon={UI_ICONS_MAP.chevron_right} className="w-4 h-4 rotate-90" />
                            </motion.div>
                        </div>

                        {!isComplete && !isError && (
                            <div
                                onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                                className="p-1.5 rounded-full hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-400 transition-colors cursor-pointer"
                                role="button"
                                tabIndex={0}
                            >
                                <GoogleIcon icon={UI_ICONS_MAP.close} className="w-4 h-4" />
                            </div>
                        )}

                        {(isComplete || isError) && (
                            <div
                                onClick={(e) => { e.stopPropagation(); onComplete(); }}
                                className="p-1.5 rounded-full hover:bg-[var(--theme-surface-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
                                role="button"
                                tabIndex={0}
                            >
                                <GoogleIcon icon={UI_ICONS_MAP.close} className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Expandable details */}
                <AnimatePresence>
                    {isExpanded && !isComplete && !isError && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-[var(--theme-border)] overflow-hidden"
                        >
                            <div className="p-3 space-y-2">
                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-[var(--theme-surface-elevated)] rounded-lg p-2">
                                        <span className="text-xs text-[var(--theme-text-tertiary)] block">Speed</span>
                                        <span className="text-sm font-medium text-[var(--theme-text-primary)]">{formatSpeed(progress.speed)}</span>
                                    </div>
                                    <div className="bg-[var(--theme-surface-elevated)] rounded-lg p-2">
                                        <span className="text-xs text-[var(--theme-text-tertiary)] block">Downloaded</span>
                                        <span className="text-sm font-medium text-[var(--theme-text-primary)]">{formatBytes(progress.bytesDownloaded)}</span>
                                    </div>
                                    <div className="bg-[var(--theme-surface-elevated)] rounded-lg p-2">
                                        <span className="text-xs text-[var(--theme-text-tertiary)] block">ETA</span>
                                        <span className="text-sm font-medium text-[var(--theme-text-primary)]">{progress.eta > 0 ? formatETA(progress.eta) : '--'}</span>
                                    </div>
                                </div>

                                {/* Current file */}
                                {progress.currentFile && (
                                    <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--theme-surface-elevated)] rounded-lg">
                                        <motion.div
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        >
                                            <GoogleIcon icon={UI_ICONS_MAP.default_file} className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                                        </motion.div>
                                        <span className="text-xs text-[var(--theme-text-secondary)] font-mono truncate">
                                            {progress.currentFile}
                                        </span>
                                    </div>
                                )}

                                {/* Errors indicator */}
                                {progress.errors.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-red-400">
                                        <GoogleIcon icon={UI_ICONS_MAP.warning} className="w-3.5 h-3.5" />
                                        <span>{progress.errors.length} errors - click for details</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};
