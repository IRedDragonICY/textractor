// Virtualized File List - Uses react-virtuoso for efficient rendering
// Handles dynamic heights and large file lists (277+ files)

import React, { useCallback, memo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { FileData } from '@/types';
import { FileCard } from './FileCard';

interface VirtualizedFileListProps {
    files: FileData[];
    onRemove: (id: string) => void;
}

// Memoized file item wrapper
const VirtualFileItem = memo(({ 
    file, 
    onRemove 
}: { 
    file: FileData; 
    onRemove: (id: string) => void;
}) => (
    <div className="px-2 pb-2">
        <FileCard file={file} onRemove={onRemove} />
    </div>
), (prev, next) => prev.file.id === next.file.id);

VirtualFileItem.displayName = 'VirtualFileItem';

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = memo(({ files, onRemove }) => {
    // Memoized row renderer
    const rowRenderer = useCallback((index: number) => {
        const file = files[index];
        return (
            <VirtualFileItem
                file={file}
                onRemove={onRemove}
            />
        );
    }, [files, onRemove]);

    // Empty state
    if (files.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--theme-text-tertiary)]">
                <span className="text-sm">No files selected</span>
            </div>
        );
    }

    return (
        <Virtuoso
            totalCount={files.length}
            itemContent={rowRenderer}
            overscan={200}
            className="scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent"
            style={{ 
                height: '100%',
                overscrollBehavior: 'contain',
            }}
        />
    );
});

VirtualizedFileList.displayName = 'VirtualizedFileList';
