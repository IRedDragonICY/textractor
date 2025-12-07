import React, { memo } from 'react';
import { useSortable, defaultAnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileData } from '@/types';
import { FileCard } from './FileCard';

const SortableItemInner = ({ file, onRemove, onClick, isSelected, isDragging }: { file: FileData, onRemove: (id: string) => void, onClick?: (id: string, e: React.MouseEvent) => void, isSelected: boolean, isDragging: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: file.id,
        animateLayoutChanges: (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true })
    });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0 : 1,
    };
    return (
        <li ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2 touch-none">
            <FileCard file={file} onRemove={onRemove} onClick={onClick} isSelected={isSelected} />
        </li>
    );
};

// Memoize to prevent re-renders when other files change
export const SortableItem = memo(SortableItemInner, (prev, next) => {
    return prev.file.id === next.file.id && 
           prev.isDragging === next.isDragging &&
           prev.file.name === next.file.name &&
           prev.onClick === next.onClick &&
           prev.isSelected === next.isSelected;
});
SortableItem.displayName = 'SortableItem';

