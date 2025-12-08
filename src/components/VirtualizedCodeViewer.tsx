// VirtualizedCodeViewer - High-performance virtualized code display
// Uses react-virtuoso for dynamic height support (code wrapping)
// Accepts pre-split lines array to avoid main thread string operations

import React, { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { GroupedVirtuoso, GroupedVirtuosoHandle } from 'react-virtuoso';

interface VirtualizedCodeViewerProps {
    lines: string[];
    searchTerm?: string;
    searchMatches?: number[]; // Line indices that contain matches
    currentMatchIdx?: number;
    className?: string;
    scrollToLine?: number | null;
    scrollRequestId?: number;
    fileGroups?: { id: string; label: string; count: number }[];
}

// Memoized line component for maximum performance
const CodeLine = memo(({ 
    content, 
    lineNumber, 
    isHighlighted,
    isCurrentMatch,
}: { 
    content: string; 
    lineNumber: number; 
    isHighlighted?: boolean;
    isCurrentMatch?: boolean;
}) => (
    <div 
        className={`flex ${
            isCurrentMatch 
                ? 'bg-[var(--theme-primary)]/30' 
                : isHighlighted 
                    ? 'bg-[var(--theme-primary)]/20' 
                    : ''
        }`}
        style={{
            fontSize: '13px',
            lineHeight: '1.6',
        }}
    >
        {/* Line number gutter - fixed width, non-selectable, stretches with content */}
        <span 
            className="w-12 shrink-0 text-right pr-3 text-[var(--theme-text-tertiary)] select-none bg-[var(--theme-surface)] border-r border-[var(--theme-border)] sticky left-0"
            style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
        >
            {lineNumber}
        </span>
        {/* Code content - allows wrapping for dynamic height */}
        <span 
            className="pl-4 whitespace-pre-wrap break-all text-[var(--theme-text-secondary)] flex-1"
            style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
        >
            {content || ' '} {/* Render space for empty lines to maintain height */}
        </span>
    </div>
));

CodeLine.displayName = 'CodeLine';

// Main virtualized viewer component
export const VirtualizedCodeViewer = memo(({
    lines,
    searchTerm = '',
    searchMatches = [],
    currentMatchIdx,
    className = '',
    scrollToLine,
    scrollRequestId,
    fileGroups,
}: VirtualizedCodeViewerProps) => {
    const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);

    const groupCounts = useMemo(() => {
        if (fileGroups?.length) {
            const counts = fileGroups.map(group => Math.max(0, group.count));
            const total = counts.reduce((sum, count) => sum + count, 0);

            if (total === lines.length) {
                return counts;
            }

            if (counts.length > 0) {
                const adjustedCounts = [...counts];
                adjustedCounts[adjustedCounts.length - 1] = Math.max(
                    0,
                    adjustedCounts[adjustedCounts.length - 1] + (lines.length - total)
                );
                return adjustedCounts;
            }
        }

        return [lines.length];
    }, [fileGroups, lines.length]);

    const renderGroupHeader = useCallback((groupIndex: number) => {
        if (!fileGroups || !fileGroups[groupIndex]) return null;
        const group = fileGroups[groupIndex];

        return (
            <div className="px-4 py-2 bg-[var(--theme-surface)] border-b border-[var(--theme-border)]">
                <span className="font-mono text-xs text-[var(--theme-text-secondary)]">
                    {group.label}
                </span>
            </div>
        );
    }, [fileGroups]);

    // Find which lines contain search matches - searchMatches now contains line indices directly
    const matchLineMap = useMemo(() => {
        if (!searchTerm || searchMatches.length === 0) {
            return { highlightedLines: new Set<number>(), matchToLine: new Map<number, number>() };
        }
        
        const highlightedLines = new Set<number>();
        const matchToLine = new Map<number, number>();
        
        for (let matchIdx = 0; matchIdx < searchMatches.length; matchIdx++) {
            const lineIndex = searchMatches[matchIdx];
            highlightedLines.add(lineIndex);
            matchToLine.set(matchIdx, lineIndex);
        }
        
        return { highlightedLines, matchToLine };
    }, [searchTerm, searchMatches]);

    // Get the line index for the current match
    const currentMatchLine = useMemo(() => {
        if (currentMatchIdx === undefined || currentMatchIdx < 0) return undefined;
        return matchLineMap.matchToLine.get(currentMatchIdx);
    }, [currentMatchIdx, matchLineMap.matchToLine]);

    // Scroll to current match when it changes
    useEffect(() => {
        if (currentMatchLine !== undefined && virtuosoRef.current) {
            virtuosoRef.current.scrollIntoView({
                index: currentMatchLine,
                behavior: 'smooth',
                align: 'center',
            });
        }
    }, [currentMatchLine]);

    // Scroll to a specific line when requested (e.g., clicking a file)
    useEffect(() => {
        if (
            scrollToLine !== undefined &&
            scrollToLine !== null &&
            scrollToLine >= 0 &&
            scrollToLine < lines.length &&
            virtuosoRef.current
        ) {
            virtuosoRef.current.scrollIntoView({
                index: scrollToLine,
                behavior: 'smooth',
                align: 'start',
            });
        }
    }, [scrollToLine, scrollRequestId, lines.length]);

    // Memoized row renderer
    const rowRenderer = useCallback((index: number) => {
        const isHighlighted = matchLineMap.highlightedLines.has(index);
        const isCurrentMatch = currentMatchLine === index;
        
        return (
            <CodeLine
                content={lines[index]}
                lineNumber={index + 1}
                isHighlighted={isHighlighted}
                isCurrentMatch={isCurrentMatch}
            />
        );
    }, [lines, matchLineMap.highlightedLines, currentMatchLine]);

    // Empty state
    if (lines.length === 0) {
        return (
            <div className={`flex items-center justify-center h-full text-[var(--theme-text-tertiary)] ${className}`}>
                <pre 
                    className="text-[13px] opacity-50"
                    style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                    {'// Output preview...'}
                </pre>
            </div>
        );
    }

    return (
        <div 
            className={`h-full overflow-hidden ${className}`}
            style={{
                contain: 'strict',
            }}
        >
            <GroupedVirtuoso
                ref={virtuosoRef}
                groupCounts={groupCounts}
                groupContent={renderGroupHeader}
                itemContent={rowRenderer}
                overscan={200}
                className="scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent"
                style={{ 
                    height: '100%',
                    overscrollBehavior: 'contain',
                }}
            />
        </div>
    );
});

VirtualizedCodeViewer.displayName = 'VirtualizedCodeViewer';

export default VirtualizedCodeViewer;
