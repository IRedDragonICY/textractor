// VirtualizedCodeViewer - High-performance virtualized code display
// Techniques: Virtual scrolling, GPU acceleration, content windowing
// Inspired by VS Code's Monaco Editor and top-tier code viewers

import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';

interface VirtualizedCodeViewerProps {
    content: string;
    lineNumbers: string;
    searchTerm?: string;
    currentMatchIdx?: number;
    searchMatches?: number[]; // Array of start positions
    onScroll?: (scrollTop: number) => void;
    className?: string;
}

// Constants for virtualization
const LINE_HEIGHT = 20.8; // 13px font * 1.6 line-height
const OVERSCAN_COUNT = 10; // Extra lines to render above/below viewport
const BUFFER_ZONE = 5; // Additional buffer for smooth scrolling

// Memoized line component for maximum performance
const CodeLine = memo(({ 
    content, 
    lineNumber, 
    style,
    isHighlighted 
}: { 
    content: string; 
    lineNumber: number; 
    style: React.CSSProperties;
    isHighlighted?: boolean;
}) => (
    <div 
        style={style} 
        className={`flex ${isHighlighted ? 'bg-[var(--theme-primary)]/20' : ''}`}
    >
        <span 
            className="w-12 shrink-0 text-right pr-3 text-[var(--theme-text-tertiary)] select-none border-r border-[var(--theme-border)] bg-[var(--theme-surface)]"
            style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace' }}
        >
            {lineNumber}
        </span>
        <span 
            className="pl-4 whitespace-pre text-[var(--theme-text-secondary)]"
            style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace' }}
        >
            {content}
        </span>
    </div>
));

CodeLine.displayName = 'CodeLine';

// Main virtualized viewer component
export const VirtualizedCodeViewer = memo(({
    content,
    searchTerm = '',
    searchMatches = [],
    onScroll,
    className = '',
}: VirtualizedCodeViewerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const rafRef = useRef<number | null>(null);
    
    // Split content into lines - memoized for performance
    const lines = useMemo(() => {
        if (!content) return [];
        return content.split('\n');
    }, [content]);

    const totalHeight = lines.length * LINE_HEIGHT;

    // Calculate visible range with overscan
    const { startIndex, visibleLines } = useMemo(() => {
        const start = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN_COUNT - BUFFER_ZONE);
        const visibleCount = Math.ceil(containerHeight / LINE_HEIGHT);
        const end = Math.min(lines.length, start + visibleCount + (OVERSCAN_COUNT * 2) + (BUFFER_ZONE * 2));
        
        const visible = lines.slice(start, end).map((line, idx) => ({
            content: line,
            lineNumber: start + idx + 1,
            index: start + idx,
        }));

        return { startIndex: start, endIndex: end, visibleLines: visible };
    }, [scrollTop, containerHeight, lines]);

    // High-performance scroll handler with RAF
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        
        // Cancel any pending RAF
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        // Use RAF for smooth 60fps updates
        rafRef.current = requestAnimationFrame(() => {
            setScrollTop(target.scrollTop);
            onScroll?.(target.scrollTop);
        });
    }, [onScroll]);

    // Update container height on resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use RAF for smooth resize handling
                requestAnimationFrame(() => {
                    setContainerHeight(entry.contentRect.height);
                });
            }
        });

        resizeObserver.observe(container);
        setContainerHeight(container.clientHeight);

        return () => {
            resizeObserver.disconnect();
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    // Find highlighted lines based on search
    const highlightedLines = useMemo(() => {
        if (!searchTerm || searchMatches.length === 0) return new Set<number>();
        
        const highlighted = new Set<number>();
        let charCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const lineStart = charCount;
            const lineEnd = charCount + lines[i].length;
            
            for (const matchStart of searchMatches) {
                if (matchStart >= lineStart && matchStart < lineEnd) {
                    highlighted.add(i);
                    break;
                }
            }
            
            charCount = lineEnd + 1; // +1 for newline
        }
        
        return highlighted;
    }, [searchTerm, searchMatches, lines]);

    // Empty state
    if (!content) {
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
            ref={containerRef}
            onScroll={handleScroll}
            className={`overflow-auto h-full scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent ${className}`}
            style={{
                // GPU acceleration hints
                willChange: 'scroll-position',
                contain: 'strict',
                overscrollBehavior: 'contain',
            }}
        >
            {/* Virtual spacer for total scroll height */}
            <div 
                style={{ 
                    height: totalHeight,
                    position: 'relative',
                    // GPU layer promotion
                    transform: 'translateZ(0)',
                    willChange: 'transform',
                }}
            >
                {/* Rendered content window */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        // GPU-accelerated positioning
                        transform: `translate3d(0, ${startIndex * LINE_HEIGHT}px, 0)`,
                        willChange: 'transform',
                    }}
                >
                    {visibleLines.map((line) => (
                        <CodeLine
                            key={line.index}
                            content={line.content}
                            lineNumber={line.lineNumber}
                            isHighlighted={highlightedLines.has(line.index)}
                            style={{
                                height: LINE_HEIGHT,
                                fontSize: '13px',
                                lineHeight: '1.6',
                                // Prevent layout thrashing
                                contain: 'layout style paint',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});

VirtualizedCodeViewer.displayName = 'VirtualizedCodeViewer';

export default VirtualizedCodeViewer;
