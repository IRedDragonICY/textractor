// Loading Skeleton Component - Smooth loading states
// Professional UI/UX with shimmer animations

import React, { memo } from 'react';
import { motion } from 'framer-motion';

// Pre-computed widths to avoid hydration mismatch (no Math.random())
const CODE_LINE_WIDTHS = [85, 62, 78, 45, 90, 55, 72, 38, 82, 68, 50, 75, 42, 88, 58];
const CODE_VIEW_WIDTHS = [75, 88, 45, 92, 60, 78, 35, 85, 52, 70, 40, 95, 55, 80, 48, 72, 38, 65, 82, 58];

// Shimmer animation for skeleton elements
const shimmer = {
    initial: { x: '-100%' },
    animate: { 
        x: '100%',
        transition: {
            repeat: Infinity,
            duration: 1.5,
            ease: 'linear',
        }
    }
};

// Base skeleton block with shimmer
const SkeletonBlock = memo(({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <div 
        className={`relative overflow-hidden bg-[var(--theme-surface-hover)] rounded ${className}`}
        style={style}
    >
        <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--theme-surface-elevated)]/50 to-transparent"
            variants={shimmer}
            initial="initial"
            animate="animate"
        />
    </div>
));

SkeletonBlock.displayName = 'SkeletonBlock';

// Skeleton for the main workspace
export const WorkspaceSkeleton = memo(() => (
    <div className="flex flex-1 h-full gap-4 p-4 animate-pulse">
        {/* Left sidebar skeleton */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
            {/* Upload area skeleton */}
            <SkeletonBlock className="h-32" />
            
            {/* Stats skeleton */}
            <div className="flex gap-2">
                <SkeletonBlock className="flex-1 h-16" />
                <SkeletonBlock className="flex-1 h-16" />
                <SkeletonBlock className="flex-1 h-16" />
            </div>
            
            {/* Explorer skeleton */}
            <div className="flex-1 flex flex-col gap-2">
                <SkeletonBlock className="h-10" />
                <div className="flex-1 space-y-2 p-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonBlock 
                            key={i} 
                            className="h-8" 
                            style={{ 
                                marginLeft: `${(i % 3) * 16}px`,
                                opacity: 1 - (i * 0.08)
                            }} 
                        />
                    ))}
                </div>
            </div>
        </div>
        
        {/* Right content skeleton */}
        <div className="flex-1 flex flex-col gap-4">
            {/* Search bar skeleton */}
            <div className="flex gap-4">
                <SkeletonBlock className="flex-1 h-12" />
                <SkeletonBlock className="w-32 h-12" />
                <SkeletonBlock className="w-24 h-12" />
            </div>
            
            {/* Code viewer skeleton */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-[var(--theme-border)]">
                <div className="flex h-full">
                    {/* Line numbers */}
                    <div className="w-12 bg-[var(--theme-surface)] border-r border-[var(--theme-border)] p-4 space-y-1">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <SkeletonBlock 
                                key={i} 
                                className="h-4 w-6 ml-auto" 
                                style={{ opacity: 1 - (i * 0.04) }}
                            />
                        ))}
                    </div>
                    
                    {/* Code content */}
                    <div className="flex-1 p-4 space-y-2">
                        {CODE_LINE_WIDTHS.map((width, i) => (
                            <SkeletonBlock 
                                key={i} 
                                className="h-5" 
                                style={{ 
                                    width: `${width}%`,
                                    opacity: 1 - (i * 0.05)
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
));

WorkspaceSkeleton.displayName = 'WorkspaceSkeleton';

// Skeleton for code viewer only
export const CodeViewerSkeleton = memo(() => (
    <div className="h-full flex">
        {/* Line numbers */}
        <div className="w-12 bg-[var(--theme-surface)] border-r border-[var(--theme-border)] p-4 space-y-1">
            {Array.from({ length: 25 }).map((_, i) => (
                <SkeletonBlock 
                    key={i} 
                    className="h-4 w-6 ml-auto" 
                    style={{ opacity: 1 - (i * 0.03) }}
                />
            ))}
        </div>
        
        {/* Code content */}
        <div className="flex-1 p-6 space-y-2">
            {CODE_VIEW_WIDTHS.map((width, i) => (
                <SkeletonBlock 
                    key={i} 
                    className="h-5" 
                    style={{ 
                        width: `${width}%`,
                        opacity: 1 - (i * 0.04)
                    }}
                />
            ))}
        </div>
    </div>
));

CodeViewerSkeleton.displayName = 'CodeViewerSkeleton';

// Loading spinner for smaller areas
export const LoadingSpinner = memo(({ size = 24, className = '' }: { size?: number; className?: string }) => (
    <motion.div
        className={`flex items-center justify-center ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
    >
        <motion.div
            className="border-2 border-[var(--theme-border)] border-t-[var(--theme-primary)] rounded-full"
            style={{ width: size, height: size }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
    </motion.div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

// Progress bar for file loading
export const LoadingProgress = memo(({ 
    progress, 
    label = 'Loading...' 
}: { 
    progress: number; 
    label?: string;
}) => (
    <motion.div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 shadow-2xl min-w-[300px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
    >
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--theme-text-secondary)]">{label}</span>
            <span className="text-sm text-[var(--theme-primary)] font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-[var(--theme-surface-hover)] rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-success)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
            />
        </div>
    </motion.div>
));

LoadingProgress.displayName = 'LoadingProgress';

export default WorkspaceSkeleton;
