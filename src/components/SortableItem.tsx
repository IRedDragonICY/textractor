import React from 'react';
import { useSortable, defaultAnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileData } from '@/types';
import { FileCard } from './FileCard';

export const SortableItem = ({ file, onRemove, isDragging }: { file: FileData, onRemove: (id: string) => void, isDragging: boolean }) => {
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
            <FileCard file={file} onRemove={onRemove} />
        </li>
    );
};

