'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    UniqueIdentifier,
    defaultDropAnimationSideEffects,
    DragStartEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    defaultAnimateLayoutChanges
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { encode } from 'gpt-tokenizer';

// --- TYPES & CONFIGURATION ---

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

interface GitFileItem {
    name: string;
    download_url: string;
}

// Specific Types for API Responses to avoid 'any'
interface GitHubContentItem {
    name: string;
    type: string;
    download_url: string | null;
}

interface GitLabTreeItem {
    name: string;
    type: string;
    path: string;
}

type OutputStyle = 'standard' | 'hash' | 'minimal' | 'xml' | 'markdown';

const TEXT_FILE_EXTENSIONS = new Set([
    'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
    'less', 'json', 'xml', 'yaml', 'yml', 'py', 'java', 'c', 'cpp', 'cs',
    'go', 'rs', 'php', 'rb', 'pl', 'sh', 'bat', 'h', 'swift', 'kt', 'sql',
    'config', 'ini', 'env', 'gitignore', 'htaccess', 'log', 'csv', 'tsv', 'dart', 'arb',
    'vue', 'svelte', 'astro', 'sol', 'rs', 'toml', 'lua', 'conf'
]);

const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return new Intl.NumberFormat('en-US').format(num);
};

// --- ICONS ---

