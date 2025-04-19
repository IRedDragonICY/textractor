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

const TEXT_FILE_EXTENSIONS = new Set([
    'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
    'less', 'json', 'xml', 'yaml', 'yml', 'py', 'java', 'c', 'cpp', 'cs',
    'go', 'rs', 'php', 'rb', 'pl', 'sh', 'bat', 'h', 'swift', 'kt', 'sql',
    'config', 'ini', 'env', 'gitignore', 'htaccess', 'log', 'csv', 'tsv', 'dart' // Added dart
]);

interface FileData {
    id: string;
    name: string;
    content: string;
    isText: boolean;
}

const FileIcon = React.memo(({ isTextFile }: { isTextFile: boolean }) => {
    return isTextFile ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    );
});
FileIcon.displayName = 'FileIcon';


const RemoveButton = React.memo(({ onClick, fileName }: { onClick: () => void; fileName: string }) => (
    <button
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onClick();
        }}
        className="ml-2 p-1.5 rounded-full text-gray-400 hover:text-red-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-colors duration-200"
        aria-label={`Remove file ${fileName}`}
        type="button"
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
    </button>
));
RemoveButton.displayName = 'RemoveButton';


const FileTile = React.memo(({ file, onRemove, isDragging = false }: { file: FileData; onRemove?: (id: string) => void; isDragging?: boolean }) => {
    const handleRemoveAction = useCallback(() => {
        onRemove?.(file.id);
    }, [onRemove, file.id]);

    return (
        <div className={`bg-gray-800 rounded-lg border border-gray-700 p-3 flex items-center justify-between transition-all duration-200 shadow-sm ${isDragging ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 scale-[1.01]' : 'hover:bg-gray-750 hover:border-gray-600'}`}>
            <div className="flex items-center flex-1 min-w-0 select-none">
                <div className="mr-3 text-blue-400 flex-shrink-0">
                    <FileIcon isTextFile={file.isText} />
                </div>
                <div className="truncate flex-1 min-w-0">
                    <p className="font-medium text-gray-100 truncate text-sm">{file.name}</p>
                </div>
            </div>
            {onRemove && <RemoveButton onClick={handleRemoveAction} fileName={file.name} />}
        </div>
    );
});
FileTile.displayName = 'FileTile';


