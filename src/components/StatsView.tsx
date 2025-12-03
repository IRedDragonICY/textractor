'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileData } from '@/types';
import { formatNumber } from '@/lib/format';
import { getLanguageConfig } from '@/constants/languages';

interface StatsViewProps {
    files: FileData[];
    stats: {
        count: number;
        lines: number;
        tokens: number;
    };
}

interface LanguageStat {
    name: string;
    ext: string;
    count: number;
    percentage: number;
    color: string;
}

export const StatsView: React.FC<StatsViewProps> = ({ files, stats }) => {
    const languageStats = useMemo(() => {
        const counts: Record<string, number> = {};
        let total = 0;

        files.forEach(file => {
            if (!file.isText) return;
            const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
            counts[ext] = (counts[ext] || 0) + 1;
            total++;
        });

        if (total === 0) return [];

        const result: LanguageStat[] = Object.entries(counts)
            .map(([ext, count]) => {
                const config = getLanguageConfig(ext);
                return {
                    name: config.name,
                    ext,
                    count,
                    percentage: (count / total) * 100,
                    color: config.color
                };
            })
            .sort((a, b) => b.count - a.count);

        return result;
    }, [files]);

    // Calculate pie chart segments
    const size = 120;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    let accumulatedOffset = 0;
    const segments = languageStats.map((stat) => {
        const segmentLength = (stat.percentage / 100) * circumference;
        const offset = accumulatedOffset;
        accumulatedOffset += segmentLength;
        return { ...stat, segmentLength, offset };
    });

    if (languageStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[var(--theme-text-tertiary)] p-4">
                <p className="text-sm">No files to analyze</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
            {/* Pie Chart */}
            <div className="flex flex-col items-center py-6 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border)]">
                <div className="relative">
                    <svg width={size} height={size} className="transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke="var(--theme-border)"
                            strokeWidth={strokeWidth}
                        />
                        {/* Segments */}
                        {segments.map((segment, index) => (
                            <motion.circle
                                key={segment.ext}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${segment.segmentLength} ${circumference}`}
                                strokeDashoffset={-segment.offset}
                                strokeLinecap="butt"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05, duration: 0.3 }}
                            />
                        ))}
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-[var(--theme-text-primary)]">{languageStats.length}</span>
                        <span className="text-[10px] text-[var(--theme-text-tertiary)] uppercase tracking-wide">Languages</span>
                    </div>
                </div>
                <div className="mt-4 text-xs font-medium text-[var(--theme-text-secondary)]">Language Distribution</div>
            </div>

            {/* Legend / Language List */}
            <div className="bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border)] overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--theme-border)]">
                    <span className="text-[10px] font-semibold text-[var(--theme-text-tertiary)] uppercase tracking-wider">Languages</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                    {languageStats.map((stat, index) => (
                        <motion.div
                            key={stat.ext}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center justify-between px-3 py-2 hover:bg-[var(--theme-surface-hover)] transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-sm shrink-0" 
                                    style={{ backgroundColor: stat.color }} 
                                />
                                <span className="text-xs text-[var(--theme-text-primary)] truncate">{stat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-[var(--theme-text-tertiary)] font-mono">{stat.count}</span>
                                <span className="text-xs text-[var(--theme-text-secondary)] font-mono min-w-[40px] text-right">
                                    {stat.percentage.toFixed(1)}%
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-2">
                <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] flex items-center justify-between">
                    <span className="text-[var(--theme-text-secondary)] text-xs">Total Files</span>
                    <span className="text-[var(--theme-text-primary)] font-mono font-medium text-sm">{stats.count}</span>
                </div>
                <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] flex items-center justify-between">
                    <span className="text-[var(--theme-text-secondary)] text-xs">Total Lines</span>
                    <span className="text-[var(--theme-text-primary)] font-mono font-medium text-sm">{formatNumber(stats.lines)}</span>
                </div>
                <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] flex items-center justify-between">
                    <span className="text-[var(--theme-text-secondary)] text-xs">Total Tokens</span>
                    <span className="text-[var(--theme-text-primary)] font-mono font-medium text-sm">{formatNumber(stats.tokens)}</span>
                </div>
            </div>
        </div>
    );
};
