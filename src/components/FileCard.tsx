import React from 'react';
import { FileData } from '@/types';
import { getFileIconInfo } from '@/lib/icons';
import { formatNumber } from '@/lib/format';
import { GoogleIcon } from './ui/GoogleIcon';
import { UI_ICONS } from '@/constants';

export const FileCard = React.memo(({ file, onRemove, isDragging = false }: { file: FileData, onRemove?: (id: string) => void, isDragging?: boolean }) => {
    const iconInfo = getFileIconInfo(file.name);
    return (
        <div className={`
            flex items-center p-3 rounded-xl transition-all duration-200 border
            ${isDragging
                ? 'bg-[#2D2E31] shadow-[0_8px_12px_6px_rgba(0,0,0,0.4),0_4px_4px_rgba(0,0,0,0.4)] border-[#A8C7FA]/50 scale-105 z-50 cursor-grabbing'
                : 'bg-[#1E1E1E] border-[#444746] hover:bg-[#2B2930] hover:border-[#8E918F] cursor-grab active:cursor-grabbing'
            }
        `}>
            <div className="w-8 h-8 rounded-lg bg-[#333537] flex items-center justify-center flex-shrink-0 mr-3">
                <GoogleIcon path={iconInfo.path} style={{ color: iconInfo.color }} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-[#E3E3E3] font-medium text-sm truncate" title={file.path}>{file.name}</h4>
                {file.isText && (
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#C4C7C5]">
                        <span className="truncate opacity-70 max-w-[120px]">{file.path}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-[#8E918F]"></span>
                        <span>{formatNumber(file.tokenCount)} tok</span>
                    </div>
                )}
            </div>
            {onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
                    className="p-1.5 text-[#C4C7C5] hover:text-[#F2B8B5] hover:bg-[#F2B8B5]/10 rounded-full transition-colors ml-2"
                    type="button"
                >
                    <GoogleIcon path={UI_ICONS.delete} className="w-4 h-4" />
                </button>
            )}
        </div>
    );
});
FileCard.displayName = 'FileCard';

