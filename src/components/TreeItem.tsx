import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreeNode } from '@/types';
import { UI_ICONS_MAP } from '@/lib/icon-mapping';
import { getFileIconInfo } from '@/lib/icons';
import { formatNumber } from '@/lib/format';
import { GoogleIcon } from './ui/GoogleIcon';

export const TreeItem = ({ node, level, onRemove, onSelectFile, selectedIds }: { node: TreeNode, level: number, onRemove: (node: TreeNode) => void, onSelectFile?: (fileId: string, e?: React.MouseEvent) => void, selectedIds?: Set<string> }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isFolder = node.type === 'folder';
    const indent = level * 16;
    const isSelected = !isFolder && node.fileData ? selectedIds?.has(node.fileData.id) : false;

    const iconInfo = isFolder
        ? { icon: isOpen ? UI_ICONS_MAP.folder_open : UI_ICONS_MAP.folder, color: isOpen ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }
        : getFileIconInfo(node.name);

    const handleClick = (e: React.MouseEvent) => {
        if (isFolder) {
            setIsOpen(!isOpen);
        } else if (node.fileData && onSelectFile) {
            onSelectFile(node.fileData.id, e);
        }
    };

    return (
        <div className="select-none">
            <div
                className={`flex items-center py-1 pr-2 rounded-lg group transition-colors cursor-pointer hover:bg-[var(--theme-surface-hover)] border ${isSelected ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10' : 'border-transparent hover:border-[var(--theme-border)]'}`}
                style={{ paddingLeft: `${indent + 8}px` }}
                onClick={handleClick}
            >
                <div className="flex items-center flex-1 min-w-0 overflow-hidden">
                    <span className={`mr-1 text-[var(--theme-text-tertiary)] transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-90' : ''} ${!isFolder && 'opacity-0 w-4'}`}>
                        {isFolder && <GoogleIcon icon={UI_ICONS_MAP.chevron_right} className="w-4 h-4" />}
                    </span>

                    <span className="mr-2.5 flex-shrink-0">
                        <GoogleIcon icon={iconInfo.icon} style={{ color: iconInfo.color }} className="w-5 h-5" />
                    </span>

                    <span className={`text-[13px] truncate font-mono ${isFolder ? 'text-[var(--theme-text-primary)] font-bold tracking-tight' : 'text-[var(--theme-text-secondary)]'}`}>
                        {node.name}
                    </span>

                    {!isFolder && node.fileData && (
                        <span className="ml-auto text-[10px] text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--theme-surface)] px-1.5 py-0.5 rounded border border-[var(--theme-border)]">
                            {formatNumber(node.fileData.tokenCount)}
                        </span>
                    )}
                </div>

                {/* Delete Button - Now enabled for Folders too */}
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(node); }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-[var(--theme-text-secondary)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error)]/10 rounded-full transition-all ml-1 shrink-0"
                >
                    <GoogleIcon icon={UI_ICONS_MAP.delete} className="w-3.5 h-3.5" />
                </button>
            </div>

            <AnimatePresence>
                {isFolder && isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-l border-[var(--theme-border)]/30 ml-[calc(1rem+4px)]"
                    >
                        {node.children.map(child => (
                            <TreeItem key={child.id} node={child} level={level} onRemove={onRemove} onSelectFile={onSelectFile} selectedIds={selectedIds} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