const SortableItem = React.memo(({ file, onRemove, isDragging }: { file: FileData; onRemove: (id: string) => void; isDragging: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({ id: file.id });

    const style = useMemo(() => ({
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 250ms ease',
        zIndex: isDragging || isSorting ? 10 : 1,
        opacity: isDragging || isSorting ? 0.5 : 1,
        '--tw-scale-x': isDragging || isSorting ? '0.98' : '1',
        '--tw-scale-y': isDragging || isSorting ? '0.98' : '1',
    }), [transform, transition, isDragging, isSorting]);

    return (
        <motion.li
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={style}
            layoutId={file.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
            className={`cursor-grab active:cursor-grabbing select-none relative transform scale-100 ${isDragging || isSorting ? 'pointer-events-none' : ''}`}
        >
            <FileTile file={file} onRemove={onRemove} />
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
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                    type="checkbox"
                    id={id}
                    checked={checked}
                    onChange={handleChange}
                    className="sr-only peer"
                />
                <label
                    htmlFor={id}
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                        checked ? 'bg-blue-600' : 'bg-gray-600'
                    } peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-800 peer-focus:ring-blue-500`}
                >
                    <span
                        className={`block w-4 h-4 m-1 rounded-full bg-white shadow transform transition-transform duration-200 ease-in ${
                            checked ? 'translate-x-4' : 'translate-x-0'
                        }`}
                        aria-hidden="true"
                    />
                </label>
            </div>
            <label htmlFor={id} className="text-sm text-gray-300 cursor-pointer select-none">
                {label}
            </label>
        </div>
    );
});
ToggleSwitch.displayName = 'ToggleSwitch';


const MaterialButton = React.memo(({
                                       children,
                                       onClick,
                                       variant = 'contained',
                                       color = 'primary',
                                       startIcon = null,
                                       className = '',
                                       disabled = false
                                   }: {
    children: React.ReactNode,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void,
    variant?: 'contained' | 'outlined' | 'text',
    color?: 'primary' | 'error' | 'default',
    startIcon?: React.ReactNode,
    className?: string,
    disabled?: boolean
}) => {
    const baseClasses = 'px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 uppercase tracking-wider';
    const disabledClasses = 'opacity-50 cursor-not-allowed';

    const colorClasses = useMemo(() => ({
        primary: {
            contained: `bg-blue-600 text-white hover:bg-blue-700 shadow hover:shadow-md focus:ring-blue-500 ${disabled ? '' : 'active:bg-blue-800'}`,
            outlined: `border border-blue-500 text-blue-400 hover:bg-blue-500/10 focus:ring-blue-500 ${disabled ? '' : 'active:bg-blue-500/20'}`,
            text: `text-blue-400 hover:bg-blue-500/10 focus:ring-blue-500 ${disabled ? '' : 'active:bg-blue-500/20'}`
        },
        error: {
            contained: `bg-red-600 text-white hover:bg-red-700 shadow hover:shadow-md focus:ring-red-500 ${disabled ? '' : 'active:bg-red-800'}`,
            outlined: `border border-red-500 text-red-400 hover:bg-red-500/10 focus:ring-red-500 ${disabled ? '' : 'active:bg-red-500/20'}`,
            text: `text-red-400 hover:bg-red-500/10 focus:ring-red-500 ${disabled ? '' : 'active:bg-red-500/20'}`
        },
        default: {
            contained: `bg-gray-700 text-gray-200 hover:bg-gray-600 shadow hover:shadow-md focus:ring-gray-500 ${disabled ? '' : 'active:bg-gray-800'}`,
            outlined: `border border-gray-500 text-gray-300 hover:bg-gray-500/10 focus:ring-gray-500 ${disabled ? '' : 'active:bg-gray-500/20'}`,
            text: `text-gray-300 hover:bg-gray-500/10 focus:ring-gray-500 ${disabled ? '' : 'active:bg-gray-500/20'}`
        }
    }), [disabled]);

    const variantClasses = colorClasses[color][variant];

    return (
        <motion.button
            whileHover={!disabled ? { scale: 1.03, transition: { duration: 0.15 } } : {}}
            whileTap={!disabled ? { scale: 0.97, transition: { duration: 0.1 } } : {}}
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses} ${disabled ? disabledClasses : ''} ${className}`}
            type="button"
        >
            {startIcon && <span className="mr-1.5 -ml-0.5 h-4 w-4" aria-hidden="true">{startIcon}</span>}
            {children}
        </motion.button>
    );
});
MaterialButton.displayName = 'MaterialButton';

const isFileText = (filename: string): boolean => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return !!extension && TEXT_FILE_EXTENSIONS.has(extension);
};

const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || 'text';
};

