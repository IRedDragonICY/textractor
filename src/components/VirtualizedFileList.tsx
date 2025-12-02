// Virtualized File List - Only renders visible items
// Drastically improves performance for large file lists (277+ files)

import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { FileData } from '@/types';
import { FileCard } from './FileCard';

const ITEM_HEIGHT = 64; // Height of each file card + margin
const OVERSCAN = 5; // Extra items to render above/below viewport

interface VirtualizedFileListProps {
    files: FileData[];
    onRemove: (id: string) => void;
}

const VirtualFileItem = memo(({ file, onRemove, style }: { 
    file: FileData; 
    onRemove: (id: string) => void;
    style: React.CSSProperties;
}) => (
    <div style={style} className="px-2">
        <FileCard file={file} onRemove={onRemove} />
    </div>
), (prev, next) => prev.file.id === next.file.id);

VirtualFileItem.displayName = 'VirtualFileItem';

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = memo(({ files, onRemove }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // Handle scroll
    const handleScroll = useCallback(() => {
        if (containerRef.current) {
            setScrollTop(containerRef.current.scrollTop);
        }
    }, []);

    // Observe container size
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            setContainerHeight(entries[0].contentRect.height);
        });
        observer.observe(container);
        setContainerHeight(container.clientHeight);

        return () => observer.disconnect();
    }, []);

    // Calculate visible range
    const totalHeight = files.length * ITEM_HEIGHT;
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(
        files.length,
        Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
    );

    // Get visible files
    const visibleFiles = files.slice(startIndex, endIndex);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent"
            style={{ contain: 'strict' }}
        >
            {/* Spacer for total scrollable area */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleFiles.map((file, idx) => (
                    <VirtualFileItem
                        key={file.id}
                        file={file}
                        onRemove={onRemove}
                        style={{
                            position: 'absolute',
                            top: (startIndex + idx) * ITEM_HEIGHT,
                            left: 0,
                            right: 0,
                            height: ITEM_HEIGHT,
                        }}
                    />
                ))}
            </div>
        </div>
    );
});

VirtualizedFileList.displayName = 'VirtualizedFileList';
