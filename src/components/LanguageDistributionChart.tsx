'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileData } from '@/types';
import { getLanguageConfig } from '@/constants/languages';

interface LanguageDistributionChartProps {
    files: FileData[];
}

interface LanguageStat {
    name: string;
    count: number;
    percentage: number;
    color: string;
}

export const LanguageDistributionChart: React.FC<LanguageDistributionChartProps> = ({ files }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const stats = useMemo(() => {
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
                    count,
                    percentage: (count / total) * 100,
                    color: config.color
                };
            })
            .sort((a, b) => b.count - a.count);

        // Group small percentages into "Other" if there are too many
        if (result.length > 5) {
            const top5 = result.slice(0, 4);
            const others = result.slice(4);
            const otherCount = others.reduce((acc, curr) => acc + curr.count, 0);
            const otherPercentage = others.reduce((acc, curr) => acc + curr.percentage, 0);
            
            return [
                ...top5,
                {
                    name: 'Other',
                    count: otherCount,
                    percentage: otherPercentage,
                    color: '#8E918F' // Gray for others
                }
            ];
        }

        return result;
    }, [files]);

    // Calculate SVG paths
    const size = 52; // Increased size for better visibility
    const radius = size / 2;
    const center = size / 2;
    let currentAngle = 0;

    const slices = stats.map((stat) => {
        const angle = (stat.percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle += angle;

        // Convert polar to cartesian
        const x1 = center + radius * Math.cos((startAngle - 90) * (Math.PI / 180));
        const y1 = center + radius * Math.sin((startAngle - 90) * (Math.PI / 180));
        const x2 = center + radius * Math.cos((endAngle - 90) * (Math.PI / 180));
        const y2 = center + radius * Math.sin((endAngle - 90) * (Math.PI / 180));

        // SVG Path command
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        // Special case for 100% (360 degrees) - SVG arc cannot draw a full circle with one command
        // We draw two 180 degree arcs or a full circle path
        let pathData;
        if (angle >= 359.9) {
            pathData = [
                `M ${center} ${center - radius}`,
                `A ${radius} ${radius} 0 1 1 ${center} ${center + radius}`,
                `A ${radius} ${radius} 0 1 1 ${center} ${center - radius}`,
                `Z`
            ].join(' ');
        } else {
            pathData = [
                `M ${center} ${center}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
            ].join(' ');
        }

        return { pathData, ...stat };
    });

    if (stats.length === 0) return null;

    return (
        <div className="relative flex items-center justify-center group">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {slices.map((slice, index) => (
                    <motion.path
                        key={slice.name}
                        d={slice.pathData}
                        fill={slice.color}
                        stroke="var(--theme-surface)"
                        strokeWidth="2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({
                                x: rect.left + rect.width / 2,
                                y: rect.top
                            });
                            setHoveredIndex(index);
                        }}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                    />
                ))}
                {/* Center hole for donut chart effect */}
                <circle cx={center} cy={center} r={radius * 0.55} fill="var(--theme-surface)" />
            </svg>

            {/* Portal Tooltip to avoid clipping */}
            <AnimatePresence>
                {hoveredIndex !== null && mounted && createPortal(
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            left: tooltipPos.x,
                            top: tooltipPos.y,
                            transform: 'translate(-50%, -100%)',
                            marginTop: -12,
                            zIndex: 9999
                        }}
                        className="bg-[var(--theme-surface-elevated)] border border-[var(--theme-border)] shadow-xl rounded-xl p-3 min-w-[180px] pointer-events-none"
                    >
                        <div className="text-xs font-medium text-[var(--theme-text-secondary)] mb-2">Language Distribution</div>
                        <div className="space-y-1">
                            {stats.map((stat) => (
                                <div key={stat.name} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                                        <span className="text-[var(--theme-text-primary)]">{stat.name}</span>
                                    </div>
                                    <span className="text-[var(--theme-text-tertiary)] font-mono">
                                        {Math.round(stat.percentage)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>,
                    document.body
                )}
            </AnimatePresence>
        </div>
    );
};
