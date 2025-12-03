// VirtualizedCodeViewer - High-performance virtualized code display
// Uses react-virtuoso for dynamic height support (code wrapping)
// Accepts pre-split lines array to avoid main thread string operations

import React, { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

interface VirtualizedCodeViewerProps {
    lines: string[];
    searchTerm?: string;
    searchMatches?: number[]; // Line indices that contain matches
    currentMatchIdx?: number;
    className?: string;
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
            style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace' }}
        >
            {lineNumber}
        </span>
        {/* Code content - allows wrapping for dynamic height */}
        <span 
            className="pl-4 whitespace-pre-wrap break-all text-[var(--theme-text-secondary)] flex-1"
            style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace' }}
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
}: VirtualizedCodeViewerProps) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);

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
                    style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace' }}
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
            <Virtuoso
                ref={virtuosoRef}
                totalCount={lines.length}
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