export default function Home() {
    const [files, setFiles] = useState<FileData[]>([]);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [textFilesOnly, setTextFilesOnly] = useState(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const combinedText = useMemo(() => {
        const filesToConsider = textFilesOnly
            ? files.filter(file => file.isText)
            : files;

        const outputBlocks = filesToConsider
            .filter(file => file.isText && file.content) // Ensure it's text AND has content
            .map(file => {
                const extension = getFileExtension(file.name);
                const contentWithNewline = file.content + (file.content.endsWith('\n') ? '' : '\n');
                return `${file.name}\n\`\`\`${extension}\n${contentWithNewline}\`\`\``;
            });

        return outputBlocks.join('\n\n');
    }, [files, textFilesOnly]);


    const hasNonTextFiles = useMemo(() => {
        return textFilesOnly && files.some(file => !file.isText);
    }, [files, textFilesOnly]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFilesPromises = acceptedFiles.map(file => {
            return new Promise<FileData>((resolve) => {
                const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const isText = isFileText(file.name);

                if (isText) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({
                            id: fileId,
                            name: file.name,
                            content: (reader.result as string) || "", // Ensure content is string, default to ""
                            isText: true
                        });
                    };
                    reader.onerror = (error) => {
                        console.error(`Error reading text file ${file.name}:`, error);
                        resolve({
                            id: fileId,
                            name: file.name,
                            content: "", // Explicitly empty on error
                            isText: true
                        });
                    };
                    try {
                       reader.readAsText(file);
                    } catch (readError) {
                         console.error(`Exception trying to read ${file.name}:`, readError);
                         resolve({
                            id: fileId,
                            name: file.name,
                            content: "", // Explicitly empty on exception
                            isText: true
                        });
                    }
                } else {
                    resolve({
                        id: fileId,
                        name: file.name,
                        content: "", // Empty for non-text
                        isText: false
                    });
                }
            });
        });

        Promise.all(newFilesPromises)
            .then(newFilesData => {
                setFiles(prevFiles => [...prevFiles, ...newFilesData]);
            })
            .catch(error => {
                console.error("Unexpected error during Promise.all for file processing:", error);
                alert("An unexpected error occurred while processing some files.");
            });
    }, []);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
    });

    const handleDragStart = useCallback((event: DragStartEvent) => {
        document.body.style.cursor = 'grabbing';
        setActiveId(event.active.id);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        document.body.style.cursor = '';
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            setFiles((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                if (oldIndex === -1 || newIndex === -1) return items;
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }, []);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(file => file.id !== id));
    }, []);

    const openDeleteConfirmation = useCallback(() => setDeleteConfirmOpen(true), []);
    const closeDeleteConfirmation = useCallback(() => setDeleteConfirmOpen(false), []);

    const deleteAllFiles = useCallback(() => {
        setFiles([]);
        closeDeleteConfirmation();
    }, [closeDeleteConfirmation]);

    const copyToClipboard = useCallback(() => {
        if (!combinedText) return;

        navigator.clipboard.writeText(combinedText)
            .then(() => {
                setIsCopied(true);
                if (copyTimeoutRef.current) {
                    clearTimeout(copyTimeoutRef.current);
                }
                copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2500);
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                alert('Failed to copy text to clipboard.');
            });
    }, [combinedText]);

    const handleTextFilesOnlyChange = useCallback((checked: boolean) => setTextFilesOnly(checked), []);

    const activeFile = useMemo(() => activeId ? files.find(file => file.id === activeId) : null, [activeId, files]);
    const fileIds = useMemo(() => files.map(file => file.id), [files]);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            {...getRootProps()}
            className={`min-h-screen flex flex-col relative bg-gray-900 text-gray-200 isolate ${isDragActive ? 'cursor-copy' : ''}`}
        >
            <input {...getInputProps()} />

            <header className="px-6 md:px-10 py-4 border-b border-gray-700/50 shrink-0">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 150 }}
                        className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-600/30 flex-shrink-0"
                        aria-hidden="true"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                        className="text-xl md:text-2xl font-semibold text-gray-100 tracking-tight"
                    >
                        Textractor
                    </motion.h1>
                </div>
            </header>

            <main className="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto p-6 md:p-10 gap-8 min-h-0">

                <motion.section
                    aria-labelledby="settings-and-files-heading"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full md:w-1/2 lg:w-2/5 flex flex-col gap-6 flex-shrink-0 min-h-0"
                >
                    <h2 id="settings-and-files-heading" className="sr-only">Settings and Uploaded Files</h2>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/80 shadow-sm shrink-0">
                        <h3 className="text-base font-medium text-gray-100 mb-3">Settings</h3>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-3">
                            <ToggleSwitch
                                id="text-files-only"
                                label="Combine Text Files Only"
                                checked={textFilesOnly}
                                onChange={handleTextFilesOnlyChange}
                            />
                        </div>
                    </div>

                    <div
                        role="button"
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(); }}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${isDragActive ? 'border-blue-500 bg-gray-800/60 scale-102' : 'border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50'} shadow-sm shrink-0`}
                    >
                        <div className="flex flex-col items-center justify-center pointer-events-none">
                            <svg
                                className={`w-10 h-10 mb-3 transition-colors duration-200 ${isDragActive ? 'text-blue-400' : 'text-gray-600'}`}
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-base font-medium mb-1 text-gray-200">
                                {isDragActive ? 'Drop files to upload' : 'Click or Drag Files Here'}
                            </p>
                            <p className="text-gray-400 text-xs">Select multiple text-based files</p>
                        </div>
                    </div>

                    <AnimatePresence>
                        {files.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="flex flex-col flex-grow min-h-0"
                            >
                                <div className="flex justify-between items-center mb-3 px-1 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-medium text-gray-100">Files</h3>
                                        <motion.span
                                            key={files.length}
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                                            className="inline-flex items-center justify-center bg-gray-700 text-blue-300 rounded-full h-5 w-5 text-xs font-bold"
                                            aria-live="polite"
                                        >
                                            {files.length}
                                        </motion.span>
                                    </div>
                                    <MaterialButton
                                        variant="text"
                                        color="error"
                                        onClick={openDeleteConfirmation}
                                        disabled={files.length === 0}
                                        startIcon={
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        }
                                    >
                                        Clear All
                                    </MaterialButton>
                                </div>

                                {hasNonTextFiles && (
                                    <motion.div
                                        role="status"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-2 mb-3 text-xs text-blue-300 flex items-center overflow-hidden shrink-0"
                                    >
                                        <svg className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="leading-tight">Only text files will be included in the combined output.</span>
                                    </motion.div>
                                )}

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="flex-grow overflow-y-auto min-h-[100px] pr-1 -mr-1 border border-gray-700/50 rounded-lg bg-gray-800/30 shadow-inner scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                                        <SortableContext items={fileIds} strategy={verticalListSortingStrategy}>
                                            <motion.ul layout className="space-y-2 p-2">
                                                <AnimatePresence initial={false}>
                                                    {files.map((file) => (
                                                        <SortableItem
                                                            key={file.id}
                                                            file={file}
                                                            onRemove={removeFile}
                                                            isDragging={activeId === file.id}
                                                        />
                                                    ))}
                                                </AnimatePresence>
                                            </motion.ul>
                                        </SortableContext>
                                    </div>
                                    <DragOverlay adjustScale={false} zIndex={1000}>
                                        {activeId && activeFile ? (
                                            <div className="w-full select-none opacity-100 cursor-grabbing px-2">
                                                <FileTile file={activeFile} isDragging={true} />
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>

                <motion.section
                    aria-labelledby="combined-text-heading"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    className="w-full md:w-1/2 lg:w-3/5 flex flex-col min-h-0"
                >
                    <AnimatePresence mode="wait">
                        {files.length > 0 ? (
                            <motion.div
                                key="output-area-present"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="bg-gray-800 rounded-xl shadow-lg border border-gray-700/80 p-4 flex flex-col flex-grow"
                            >
                                <div className="flex justify-between items-center mb-3 flex-shrink-0">
                                    <h2 id="combined-text-heading" className="text-base font-medium text-gray-100">
                                        Combined Text {textFilesOnly ? '(Text Files Only)' : ''}
                                    </h2>
                                    <div className="relative flex-shrink-0">
                                        <MaterialButton
                                            onClick={copyToClipboard}
                                            disabled={!combinedText || isCopied}
                                            startIcon={
                                                isCopied ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                                        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                                                    </svg>
                                                )
                                            }
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
                                        className="w-full h-full p-3 bg-gray-900 border border-gray-700 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-300 resize-none scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
                                        placeholder={files.length > 0 ? "Combined text will appear here..." : "Upload files to see combined text..."}
                                        aria-label="Combined text output"
                                    />
                                    <AnimatePresence>
                                        {isCopied && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                className="absolute bottom-3 right-3 bg-green-600/90 text-white px-2 py-0.5 rounded shadow-lg text-[10px] font-medium backdrop-blur-sm pointer-events-none"
                                                role="status"
                                            >
                                                Copied!
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
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="flex-grow flex items-center justify-center bg-gray-800 rounded-xl border border-dashed border-gray-700 p-10 text-center text-gray-500"
                            >
                                <div>
                                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    <p className="text-lg font-medium" id="combined-text-heading">Combined Text Output</p>
                                    <p className="text-sm mt-1">Upload files on the left to see the combined text here.</p>
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
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none"
                        aria-hidden="true"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="bg-gray-800 p-10 rounded-xl border-2 border-dashed border-blue-500 max-w-lg w-full text-center shadow-2xl"
                        >
                            <motion.div
                                animate={{ y: [-8, 0, -8] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                className="mx-auto mb-6"
                            >
                                <svg className="w-20 h-20 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </motion.div>
                            <h2 className="text-2xl font-medium text-white mb-2">Drop Files to Upload</h2>
                            <p className="text-gray-300">Release your mouse button</p>
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
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-[1001] p-4"
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
                            transition={{ type: 'spring', stiffness: 250, damping: 20 }}
                            className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-md w-full shadow-xl"
                            onClick={e => e.stopPropagation()}
                            role="document"
                        >
                            <div className="flex items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mr-4 flex-shrink-0 mt-1" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 id="delete-dialog-title" className="text-xl font-semibold text-gray-100">Delete All Files?</h3>
                                    <p id="delete-dialog-description" className="text-gray-300 text-sm mt-2">
                                        Are you sure you want to delete all {files.length} uploaded file{files.length !== 1 ? 's' : ''}? This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <MaterialButton
                                    variant="text"
                                    color="default"
                                    onClick={closeDeleteConfirmation}
                                >
                                    Cancel
                                </MaterialButton>
                                <MaterialButton
                                    color="error"
                                    variant="contained"
                                    onClick={deleteAllFiles}
                                    startIcon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    }
                                >
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