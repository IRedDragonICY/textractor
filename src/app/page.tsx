'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    UniqueIdentifier
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { encode } from 'gpt-tokenizer';

const TEXT_FILE_EXTENSIONS = new Set([
    'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
    'less', 'json', 'xml', 'yaml', 'yml', 'py', 'java', 'c', 'cpp', 'cs',
    'go', 'rs', 'php', 'rb', 'pl', 'sh', 'bat', 'h', 'swift', 'kt', 'sql',
    'config', 'ini', 'env', 'gitignore', 'htaccess', 'log', 'csv', 'tsv', 'dart', 'arb'
]);

const MIME_TO_EXT: Record<string, string> = {
    'text/plain': 'txt', 'text/markdown': 'md', 'text/javascript': 'js',
    'text/html': 'html', 'text/css': 'css', 'application/json': 'json',
    'application/xml': 'xml', 'text/xml': 'xml', 'application/x-yaml': 'yaml',
    'text/yaml': 'yaml', 'text/x-python': 'py', 'application/x-python-code': 'py',
    'text/x-java-source': 'java', 'text/x-c': 'c', 'text/x-c++src': 'cpp',
    'text/x-csharp': 'cs', 'text/x-go': 'go', 'application/rust': 'rs',
    'application/x-httpd-php': 'php', 'text/x-ruby': 'rb', 'application/x-perl': 'pl',
    'application/x-sh': 'sh', 'application/bat': 'bat', 'text/x-h': 'h',
    'text/x-swift': 'swift', 'text/x-kotlin': 'kt', 'application/sql': 'sql',
    'text/csv': 'csv', 'text/tab-separated-values': 'tsv', 'application/dart': 'dart',
    'application/arb': 'arb', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg', 'application/pdf': 'pdf',
    'application/zip': 'zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-powerpoint': 'ppt',
};

interface FileData {
    id: string;
    name: string;
    content: string;
    isText: boolean;
    fileObject: File | Blob;
    linesOfCode: number;
    characterCount: number;
    tokenCount: number;
}

interface Statistics {
    totalFiles: number;
    totalTextFiles: number;
    totalNonTextFiles: number;
    totalLinesOfCode: number;
    totalCharacters: number;
    totalTokens: number;
    averageLinesPerFile: number;
    averageCharactersPerFile: number;
    averageTokensPerFile: number;
}

const isFileText = (name: string, type: string): boolean => {
    if (type?.startsWith('text/')) return true;
    const extension = name?.split('.').pop()?.toLowerCase();
    return !!extension && TEXT_FILE_EXTENSIONS.has(extension);
};

const getFileExtensionFromName = (filename: string): string => {
    return filename?.split('.').pop()?.toLowerCase() || 'text';
};

const getFileExtensionFromMime = (mimeType: string): string => {
    return MIME_TO_EXT[mimeType] || 'bin';
};

const generateFileName = (blob: Blob): string => {
    const timestamp = Date.now();
    const extension = getFileExtensionFromMime(blob.type);
    return `pasted_file_${timestamp}.${extension}`;
};

const countLinesOfCode = (content: string): number => {
    if (!content) return 0;
    return content.split('\n').filter(line => line.trim().length > 0).length;
};

const countTokens = (content: string): number => {
    if (!content) return 0;
    try {
        return encode(content).length;
    } catch (error) {
        console.error("Tokenization error:", error);
        return 0;
    }
};

const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const IconTextFile = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const IconGenericFile = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const IconUpload = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const IconCopy = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
    </svg>
);

const IconCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const IconInfo = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconWarning = ({ className }: { className?: string }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const IconCode = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const IconCharacter = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const IconFile = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const IconAverage = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
);

const IconToken = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10m16-10v10M8 4h8M8 20h8M9 9h6v6H9z" />
    </svg>
);

const FileIcon = React.memo(({ isTextFile }: { isTextFile: boolean }) => {
    return isTextFile ? <IconTextFile /> : <IconGenericFile />;
});
FileIcon.displayName = 'FileIcon';