const GoogleIcon = ({ path, className = "w-5 h-5" }: { path: string, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d={path} />
    </svg>
);

const ICONS = {
    upload: "M11 16V7.85l-2.6 2.6L7 9l5-5 5 5-1.4 1.45-2.6-2.6V16h-2Zm-5 4q-.825 0-1.413-.587Q4 18.825 4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413Q18.825 20 18 20H6Z",
    file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
    copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    delete: "M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    text: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    alert: "M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z",
    github: "M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.24 0-1.16.46-2.11 1.2-2.85a3.8 3.8 0 010-2.94s.95-.26 3.11 1.1a10.2 10.2 0 015.6 0c2.16-1.37 3.11-1.08 3.11-1.08a3.8 3.8 0 01.02 2.92c.74.74 1.2 1.69 1.2 2.85 0 4.06-2.59 4.96-5.05 5.23a1.75 1.75 0 01.5 1.35v2.23c0 .27.2.65.75.55A11 11 0 0012 1.27",
    gitlab: "M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.15-.94l3.43-10.57a.84.84 0 011.6 0l1.77 5.45h8l1.77-5.45a.84.84 0 011.6 0l3.43 10.57a.84.84 0 01-.15.94z",
    tune: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
    folder_zip: "M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-2v-2h2v2zm0-4h-2v-2h2v2z",
    search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    arrow_up: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    arrow_down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
};

// --- COMPONENTS ---

interface GoogleButtonProps {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: 'filled' | 'tonal' | 'text' | 'fab' | 'outlined';
    icon?: string;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}

const GoogleButton = React.memo(({
    children, onClick, variant = 'filled', icon, disabled = false, className = '', type = 'button'
}: GoogleButtonProps) => {
    const base = "relative inline-flex items-center justify-center overflow-hidden font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0";

    const variants = {
        filled: "bg-[#A8C7FA] text-[#062E6F] hover:bg-[#8AB4F8] hover:shadow-md active:shadow-none rounded-full px-6 py-2.5 text-sm shadow-sm",
        tonal: "bg-[#333537] text-[#A8C7FA] hover:bg-[#444746] rounded-xl px-4 py-2 text-sm border border-[#444746]",
        text: "text-[#A8C7FA] hover:bg-[#A8C7FA]/10 rounded-full px-4 py-2 text-sm",
        outlined: "border border-[#8E918F] text-[#C4C7C5] hover:bg-[#333537] hover:text-[#E3E3E3] rounded-full px-6 py-2.5 text-sm",
        fab: "bg-[#333537] text-[#A8C7FA] rounded-2xl w-14 h-14 shadow-[0_4px_8px_3px_rgba(0,0,0,0.3),0_1px_3px_rgba(0,0,0,0.5)] hover:bg-[#444746] active:scale-95"
    };

    return (
        <motion.button
            whileTap={!disabled ? { scale: 0.96 } : {}}
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={`${base} ${variants[variant]} ${className}`}
        >
            {icon && <GoogleIcon path={icon} className={`${children ? 'mr-2' : ''} ${variant === 'fab' ? 'w-6 h-6' : 'w-4.5 h-4.5'}`} />}
            {children}
        </motion.button>
    );
});
GoogleButton.displayName = 'GoogleButton';

const FileCard = React.memo(({ file, onRemove, isDragging = false }: { file: FileData, onRemove?: (id: string) => void, isDragging?: boolean }) => {
    return (
        <div className={`
            flex items-center p-3.5 rounded-xl transition-all duration-200 border
            ${isDragging 
                ? 'bg-[#2D2E31] shadow-[0_8px_12px_6px_rgba(0,0,0,0.4),0_4px_4px_rgba(0,0,0,0.4)] border-[#A8C7FA]/50 scale-105 z-50 cursor-grabbing' 
                : 'bg-[#1E1E1E] border-[#444746] hover:bg-[#2B2930] hover:border-[#8E918F] cursor-grab active:cursor-grabbing'
            }
        `}>
            <div className="w-10 h-10 rounded-full bg-[#333537] flex items-center justify-center text-[#A8C7FA] flex-shrink-0 mr-4">
                <GoogleIcon path={file.isText ? ICONS.text : ICONS.file} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-[#E3E3E3] font-medium text-sm truncate">{file.name}</h4>
                {file.isText && (
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[#C4C7C5]">
                        <span>{formatNumber(file.linesOfCode)} lines</span>
                        <span className="w-1 h-1 rounded-full bg-[#444746]"></span>
                        <span>{formatNumber(file.tokenCount)} tokens</span>
                    </div>
                )}
            </div>
            {onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
                    className="p-2 text-[#C4C7C5] hover:text-[#F2B8B5] hover:bg-[#F2B8B5]/10 rounded-full transition-colors"
                    type="button"
                >
                    <GoogleIcon path={ICONS.delete} />
                </button>
            )}
        </div>
    );
});
FileCard.displayName = 'FileCard';

const SortableItem = ({ file, onRemove, isDragging }: { file: FileData, onRemove: (id: string) => void, isDragging: boolean }) => {
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
        <li ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 touch-none">
             <FileCard file={file} onRemove={onRemove} />
        </li>
    );
};

const StatChip = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center bg-[#1E1E1E] border border-[#444746] rounded-2xl p-4 min-w-[100px] flex-1">
        <span className="text-[#A8C7FA] text-2xl font-medium mb-1">{value}</span>
        <span className="text-[#C4C7C5] text-xs font-medium uppercase tracking-wide">{label}</span>
    </div>
);

// --- MAIN APPLICATION ---

export default function TextractorGoogleDark() {
    const [files, setFiles] = useState<FileData[]>([]);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [textFilesOnly, setTextFilesOnly] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    // UI State
    const [outputStyle, setOutputStyle] = useState<OutputStyle>('standard');
    const [gitModalOpen, setGitModalOpen] = useState(false);
    const [gitUrl, setGitUrl] = useState("");
    const [gitLoading, setGitLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMatches, setSearchMatches] = useState<number[]>([]);
    const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- FILE PROCESSING ---

    const processFileObject = useCallback(async (fileObject: File | Blob): Promise<FileData> => {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const name = (fileObject instanceof File) ? fileObject.name : `pasted_${Date.now()}.txt`;
        const extension = name.split('.').pop()?.toLowerCase() || '';
        const isText = TEXT_FILE_EXTENSIONS.has(extension) || fileObject.type.startsWith('text/');

        let content = "", lines = 0, chars = 0, tokens = 0;

        if (isText) {
            try {
                content = await fileObject.text();
                lines = content.split('\n').length;
                chars = content.length;
                tokens = encode(content).length;
            } catch (e) { console.error(e); }
        }

        return { id: fileId, name, content, isText, fileObject, linesOfCode: lines, characterCount: chars, tokenCount: tokens };
    }, []);

    const unzipAndProcess = async (zipFile: File): Promise<File[]> => {
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(zipFile);
            const extractedFiles: File[] = [];
            const promises: Promise<void>[] = [];

            content.forEach((relativePath, zipEntry) => {
                if (zipEntry.dir) return;
                if (relativePath.startsWith('.') || relativePath.includes('/.')) return;

                const promise = zipEntry.async('blob').then((blob) => {
                     const file = new File([blob], relativePath, { type: 'text/plain' });
                     extractedFiles.push(file);
                });
                promises.push(promise);
            });

            await Promise.all(promises);
            return extractedFiles;
        } catch (error) {
            console.error("Error unzipping file:", error);
            alert("Failed to open ZIP file. It might be corrupted.");
            return [];
        }
    };

    const addFiles = useCallback(async (incomingFiles: File[]) => {
        setProcessing(true);
        let allFilesToProcess: File[] = [];

        for (const file of incomingFiles) {
            const ext = file.name.split('.').pop()?.toLowerCase();

            if (ext === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
                const extracted = await unzipAndProcess(file);
                allFilesToProcess = [...allFilesToProcess, ...extracted];
            } else if (ext === 'rar') {
                alert(`File "${file.name}" skipped. RAR format is not supported. Please convert to ZIP.`);
            } else {
                allFilesToProcess.push(file);
            }
        }

        Promise.all(allFilesToProcess.map(processFileObject)).then(res => {
            setFiles(prev => [...prev, ...res]);
            setProcessing(false);
        });
    }, [processFileObject]);

    // --- GIT IMPORT LOGIC (GitHub + GitLab) ---

    const handleGitImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gitUrl) return;

        setGitLoading(true);
        setLoadingText("Parsing URL...");

        try {
            let filesToFetch: GitFileItem[] = [];

            if (gitUrl.includes('github.com')) {
                // --- GITHUB LOGIC ---
                const urlParts = gitUrl.replace('https://github.com/', '').split('/');
                const owner = urlParts[0];
                const repo = urlParts[1];
                let path = "";

                if (urlParts.length > 2) {
                    path = urlParts.slice(4).join('/');
                }

                setLoadingText("Fetching GitHub API...");
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error("GitHub: File/Folder not found or private");

                const data = await res.json();

                if (Array.isArray(data)) {
                    // Directory
                    filesToFetch = (data as GitHubContentItem[])
                        .filter((item) => item.type === 'file')
                        .filter((item) => {
                            const ext = item.name.split('.').pop()?.toLowerCase();
                            return TEXT_FILE_EXTENSIONS.has(ext || '');
                        })
                        .map((item) => ({ name: item.name, download_url: item.download_url || '' }))
                        .filter(item => item.download_url !== '');
                } else {
                    // Single file
                    const singleData = data as GitHubContentItem;
                    if (singleData.download_url) {
                        filesToFetch.push({ name: singleData.name, download_url: singleData.download_url });
                    }
                }

            } else if (gitUrl.includes('gitlab.com')) {
                // --- GITLAB LOGIC ---
                const cleanUrl = gitUrl.replace('https://gitlab.com/', '');
                const parts = cleanUrl.split('/-/');
                const projectPath = parts[0]; // owner/repo
                const encodedId = encodeURIComponent(projectPath);

                let ref = 'main';
                let path = '';
                let isBlob = false;

                if (parts.length > 1) {
                    const rest = parts[1];
                    const pathParts = rest.split('/');
                    const type = pathParts.shift(); // blob or tree
                    isBlob = type === 'blob';
                    ref = pathParts.shift() || 'main';
                    path = pathParts.join('/');
                }

                setLoadingText("Fetching GitLab API...");

                if (isBlob && path) {
                     const rawUrl = `https://gitlab.com/${projectPath}/-/raw/${ref}/${path}`;
                     const name = path.split('/').pop() || 'file';
                     filesToFetch.push({ name, download_url: rawUrl });
                } else {
                    const apiUrl = `https://gitlab.com/api/v4/projects/${encodedId}/repository/tree?path=${path}&ref=${ref}&recursive=true&per_page=100`;
                    const res = await fetch(apiUrl);
                    if (!res.ok) throw new Error("GitLab: Folder not found or private");

                    const data: GitLabTreeItem[] = await res.json();

                    if (Array.isArray(data)) {
                         filesToFetch = data
                            .filter((item) => item.type === 'blob')
                            .filter((item) => {
                                const ext = item.name.split('.').pop()?.toLowerCase();
                                return TEXT_FILE_EXTENSIONS.has(ext || '');
                            })
                            .map((item) => ({
                                name: item.name,
                                download_url: `https://gitlab.com/${projectPath}/-/raw/${ref}/${item.path}`
                            }));
                    }
                }
            } else {
                alert("Only GitHub.com and GitLab.com URLs are currently supported.");
                setGitLoading(false);
                return;
            }

            if (filesToFetch.length === 0) {
                alert("No compatible text files found in this location.");
                setGitLoading(false);
                return;
            }

            setLoadingText(`Fetching ${filesToFetch.length} files...`);

            const fetchedFiles: File[] = [];
            await Promise.all(filesToFetch.map(async (f) => {
                try {
                    const res = await fetch(f.download_url);
                    const text = await res.text();
                    const blob = new Blob([text], { type: 'text/plain' });
                    fetchedFiles.push(new File([blob], f.name, { type: 'text/plain' }));
                } catch (err) {
                    console.error(`Failed to fetch ${f.name}`, err);
                }
            }));

            addFiles(fetchedFiles).catch(err => console.error(err));
            setGitModalOpen(false);
            setGitUrl("");

        } catch (error: unknown) {
            const err = error as Error;
            console.error(err);
            alert(err.message || "Failed to import. Check URL/Rate limits.");
        } finally {
            setGitLoading(false);
            setLoadingText("");
        }
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: (files) => {
            addFiles(files).catch(err => console.error(err));
        },
        noClick: true,
        noKeyboard: true
    });

    // --- PASTE LISTENER ---
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            if (e.clipboardData?.files?.length) {
                e.preventDefault();
                addFiles(Array.from(e.clipboardData.files)).catch(err => console.error(err));
            } else {
                const text = e.clipboardData?.getData('text');
                if (text) {
                   const blob = new Blob([text], { type: 'text/plain' });
                   const file = new File([blob], `pasted_text_${Date.now()}.txt`, { type: 'text/plain' });
                   addFiles([file]).catch(err => console.error(err));
                }
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [addFiles]);

    const activeFile = useMemo(() => files.find(f => f.id === activeId), [activeId, files]);

    // --- COMBINED TEXT ---
    const combinedText = useMemo(() => {
        const target = textFilesOnly ? files.filter(f => f.isText) : files;

        return target.filter(f => f.isText).map(f => {
            const ext = f.name.split('.').pop() || 'txt';

            switch (outputStyle) {
                case 'hash':
                    return `# --- ${f.name} ---\n${f.content}`;
                case 'minimal':
                    return `--- ${f.name} ---\n${f.content}`;
                case 'xml':
                    return `<file name="${f.name}">\n${f.content}\n</file>`;
                case 'markdown':
                    return `${f.name}\n\`\`\`${ext}\n${f.content}\n\`\`\``;
                case 'standard':
                default:
                    return `/* --- ${f.name} --- */\n${f.content}`;
            }
        }).join('\n\n');
    }, [files, textFilesOnly, outputStyle]);

    // --- SEARCH LOGIC ---
    useEffect(() => {
        if (!searchTerm) {
            setSearchMatches([]);
            setCurrentMatchIdx(0);
            return;
        }

        const matches: number[] = [];
        let startIndex = 0;
        const lowerText = combinedText.toLowerCase();
        const lowerTerm = searchTerm.toLowerCase();

        while ((startIndex = lowerText.indexOf(lowerTerm, startIndex)) > -1) {
            matches.push(startIndex);
            startIndex += lowerTerm.length;
        }

        setSearchMatches(matches);
        setCurrentMatchIdx(0);

        if (matches.length > 0 && textAreaRef.current) {
            const idx = matches[0];
            textAreaRef.current.focus();
            textAreaRef.current.setSelectionRange(idx, idx + searchTerm.length);
        }

    }, [searchTerm, combinedText]);

    const handleNextMatch = () => {
        if (searchMatches.length === 0) return;
        const nextIdx = (currentMatchIdx + 1) % searchMatches.length;
        setCurrentMatchIdx(nextIdx);
        highlightMatch(nextIdx);
    };

    const handlePrevMatch = () => {
        if (searchMatches.length === 0) return;
        const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
        setCurrentMatchIdx(prevIdx);
        highlightMatch(prevIdx);
    };

    const highlightMatch = (idx: number) => {
        if (!textAreaRef.current) return;
        const start = searchMatches[idx];
        const end = start + searchTerm.length;

        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(start, end);
    };

    const copyToClipboard = () => {
        if (!combinedText) return;
        navigator.clipboard.writeText(combinedText)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
            })
            .catch(err => console.error('Failed to copy:', err));
    };

    const stats = useMemo(() => {
        const target = textFilesOnly ? files.filter(f => f.isText) : files;
        return {
            count: target.length,
            lines: target.reduce((a, b) => a + b.linesOfCode, 0),
            tokens: target.reduce((a, b) => a + b.tokenCount, 0)
        };
    }, [files, textFilesOnly]);

    const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
    const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id);
    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        setActiveId(null);
        if (over && active.id !== over.id) {
            setFiles(items => {
                const oldIdx = items.findIndex(i => i.id === active.id);
                const newIdx = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIdx, newIdx);
            });
        }
    };

    return (
        <div {...getRootProps()} className="h-screen bg-[#131314] text-[#E3E3E3] font-sans flex flex-col selection:bg-[#004A77] selection:text-[#C2E7FF] outline-none overflow-hidden">
            <input {...getInputProps()} />

            {/* --- HEADER --- */}
            <header className="bg-[#1E1E1E] px-6 py-3 flex items-center justify-between shrink-0 border-b border-[#444746] z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#333537] rounded-xl flex items-center justify-center text-[#A8C7FA]">
                        <GoogleIcon path={ICONS.code} className="w-6 h-6" />
                    </div>
                    <span className="text-[22px] font-normal text-[#C4C7C5]">Textractor</span>
                </div>

                <GoogleButton
                    variant="tonal"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={files.length === 0}
                    icon={ICONS.delete}
                >
                    Clear session
                </GoogleButton>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden relative z-10 max-w-[1600px] w-full mx-auto">

                {/* --- LEFT PANEL --- */}
                <section className="w-full lg:w-[420px] flex flex-col gap-4 h-full shrink-0">

                    {/* Upload Area */}
                    <div className="relative shrink-0">
                        <motion.div
                            onClick={open}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                rounded-3xl border border-dashed border-[#8E918F] bg-[#1E1E1E] p-8 cursor-pointer
                                transition-colors duration-200 flex flex-col items-center text-center gap-4
                                hover:bg-[#2B2930] hover:border-[#C4C7C5] group
                                ${processing ? 'opacity-50 pointer-events-none' : ''}
                            `}
                        >
                            {processing ? (
                                <div className="w-12 h-12 border-4 border-[#333537] border-t-[#A8C7FA] rounded-full animate-spin mb-2"></div>
                            ) : (
                                <div className="w-12 h-12 bg-[#333537] rounded-full flex items-center justify-center text-[#C4C7C5] group-hover:text-[#A8C7FA] transition-colors">
                                    <GoogleIcon path={ICONS.upload} className="w-6 h-6" />
                                </div>
                            )}
                            <div>
                                <p className="text-[#E3E3E3] font-medium">{processing ? 'Processing files...' : 'Click to upload or drop files'}</p>
                                <p className="text-sm text-[#8E918F] mt-1">Supports text, zip & clipboard paste</p>
                            </div>
                        </motion.div>

                        {/* Git Import Button */}
                        <div className="mt-3 grid grid-cols-1">
                            <GoogleButton
                                variant="outlined"
                                icon={ICONS.github}
                                className="w-full justify-center border-[#444746]"
                                onClick={(e) => { if(e) e.stopPropagation(); setGitModalOpen(true); }}
                            >
                                Import from Git
                            </GoogleButton>
                        </div>
                    </div>

                    <div className="bg-[#1E1E1E] rounded-3xl p-5 border border-[#444746] flex items-center justify-between shadow-sm shrink-0">
                        <span className="text-[#E3E3E3] font-medium text-sm">Merge text files only</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={textFilesOnly} onChange={e => setTextFilesOnly(e.target.checked)} />
                            <div className="w-11 h-6 bg-[#444746] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:bg-[#062E6F] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#8E918F] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A8C7FA]"></div>
                        </label>
                    </div>

                    {files.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent">
                            <StatChip label="Files" value={stats.count} />
                            <StatChip label="Tokens" value={formatNumber(stats.tokens)} />
                            <StatChip label="Lines" value={formatNumber(stats.lines)} />
                        </div>
                    )}

                    {/* File List */}
                    <div className="flex-1 flex flex-col min-h-0 bg-[#1E1E1E] rounded-3xl border border-[#444746] overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-[#444746] bg-[#1E1E1E] sticky top-0 z-10 shrink-0">
                            <h3 className="text-[#C4C7C5] font-medium text-sm uppercase tracking-wide">Files</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    <ul className="flex flex-col">
                                        <AnimatePresence initial={false}>
                                            {files.map(file => (
                                                <SortableItem key={file.id} file={file} onRemove={removeFile} isDragging={activeId === file.id} />
                                            ))}
                                        </AnimatePresence>
                                    </ul>
                                </SortableContext>
                                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                                    {activeFile ? <FileCard file={activeFile} isDragging /> : null}
                                </DragOverlay>
                            </DndContext>

                            {files.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-[#8E918F] py-10 opacity-60">
                                    <GoogleIcon path={ICONS.file} className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-sm">No files selected</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* --- RIGHT PANEL: Output --- */}
                <section className="flex-1 flex flex-col h-full min-w-0">
                    <div className="bg-[#1E1E1E] rounded-3xl border border-[#444746] flex flex-col h-full shadow-sm overflow-hidden relative">
                        <div className="px-6 py-4 border-b border-[#444746] flex items-center justify-between bg-[#1E1E1E] shrink-0 flex-wrap gap-4">

                            {/* Search Bar */}
                            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[#333537] rounded-full px-4 py-2 border border-[#444746]">
                                <GoogleIcon path={ICONS.search} className="text-[#8E918F] w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Find in code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[#E3E3E3] text-sm w-full placeholder-[#8E918F]"
                                />
                                {searchTerm && (
                                    <>
                                        <span className="text-xs text-[#8E918F] whitespace-nowrap mr-1">
                                            {searchMatches.length > 0 ? `${currentMatchIdx + 1}/${searchMatches.length}` : '0/0'}
                                        </span>
                                        <div className="flex items-center gap-1 border-l border-[#444746] pl-2">
                                            <button onClick={handlePrevMatch} className="p-1 hover:text-[#A8C7FA] text-[#C4C7C5] disabled:opacity-50" disabled={searchMatches.length === 0}>
                                                <GoogleIcon path={ICONS.arrow_up} className="w-4 h-4" />
                                            </button>
                                            <button onClick={handleNextMatch} className="p-1 hover:text-[#A8C7FA] text-[#C4C7C5] disabled:opacity-50" disabled={searchMatches.length === 0}>
                                                <GoogleIcon path={ICONS.arrow_down} className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setSearchTerm("")} className="p-1 hover:text-[#F2B8B5] text-[#8E918F]">
                                                <GoogleIcon path={ICONS.close} className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                {/* Format Selector */}
                                <div className="relative hidden md:block">
                                    <select
                                        value={outputStyle}
                                        onChange={(e) => setOutputStyle(e.target.value as OutputStyle)}
                                        className="appearance-none bg-[#333537] text-[#C4C7C5] border border-[#444746] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#A8C7FA] cursor-pointer hover:bg-[#444746] transition-colors"
                                    >
                                        <option value="standard">Standard (/* ... */)</option>
                                        <option value="hash">Hash (# ...)</option>
                                        <option value="minimal">Minimal (--- ...)</option>
                                        <option value="xml">XML Tags</option>
                                        <option value="markdown">Markdown Block</option>
                                    </select>
                                    <div className="absolute left-2.5 top-2 text-[#A8C7FA] pointer-events-none">
                                        <GoogleIcon path={ICONS.tune} className="w-4 h-4" />
                                    </div>
                                </div>

                                <GoogleButton
                                    onClick={copyToClipboard}
                                    variant="filled"
                                    icon={isCopied ? ICONS.check : ICONS.copy}
                                    disabled={!combinedText}
                                >
                                    {isCopied ? 'Copied' : 'Copy'}
                                </GoogleButton>
                            </div>
                        </div>

                        <div className="relative flex-1 min-h-0 group">
                            <textarea
                                ref={textAreaRef}
                                value={combinedText}
                                readOnly
                                className="w-full h-full p-6 resize-none focus:outline-none font-mono text-sm text-[#C4C7C5] leading-relaxed bg-[#1E1E1E] scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent selection:bg-[#004A77] selection:text-[#C2E7FF]"
                                placeholder="// Processed text will appear here..."
                                style={{ fontFamily: '"Roboto Mono", monospace' }}
                            />
                        </div>
                    </div>
                </section>
            </main>

            {/* --- DIALOGS & OVERLAYS --- */}

            <AnimatePresence>
                {isDragActive && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[#004A77]/30 backdrop-blur-md flex items-center justify-center pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                            className="bg-[#1E1E1E] p-8 rounded-3xl shadow-2xl border border-[#444746] flex flex-col items-center"
                        >
                            <div className="w-20 h-20 bg-[#333537] rounded-full flex items-center justify-center text-[#A8C7FA] mb-6 animate-bounce border border-[#444746]">
                                <GoogleIcon path={ICONS.upload} className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl text-[#E3E3E3]">Drop to upload</h2>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCopied && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-6 z-50 bg-[#E3E3E3] text-[#131314] px-6 py-3 rounded-lg shadow-lg text-sm flex items-center gap-3"
                    >
                        <GoogleIcon path={ICONS.check} className="w-5 h-5 text-[#004A77]" />
                        Copied to clipboard
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteConfirmOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirmOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#2B2930] rounded-[28px] p-6 w-full max-w-sm shadow-2xl border border-[#444746]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <GoogleIcon path={ICONS.alert} className="w-6 h-6 text-[#F2B8B5]" />
                                <h3 className="text-2xl text-[#E3E3E3] leading-8">Clear session?</h3>
                            </div>
                            <p className="text-[#C4C7C5] text-sm mb-8 leading-5">
                                This will remove all {files.length} files from your current workspace. This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-2">
                                <GoogleButton variant="text" onClick={() => setDeleteConfirmOpen(false)}>
                                    Cancel
                                </GoogleButton>
                                <GoogleButton variant="filled" className="bg-[#8C1D18] text-[#F9DEDC] hover:bg-[#601410]" onClick={() => { setFiles([]); setDeleteConfirmOpen(false); }}>
                                    Clear all
                                </GoogleButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Git Import Modal */}
            <AnimatePresence>
                {gitModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => !gitLoading && setGitModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#2B2930] rounded-[28px] p-6 w-full max-w-md shadow-2xl border border-[#444746]"
                            onClick={e => e.stopPropagation()}
                        >
                            <form onSubmit={handleGitImport}>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="flex gap-2">
                                        <GoogleIcon path={ICONS.github} className="w-6 h-6 text-[#A8C7FA]" />
                                        <GoogleIcon path={ICONS.gitlab} className="w-6 h-6 text-[#FC6D26]" />
                                    </div>
                                    <h3 className="text-2xl text-[#E3E3E3] leading-8">Import from Git</h3>
                                </div>

                                <div className="relative mb-6">
                                    <input
                                        type="text"
                                        value={gitUrl}
                                        onChange={(e) => setGitUrl(e.target.value)}
                                        placeholder="Paste GitHub or GitLab URL..."
                                        className="w-full bg-[#1E1E1E] border border-[#444746] rounded-xl px-4 py-3 text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none focus:border-[#A8C7FA] focus:ring-1 focus:ring-[#A8C7FA] transition-all"
                                        disabled={gitLoading}
                                    />
                                    {gitLoading && (
                                        <div className="absolute right-3 top-3.5">
                                            <div className="w-5 h-5 border-2 border-[#444746] border-t-[#A8C7FA] rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>

                                {gitLoading && (
                                    <p className="text-[#A8C7FA] text-sm mb-6 animate-pulse">{loadingText}</p>
                                )}

                                <div className="flex justify-end gap-2">
                                    <GoogleButton variant="text" onClick={() => setGitModalOpen(false)} disabled={gitLoading}>
                                        Cancel
                                    </GoogleButton>
                                    <GoogleButton variant="filled" type="submit" disabled={!gitUrl || gitLoading}>
                                        Import
                                    </GoogleButton>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}