const RemoveButton = React.memo(({ onClick, fileName }: { onClick: () => void; fileName: string }) => {
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onClick();
    }, [onClick]);

    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            className="ml-2 p-1.5 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-all duration-200 group"
            aria-label={`Remove file ${fileName}`}
            type="button"
        >
            <IconTrash />
        </motion.button>
    );
});
RemoveButton.displayName = 'RemoveButton';

const StatCard = React.memo(({ icon, label, value, valueColor = "text-blue-400", delay = 0 }: { icon: React.ReactNode; label: string; value: string | number; valueColor?: string; delay?: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: "easeOut" }}
            className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform duration-200">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-lg font-bold ${valueColor} truncate`}>{value}</p>
                </div>
            </div>
        </motion.div>
    );
});
StatCard.displayName = 'StatCard';

const FileTile = React.memo(({ file, onRemove, isDragging = false }: { file: FileData; onRemove?: (id: string) => void; isDragging?: boolean }) => {
    const handleRemoveAction = useCallback(() => {
        onRemove?.(file.id);
    }, [onRemove, file.id]);

    return (
        <div className={`bg-gradient-to-r from-gray-800/90 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/60 p-4 transition-all duration-300 shadow-sm group ${isDragging ? 'ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/20 scale-[1.02] border-blue-500/40' : 'hover:bg-gradient-to-r hover:from-gray-750/90 hover:to-gray-750/60 hover:border-gray-600/80 hover:shadow-md hover:shadow-gray-900/20'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0 select-none">
                    <div className="mr-3 text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <FileIcon isTextFile={file.isText} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-100 truncate text-sm">{file.name}</p>
                        {file.isText && (
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                    <IconCode />
                                    {formatNumber(file.linesOfCode)} lines
                                </span>
                                <span className="flex items-center gap-1">
                                    <IconCharacter />
                                    {formatNumber(file.characterCount)} chars
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                {onRemove && <RemoveButton onClick={handleRemoveAction} fileName={file.name} />}
            </div>
        </div>
    );
});
FileTile.displayName = 'FileTile';

const SortableItem = React.memo(({ file, onRemove, isDragging }: { file: FileData; onRemove: (id: string) => void; isDragging: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({ id: file.id });

    const style = useMemo(() => ({
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        zIndex: isDragging || isSorting ? 10 : 1,
        opacity: isDragging || isSorting ? 0.8 : 1,
    }), [transform, transition, isDragging, isSorting]);

    return (
        <motion.li
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={style}
            layoutId={file.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }}
            className={`cursor-grab active:cursor-grabbing select-none relative ${isDragging || isSorting ? 'pointer-events-none' : ''}`}
        >
            <FileTile file={file} onRemove={onRemove} isDragging={isDragging} />
        </motion.li>
    );
});
SortableItem.displayName = 'SortableItem';

const ToggleSwitch = React.memo(({ id, label, checked, onChange }: { id: string, label: string, checked: boolean, onChange: (checked: boolean) => void }) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.checked);
    }, [onChange]);

    return (
        <div className="flex items-center">
            <div className="relative inline-block w-11 mr-3 align-middle select-none transition duration-300 ease-in">
                <input
                    type="checkbox" id={id} checked={checked} onChange={handleChange}
                    className="sr-only peer"
                />
                <label htmlFor={id} className={`block overflow-hidden h-6 rounded-full cursor-pointer shadow-inner transition-all duration-300 ${ checked ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/25' : 'bg-gray-600 shadow-gray-700/50'} peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-800 peer-focus:ring-blue-500`} >
                    <motion.span
                        layout
                        className={`block w-4 h-4 m-1 rounded-full bg-white shadow-lg transform transition-all duration-300 ease-out ${ checked ? 'translate-x-5' : 'translate-x-0'}`}
                        aria-hidden="true"
                    />
                </label>
            </div>
            <label htmlFor={id} className="text-sm font-medium text-gray-300 cursor-pointer select-none">{label}</label>
        </div>
    );
});
ToggleSwitch.displayName = 'ToggleSwitch';

const MaterialButton = React.memo(({ children, onClick, variant = 'contained', color = 'primary', startIcon = null, className = '', disabled = false }: { children: React.ReactNode, onClick: (event: React.MouseEvent<HTMLButtonElement>) => void, variant?: 'contained' | 'outlined' | 'text', color?: 'primary' | 'error' | 'default', startIcon?: React.ReactNode, className?: string, disabled?: boolean }) => {
    const baseClasses = 'px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 uppercase tracking-wide shadow-lg backdrop-blur-sm';
    const disabledClasses = 'opacity-50 cursor-not-allowed';

    const colorVariantClasses = useMemo(() => {
        const styles = {
            primary: {
                contained: `bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-blue-500/25 hover:shadow-blue-500/40 focus:ring-blue-500 ${disabled ? '' : 'active:from-blue-800 active:to-blue-900 hover:scale-105'}`,
                outlined: `border-2 border-blue-500/60 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400 focus:ring-blue-500 backdrop-blur-sm ${disabled ? '' : 'active:bg-blue-500/20 hover:scale-105'}`,
                text: `text-blue-400 hover:bg-blue-500/10 focus:ring-blue-500 ${disabled ? '' : 'active:bg-blue-500/20 hover:scale-105'}`
            },
            error: {
                contained: `bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-red-500/25 hover:shadow-red-500/40 focus:ring-red-500 ${disabled ? '' : 'active:from-red-800 active:to-red-900 hover:scale-105'}`,
                outlined: `border-2 border-red-500/60 text-red-400 hover:bg-red-500/10 hover:border-red-400 focus:ring-red-500 ${disabled ? '' : 'active:bg-red-500/20 hover:scale-105'}`,
                text: `text-red-400 hover:bg-red-500/10 focus:ring-red-500 ${disabled ? '' : 'active:bg-red-500/20 hover:scale-105'}`
            },
            default: {
                contained: `bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 hover:from-gray-600 hover:to-gray-700 shadow-gray-700/25 hover:shadow-gray-600/40 focus:ring-gray-500 ${disabled ? '' : 'active:from-gray-800 active:to-gray-900 hover:scale-105'}`,
                outlined: `border-2 border-gray-500/60 text-gray-300 hover:bg-gray-500/10 hover:border-gray-400 focus:ring-gray-500 ${disabled ? '' : 'active:bg-gray-500/20 hover:scale-105'}`,
                text: `text-gray-300 hover:bg-gray-500/10 focus:ring-gray-500 ${disabled ? '' : 'active:bg-gray-500/20 hover:scale-105'}`
            }
        };
        return styles[color][variant];
    }, [color, variant, disabled]);

    return (
        <motion.button
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${colorVariantClasses} ${disabled ? disabledClasses : ''} ${className}`}
            type="button"
        >
            {startIcon && <span className="mr-2 -ml-1 h-4 w-4" aria-hidden="true">{startIcon}</span>}
            {children}
        </motion.button>
    );
});
MaterialButton.displayName = 'MaterialButton';

export default function Home() {
    const [files, setFiles] = useState<FileData[]>([]);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [textFilesOnly, setTextFilesOnly] = useState(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const processFileObject = useCallback(async (fileObject: File | Blob): Promise<FileData | null> => {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const name = (fileObject instanceof File) ? fileObject.name : generateFileName(fileObject);
        const type = fileObject.type || '';
        const isText = isFileText(name, type);
        let content = "";
        let linesOfCode = 0;
        let characterCount = 0;
        let tokenCount = 0;

        if (isText) {
            try {
                content = await fileObject.text();
                linesOfCode = countLinesOfCode(content);
                characterCount = content.length;
                tokenCount = countTokens(content);
            } catch (error) {
                console.error(`Error reading text file ${name}:`, error);
                content = "";
            }
        }

        return { id: fileId, name, content, isText, fileObject, linesOfCode, characterCount, tokenCount };
    }, []);

    const addFiles = useCallback((newFileObjects: (File | Blob)[]) => {
        if (!newFileObjects || newFileObjects.length === 0) return;

        Promise.all(newFileObjects.map(processFileObject))
            .then(newFilesData => {
                setFiles(prevFiles => {
                    const validNewFiles = newFilesData.filter((file): file is FileData => file !== null);
                    const uniqueNewFiles = validNewFiles.filter(newFile =>
                        !prevFiles.some(existingFile =>
                            existingFile.name === newFile.name &&
                            existingFile.fileObject.size === newFile.fileObject.size &&
                            (existingFile.fileObject instanceof File && newFile.fileObject instanceof File && existingFile.fileObject.lastModified === newFile.fileObject.lastModified)
                        )
                    );
                    return [...prevFiles, ...uniqueNewFiles];
                });
            })
            .catch(error => {
                console.error("Error processing files:", error);
                alert("An error occurred while processing some files.");
            });
    }, [processFileObject]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        addFiles(acceptedFiles);
    }, [addFiles]);

    const handlePaste = useCallback(async (event: ClipboardEvent) => {
        if (!event.clipboardData) return;

        if (event.clipboardData.files?.length > 0) {
            event.preventDefault();
            addFiles(Array.from(event.clipboardData.files));
            return;
        }

        if (!navigator.clipboard?.read) return;

        try {
            const clipboardItems = await navigator.clipboard.read();
            const fileBlobs: Blob[] = [];
            for (const item of clipboardItems) {
                const fileLikeTypes = item.types.filter(type =>
                    !type.startsWith('text/') || type === 'text/plain'
                );

                for (const type of fileLikeTypes) {
                    try {
                        const blob = await item.getType(type);
                        if (blob instanceof Blob && blob.size > 0) {
                            if (type === 'text/plain') {
                                const text = await blob.text();
                                if (text.split('\n').every(line => line.trim().length > 0 && !line.includes(' '))) {
                                    continue;
                                }
                            }
                           fileBlobs.push(blob);
                           break;
                        }
                    } catch (err) { console.warn(`Could not get clipboard type ${type}:`, err); }
                }
            }

            if (fileBlobs.length > 0) {
                event.preventDefault();
                addFiles(fileBlobs);
            }
        } catch (err) {
             if (err instanceof Error && err.name === 'NotAllowedError') {
                 console.warn('Clipboard permission denied.');
            } else { console.error('Failed to read clipboard contents: ', err); }
        }
    }, [addFiles]);

    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop, noClick: true, noKeyboard: true,
    });

    const statistics = useMemo((): Statistics => {
        const filesToConsider = textFilesOnly ? files.filter(f => f.isText) : files;
        const textFiles = filesToConsider.filter(f => f.isText);
        const totalLinesOfCode = textFiles.reduce((sum, file) => sum + file.linesOfCode, 0);
        const totalCharacters = textFiles.reduce((sum, file) => sum + file.characterCount, 0);
        const totalTokens = textFiles.reduce((sum, file) => sum + file.tokenCount, 0);

        return {
            totalFiles: filesToConsider.length,
            totalTextFiles: textFiles.length,
            totalNonTextFiles: filesToConsider.length - textFiles.length,
            totalLinesOfCode,
            totalCharacters,
            totalTokens,
            averageLinesPerFile: textFiles.length > 0 ? Math.round(totalLinesOfCode / textFiles.length) : 0,
            averageCharactersPerFile: textFiles.length > 0 ? Math.round(totalCharacters / textFiles.length) : 0,
            averageTokensPerFile: textFiles.length > 0 ? Math.round(totalTokens / textFiles.length) : 0,
        };
    }, [files, textFilesOnly]);

    const combinedText = useMemo(() => {
        const filesToConsider = textFilesOnly ? files.filter(f => f.isText) : files;
        return filesToConsider
            .filter(file => file.isText && file.content)
            .map(file => {
                const extension = getFileExtensionFromName(file.name);
                const contentStr = file.content || "";
                const contentWithNewline = contentStr + (contentStr.endsWith('\n') ? '' : '\n');
                return `${file.name}\n\`\`\`${extension}\n${contentWithNewline}\`\`\``;
            })
            .join('\n\n');
    }, [files, textFilesOnly]);

    const hasNonTextFiles = useMemo(() => textFilesOnly && files.some(file => !file.isText), [files, textFilesOnly]);
    const handleDragStart = useCallback((event: DragStartEvent) => { document.body.style.cursor = 'grabbing'; setActiveId(event.active.id); }, []);
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        document.body.style.cursor = '';
        const { active, over } = event;
        setActiveId(null);
        if (over && active.id !== over.id) {
            setFiles(items => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return (oldIndex !== -1 && newIndex !== -1) ? arrayMove(items, oldIndex, newIndex) : items;
            });
        }
    }, []);

    const removeFile = useCallback((id: string) => setFiles(prev => prev.filter(file => file.id !== id)), []);
    const openDeleteConfirmation = useCallback(() => setDeleteConfirmOpen(true), []);
    const closeDeleteConfirmation = useCallback(() => setDeleteConfirmOpen(false), []);
    const deleteAllFiles = useCallback(() => { setFiles([]); closeDeleteConfirmation(); }, [closeDeleteConfirmation]);

    const copyToClipboard = useCallback(() => {
        if (!combinedText) return;
        navigator.clipboard.writeText(combinedText).then(() => {
            setIsCopied(true);
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 3000);
        }).catch(err => { console.error('Could not copy text: ', err); alert('Failed to copy text.'); });
    }, [combinedText]);

    const handleTextFilesOnlyChange = useCallback((checked: boolean) => setTextFilesOnly(checked), []);
    const activeFile = useMemo(() => activeId ? files.find(file => file.id === activeId) : null, [activeId, files]);
    const fileIds = useMemo(() => files.map(file => file.id), [files]);

    useEffect(() => () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); }, []);

    return (
        <div {...getRootProps()} className={`min-h-screen flex flex-col relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-gray-200 isolate ${isDragActive ? 'cursor-copy' : ''}`} >
            <input {...getInputProps()} />

            <header className="px-6 md:px-10 py-6 border-b border-gray-700/30 backdrop-blur-sm bg-gray-900/80 shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ delay: 0.1, duration: 0.6, type: "spring", stiffness: 150 }}
                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0"
                            aria-hidden="true"
                        >
                            <IconTextFile />
                        </motion.div>
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                                className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight"
                            >
                                Textractor
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
                                className="text-sm text-gray-400 font-medium"
                            >
                                Extract and combine text from multiple files
                            </motion.p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col xl:flex-row max-w-7xl w-full mx-auto p-6 md:p-10 gap-8 min-h-0">
                <motion.section
                    aria-labelledby="settings-and-files-heading"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full xl:w-2/5 flex flex-col gap-6 flex-shrink-0 min-h-0"
                >
                    <h2 id="settings-and-files-heading" className="sr-only">Settings and Uploaded Files</h2>

                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl shrink-0">
                        <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            Settings
                        </h3>
                        <ToggleSwitch id="text-files-only" label="Combine Text Files Only" checked={textFilesOnly} onChange={handleTextFilesOnlyChange} />
                    </div>

                    <AnimatePresence>
                        {files.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="grid grid-cols-2 md:grid-cols-3 gap-4 shrink-0"
                            >
                                <StatCard icon={<IconFile />} label="Total Files" value={statistics.totalFiles} delay={0.1} />
                                <StatCard icon={<IconCharacter />} label="Characters" value={formatNumber(statistics.totalCharacters)} delay={0.2} />
                                <StatCard icon={<IconCode />} label="Lines of Code" value={formatNumber(statistics.totalLinesOfCode)} delay={0.3} />
                                <StatCard icon={<IconToken />} label="Total Tokens" value={formatNumber(statistics.totalTokens)} delay={0.4} />
                                <StatCard icon={<IconAverage />} label="Avg Lines/File" value={statistics.averageLinesPerFile} delay={0.5} />
                                <StatCard icon={<IconAverage />} label="Avg Tokens/File" value={statistics.averageTokensPerFile} delay={0.6} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div
                        role="button"
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(); }}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group ${isDragActive ? 'border-blue-500/80 bg-blue-500/5 scale-[1.02] shadow-lg shadow-blue-500/20' : 'border-gray-700/60 hover:border-blue-500/60 hover:bg-blue-500/5'} shadow-sm shrink-0`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex flex-col items-center justify-center pointer-events-none">
                            <motion.div
                                animate={isDragActive ? { y: [-5, 0, -5] } : {}}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <IconUpload className={`w-12 h-12 mb-4 transition-all duration-300 ${isDragActive ? 'text-blue-400 scale-110' : 'text-gray-500 group-hover:text-blue-400 group-hover:scale-110'}`} />
                            </motion.div>
                            <p className="text-lg font-bold mb-2 text-gray-200 group-hover:text-blue-300 transition-colors duration-300">
                                {isDragActive ? 'Drop files to upload' : 'Click or Drag/Paste Files Here'}
                            </p>
                            <p className="text-gray-400 text-sm font-medium">Select multiple files • Supports paste from clipboard</p>
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {files.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex flex-col flex-grow min-h-0"
                            >
                                <div className="flex justify-between items-center mb-4 px-1 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            Files
                                        </h3>
                                        <motion.span
                                            key={files.length}
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                            className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full h-6 w-6 text-xs font-bold shadow-lg"
                                            aria-live="polite"
                                        >
                                            {files.length}
                                        </motion.span>
                                    </div>
                                    <MaterialButton variant="outlined" color="error" onClick={openDeleteConfirmation} disabled={files.length === 0} startIcon={<IconTrash />} >
                                        Clear All
                                    </MaterialButton>
                                </div>

                                {hasNonTextFiles && (
                                    <motion.div
                                        role="status"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4 mb-4 text-sm text-blue-300 flex items-center backdrop-blur-sm overflow-hidden shrink-0"
                                    >
                                        <IconInfo className="h-5 w-5 mr-3 flex-shrink-0" />
                                        <span className="leading-relaxed font-medium">Only text files will be included in the combined output.</span>
                                    </motion.div>
                                )}

                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} >
                                    <div className="flex-grow overflow-y-auto min-h-[200px] pr-2 -mr-2 border border-gray-700/30 rounded-xl bg-gradient-to-b from-gray-800/20 to-gray-800/5 backdrop-blur-sm shadow-inner scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-transparent">
                                        <SortableContext items={fileIds} strategy={verticalListSortingStrategy}>
                                            <motion.ul layout className="space-y-3 p-4">
                                                <AnimatePresence initial={false}>
                                                    {files.map((file) => <SortableItem key={file.id} file={file} onRemove={removeFile} isDragging={activeId === file.id} /> )}
                                                </AnimatePresence>
                                            </motion.ul>
                                        </SortableContext>
                                    </div>
                                    <DragOverlay adjustScale={false} zIndex={1000}>
                                        {activeFile && (
                                            <div className="w-full select-none opacity-90 cursor-grabbing px-2 transform rotate-3 scale-105">
                                                <FileTile file={activeFile} isDragging={true} />
                                            </div>
                                        )}
                                    </DragOverlay>
                                </DndContext>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>

                <motion.section
                    aria-labelledby="combined-text-heading"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    className="w-full xl:w-3/5 flex flex-col min-h-0"
                >
                    <AnimatePresence mode="wait">
                        {files.length > 0 ? (
                            <motion.div
                                key="output-area-present"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="bg-gradient-to-br from-gray-800/90 to-gray-800/60 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6 flex flex-col flex-grow"
                            >
                                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                    <h2 id="combined-text-heading" className="text-lg font-bold text-gray-100 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        Combined Text {textFilesOnly ? '(Text Files Only)' : ''}
                                    </h2>
                                    <div className="relative flex-shrink-0">
                                        <MaterialButton
                                            onClick={copyToClipboard}
                                            disabled={!combinedText || isCopied}
                                            startIcon={isCopied ? <IconCheck /> : <IconCopy />}
                                            color={isCopied ? 'default' : 'primary'}
                                        >
                                            {isCopied ? 'Copied!' : 'Copy Text'}
                                        </MaterialButton>
                                    </div>
                                </div>
                                <div className="relative flex-grow min-h-0">
                                    <textarea
                                        ref={textAreaRef}
                                        value={combinedText}
                                        readOnly
                                        className="w-full h-full p-4 bg-gray-900/80 backdrop-blur-sm border border-gray-700/60 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 text-gray-300 resize-none scrollbar-thin scrollbar-thumb-gray-600/60 scrollbar-track-gray-800/30 shadow-inner transition-all duration-300"
                                        placeholder={files.length > 0 ? "Combined text will appear here..." : "Upload or paste files..."}
                                        aria-label="Combined text output"
                                    />
                                    <AnimatePresence>
                                        {isCopied && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                className="absolute bottom-4 right-4 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold backdrop-blur-sm pointer-events-none border border-green-500/30"
                                                role="status"
                                            >
                                                ✓ Copied to clipboard!
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="output-area-empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex-grow flex items-center justify-center bg-gradient-to-br from-gray-800/40 to-gray-800/20 backdrop-blur-sm rounded-2xl border border-dashed border-gray-700/60 p-12 text-center text-gray-500"
                            >
                                <div className="max-w-md">
                                    <motion.div
                                        animate={{ y: [-10, 0, -10] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                        className="mb-6"
                                    >
                                        <IconTextFile />
                                    </motion.div>
                                    <p className="text-xl font-bold mt-4 text-gray-300 mb-2" id="combined-text-heading">Combined Text Output</p>
                                    <p className="text-sm text-gray-400 font-medium">Upload or paste files on the left to see the combined content here.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>
            </main>

            <AnimatePresence>
                {isDragActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-gray-900/80 backdrop-blur-md flex items-center justify-center z-50 pointer-events-none"
                        aria-hidden="true"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="bg-gradient-to-br from-gray-800/90 to-gray-800/70 backdrop-blur-sm p-12 rounded-2xl border-2 border-dashed border-blue-500/80 max-w-lg w-full text-center shadow-2xl shadow-blue-500/20"
                        >
                            <motion.div
                                animate={{ y: [-12, 0, -12] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                className="mx-auto mb-8"
                            >
                                <IconUpload className="w-24 h-24 text-blue-400 mx-auto" />
                            </motion.div>
                            <h2 className="text-3xl font-bold text-white mb-3">Drop Files to Upload</h2>
                            <p className="text-gray-300 text-lg font-medium">Release your mouse button to add files</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteConfirmOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-gray-900/80 backdrop-blur-md flex items-center justify-center z-[1001] p-4"
                        onClick={closeDeleteConfirmation}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-dialog-title"
                        aria-describedby="delete-dialog-description"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="bg-gradient-to-br from-gray-800/95 to-gray-800/85 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/60 max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                            role="document"
                        >
                            <div className="flex items-start mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mr-4 flex-shrink-0 mt-1" aria-hidden="true">
                                    <IconWarning className="h-7 w-7 text-red-500" />
                                </div>
                                <div>
                                    <h3 id="delete-dialog-title" className="text-2xl font-bold text-gray-100">Delete All Files?</h3>
                                    <p id="delete-dialog-description" className="text-gray-300 text-sm mt-3 leading-relaxed">
                                        Are you sure you want to delete all <span className="font-semibold text-red-400">{files.length}</span> uploaded file{files.length !== 1 ? 's' : ''}? This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 mt-8">
                                <MaterialButton variant="outlined" color="default" onClick={closeDeleteConfirmation}>
                                    Cancel
                                </MaterialButton>
                                <MaterialButton color="error" variant="contained" onClick={deleteAllFiles} startIcon={<IconTrash />} >
                                    Delete All
                                </MaterialButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}