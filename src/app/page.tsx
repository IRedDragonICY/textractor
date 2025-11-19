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

// --- TYPES ---

interface FileData {
    id: string;
    name: string;
    content: string;
    isText: boolean;
    fileObject: File | Blob;
    linesOfCode: number;
    characterCount: number;
    tokenCount: number;
    path: string;
}

interface TreeNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    children: TreeNode[];
    fileData?: FileData;
}

interface IconInfo {
    path: string;
    color: string;
}

interface GoogleButtonProps {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: 'filled' | 'tonal' | 'text' | 'fab' | 'outlined' | 'icon';
    icon?: string;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    active?: boolean;
}

interface GitHubTreeItem {
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
    url: string;
}

interface GitHubRepoInfo {
    default_branch: string;
}

interface GitLabTreeItem {
    id: string;
    name: string;
    type: string;
    path: string;
    mode: string;
}

type OutputStyle = 'standard' | 'hash' | 'minimal' | 'xml' | 'markdown';
type ViewMode = 'list' | 'tree';

const TEXT_FILE_EXTENSIONS = new Set([
    'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
    'less', 'json', 'xml', 'yaml', 'yml', 'py', 'java', 'c', 'cpp', 'cs',
    'go', 'rs', 'php', 'rb', 'pl', 'sh', 'bat', 'h', 'swift', 'kt', 'sql',
    'config', 'ini', 'env', 'gitignore', 'gitkeep', 'htaccess', 'log', 'csv',
    'tsv', 'dart', 'arb', 'vue', 'svelte', 'astro', 'sol', 'toml', 'lua',
    'conf', 'prisma', 'gradle', 'properties', 'lock', 'license', 'glsl', 'vert', 'frag'
]);

// --- INDEXEDDB UTILS ---

const DB_NAME = 'TextractorDB';
const STORE_NAME = 'session';
const DB_VERSION = 1;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

const saveSession = async (files: FileData[]) => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const serializableFiles = files.map(f => ({
            ...f,
            fileObject: undefined
        }));

        store.put(serializableFiles, 'currentSession');
        
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.commit?.();
        });
    } catch (e) {
        console.error("Failed to save session", e);
    }
};

const loadSession = async (): Promise<FileData[]> => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get('currentSession');

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const files = request.result || [];
                const rehydrated = files.map((f: any) => ({
                    ...f,
                    fileObject: new Blob([f.content], { type: 'text/plain' })
                }));
                resolve(rehydrated);
            };
            request.onerror = () => resolve([]);
        });
    } catch (e) {
        console.error("Failed to load session", e);
        return [];
    }
};

// --- UTILS ---

const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return new Intl.NumberFormat('en-US').format(num);
};

const buildFileTree = (files: FileData[]): TreeNode[] => {
    const root: TreeNode[] = [];

    files.forEach(file => {
        const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
        const parts = cleanPath.split('/').filter(Boolean);
        let currentLevel = root;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            const existingNode = currentLevel.find(n => n.name === part && n.type === (isFile ? 'file' : 'folder'));

            if (existingNode) {
                if (!isFile) {
                    currentLevel = existingNode.children;
                }
            } else {
                const newNode: TreeNode = {
                    id: isFile ? file.id : `folder-${parts.slice(0, index + 1).join('-')}`,
                    name: part,
                    type: isFile ? 'file' : 'folder',
                    path: parts.slice(0, index + 1).join('/'),
                    children: [],
                    fileData: isFile ? file : undefined
                };
                currentLevel.push(newNode);
                if (!isFile) {
                    currentLevel = newNode.children;
                }
            }
        });
    });

    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });
        nodes.forEach(node => {
            if (node.children.length > 0) sortNodes(node.children);
        });
    };

    sortNodes(root);
    return root;
};

const ICONS_PATHS = {
    folder: "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
    folder_open: "M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z",
    default_file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    js: "M3 3h18v18H3V3zm4.5 13.5c0 .83.67 1.5 1.5 1.5h1.5v-6h-1.5v4.5h-1.5v-4.5H6v4.5zm6-1.5h1.5v-1.5h-1.5V12h3v-1.5h-3v6zM16.5 9h-3v6h3V13.5h-1.5v-1.5h1.5V10.5h-1.5V9z",
    html: "M12 2L2.5 5.5v13L12 22l9.5-3.5v-13L12 2zm-1 15.5l-4-1.5v-9l4 1.5v9zm5-1.5l-4 1.5v-9l4-1.5v9z",
    css: "M12 2L2.5 5.5v13L12 22l9.5-3.5v-13L12 2zm0 17.5l-5-2V6.5l5-2v13zm5-2l-5 2V4.5l5 2v11z",
    json: "M4 10h2v4H4zm14 0h2v4h-2zm-6 0h2v4h-2z",
    ts: "M3 3h18v18H3V3zm15 13.5h-1.5v-4.5h-1.5v4.5h-1.5v-6h4.5v1.5zm-7.5 0H9v-6h4.5v1.5h-3v4.5z",
    git: "M19.5 10.5l-7-7c-.8-.8-2.2-.8-3 0l-7 7c-.8.8-.8 2.2 0 3l7 7c.8.8 2.2.8 3 0l7-7c.8-.8.8-2.2 0-3zM12 16.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
    image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
    markdown: "M2 4v16h20V4H2zm16 13H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z",
    lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
    settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.16 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    terminal: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z",
    readme: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    vue: "M1 3h4l7 12 7-12h4L12 22 1 3zm8.67 0L12 7l2.33-4h-4.66z",
};

const getFileIconInfo = (filename: string): IconInfo => {
    const name = filename.toLowerCase();
    const ext = name.split('.').pop();

    if (name === 'package.json' || name === 'yarn.lock' || name.endsWith('.lock')) return { path: ICONS_PATHS.lock, color: '#E34F26' };
    if (name === 'license' || name === 'license.txt') return { path: ICONS_PATHS.default_file, color: '#EAB308' };
    if (name.startsWith('.git') || name === '.gitignore') return { path: ICONS_PATHS.git, color: '#F05032' };
    if (name === 'readme.md') return { path: ICONS_PATHS.readme, color: '#A8C7FA' };
    if (name.startsWith('.env') || name.endsWith('.config.js') || name.endsWith('.rc')) return { path: ICONS_PATHS.settings, color: '#9CA3AF' };

    switch (ext) {
        case 'js': case 'jsx': case 'mjs': return { path: ICONS_PATHS.js, color: '#F7DF1E' };
        case 'ts': case 'tsx': return { path: ICONS_PATHS.ts, color: '#3178C6' };
        case 'html': return { path: ICONS_PATHS.html, color: '#E34F26' };
        case 'css': case 'scss': case 'sass': case 'less': return { path: ICONS_PATHS.css, color: '#264DE4' };
        case 'json': return { path: ICONS_PATHS.json, color: '#F7DF1E' };
        case 'md': case 'txt': return { path: ICONS_PATHS.markdown, color: '#9CA3AF' };
        case 'png': case 'jpg': case 'jpeg': case 'svg': case 'glb': case 'ico': return { path: ICONS_PATHS.image, color: '#C084FC' };
        case 'vue': return { path: ICONS_PATHS.vue, color: '#41B883' };
        case 'sh': case 'bat': case 'bash': return { path: ICONS_PATHS.terminal, color: '#4ADE80' };
        default: return { path: ICONS_PATHS.default_file, color: '#C4C7C5' };
    }
};

const GoogleIcon = ({ path, className = "w-5 h-5", style }: { path: string; className?: string; style?: React.CSSProperties }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d={path} />
    </svg>
);

const UI_ICONS = {
    upload: "M11 16V7.85l-2.6 2.6L7 9l5-5 5 5-1.4 1.45-2.6-2.6V16h-2Zm-5 4q-.825 0-1.413-.587Q4 18.825 4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413Q18.825 20 18 20H6Z",
    delete: "M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    chevron_right: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
    view_list: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
    view_tree: "M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z",
    arrow_up: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    arrow_down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
    github: "M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.24 0-1.16.46-2.11 1.2-2.85a3.8 3.8 0 010-2.94s.95-.26 3.11 1.1a10.2 10.2 0 015.6 0c2.16-1.37 3.11-1.08 3.11-1.08a3.8 3.8 0 01.02 2.92c.74.74 1.2 1.69 1.2 2.85 0 4.06-2.59 4.96-5.05 5.23a1.75 1.75 0 01.5 1.35v2.23c0 .27.2.65.75.55A11 11 0 0012 1.27",
    tune: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
    code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
};

const GoogleButton = React.memo(({
    children, onClick, variant = 'filled', icon, disabled = false, className = '', type = 'button', active = false
}: GoogleButtonProps) => {
    const base = "relative inline-flex items-center justify-center overflow-hidden font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0";
    const variants: Record<string, string> = {
        filled: "bg-[#A8C7FA] text-[#062E6F] hover:bg-[#8AB4F8] hover:shadow-md active:shadow-none rounded-full px-6 py-2.5 text-sm shadow-sm",
        tonal: "bg-[#333537] text-[#A8C7FA] hover:bg-[#444746] rounded-xl px-4 py-2 text-sm border border-[#444746]",
        text: "text-[#A8C7FA] hover:bg-[#A8C7FA]/10 rounded-full px-4 py-2 text-sm",
        outlined: "border border-[#8E918F] text-[#C4C7C5] hover:bg-[#333537] hover:text-[#E3E3E3] rounded-full px-6 py-2.5 text-sm",
        icon: `rounded-full p-2 hover:bg-[#444746] ${active ? 'bg-[#333537] text-[#A8C7FA]' : 'text-[#C4C7C5]'}`
    };
    return (
        <motion.button
            whileTap={!disabled ? { scale: 0.96 } : {}}
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={`${base} ${variants[variant]} ${className}`}
        >
            {icon && <GoogleIcon path={icon} className={`${children ? 'mr-2' : ''} ${variant === 'fab' ? 'w-6 h-6' : 'w-5 h-5'}`} />}
            {children}
        </motion.button>
    );
});
GoogleButton.displayName = 'GoogleButton';

const FileCard = React.memo(({ file, onRemove, isDragging = false }: { file: FileData, onRemove?: (id: string) => void, isDragging?: boolean }) => {
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
        <li ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2 touch-none">
            <FileCard file={file} onRemove={onRemove} />
        </li>
    );
};

// --- UPDATED TREE ITEM WITH DELETE FOR FOLDERS ---
const TreeItem = ({ node, level, onRemove }: { node: TreeNode, level: number, onRemove: (node: TreeNode) => void }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isFolder = node.type === 'folder';
    const indent = level * 16;

    const iconInfo = isFolder
        ? { path: isOpen ? ICONS_PATHS.folder_open : ICONS_PATHS.folder, color: isOpen ? '#A8C7FA' : '#C4C7C5' }
        : getFileIconInfo(node.name);

    return (
        <div className="select-none">
            <div
                className={`flex items-center py-1 pr-2 rounded-lg group transition-colors cursor-pointer hover:bg-[#2B2930] border border-transparent hover:border-[#444746]`}
                style={{ paddingLeft: `${indent + 8}px` }}
                onClick={() => isFolder && setIsOpen(!isOpen)}
            >
                <div className="flex items-center flex-1 min-w-0 overflow-hidden">
                    <span className={`mr-1 text-[#8E918F] transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-90' : ''} ${!isFolder && 'opacity-0 w-4'}`}>
                        {isFolder && <GoogleIcon path={UI_ICONS.chevron_right} className="w-4 h-4" />}
                    </span>

                    <span className="mr-2.5 flex-shrink-0">
                        <GoogleIcon path={iconInfo.path} style={{ color: iconInfo.color }} className="w-5 h-5" />
                    </span>

                    <span className={`text-[13px] truncate font-mono ${isFolder ? 'text-[#E3E3E3] font-bold tracking-tight' : 'text-[#C4C7C5]'}`}>
                        {node.name}
                    </span>

                    {!isFolder && node.fileData && (
                        <span className="ml-auto text-[10px] text-[#8E918F] opacity-0 group-hover:opacity-100 transition-opacity bg-[#1E1E1E] px-1.5 py-0.5 rounded border border-[#444746]">
                            {formatNumber(node.fileData.tokenCount)}
                        </span>
                    )}
                </div>

                {/* Delete Button - Now enabled for Folders too */}
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(node); }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-[#C4C7C5] hover:text-[#F2B8B5] hover:bg-[#F2B8B5]/10 rounded-full transition-all ml-1 shrink-0"
                >
                    <GoogleIcon path={UI_ICONS.delete} className="w-3.5 h-3.5" />
                </button>
            </div>

            <AnimatePresence>
                {isFolder && isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-l border-[#444746]/30 ml-[calc(1rem+4px)]"
                    >
                        {node.children.map(child => (
                            <TreeItem key={child.id} node={child} level={level} onRemove={onRemove} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatChip = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center bg-[#1E1E1E] border border-[#444746] rounded-2xl p-3 min-w-[90px] flex-1">
        <span className="text-[#A8C7FA] text-xl font-medium mb-0.5">{value}</span>
        <span className="text-[#C4C7C5] text-[10px] font-medium uppercase tracking-wide">{label}</span>
    </div>
);

export default function TextractorGoogleDark() {
    const [files, setFiles] = useState<FileData[]>([]);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [outputStyle, setOutputStyle] = useState<OutputStyle>('standard');
    const [gitModalOpen, setGitModalOpen] = useState(false);
    const [gitUrl, setGitUrl] = useState("");
    const [gitLoading, setGitLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMatches, setSearchMatches] = useState<number[]>([]);
    const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('tree');
    const [isLoadingSession, setIsLoadingSession] = useState(true);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const load = async () => {
            const loadedFiles = await loadSession();
            if (loadedFiles.length > 0) {
                setFiles(loadedFiles);
                if (loadedFiles.some(f => f.path.includes('/'))) setViewMode('tree');
            }
            setIsLoadingSession(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (!isLoadingSession) {
            saveSession(files);
        }
    }, [files, isLoadingSession]);

    const processFileObject = useCallback(async (fileObject: File | Blob, explicitPath: string = ""): Promise<FileData> => {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const name = (fileObject instanceof File) ? fileObject.name : `pasted_${Date.now()}.txt`;

        let fullPath = explicitPath;
        if (!fullPath && 'path' in fileObject) fullPath = (fileObject as any).path;
        if (!fullPath && (fileObject as any).webkitRelativePath) fullPath = (fileObject as any).webkitRelativePath;
        if (!fullPath) fullPath = name;
        if (fullPath.startsWith('/')) fullPath = fullPath.substring(1);

        const extension = name.split('.').pop()?.toLowerCase() || '';
        const isText =
            TEXT_FILE_EXTENSIONS.has(extension) ||
            fileObject.type.startsWith('text/') ||
            name.startsWith('.') ||
            (extension === name && !name.includes('.'));

        let content = "", lines = 0, chars = 0, tokens = 0;

        if (isText) {
            try {
                content = await fileObject.text();
                lines = content.split('\n').length;
                chars = content.length;
                tokens = encode(content).length;
            } catch (e) { console.error(e); }
        }

        return {
            id: fileId,
            name,
            content,
            isText,
            fileObject,
            linesOfCode: lines,
            characterCount: chars,
            tokenCount: tokens,
            path: fullPath
        };
    }, []);

    const unzipAndProcess = async (zipFile: File): Promise<FileData[]> => {
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(zipFile);
            const processedFiles: FileData[] = [];
            const promises: Promise<void>[] = [];

            content.forEach((relativePath, zipEntry) => {
                if (zipEntry.dir) return;
                if (relativePath.includes('/.')) return;

                const promise = zipEntry.async('blob').then(async (blob) => {
                     const name = relativePath.split('/').pop() || relativePath;
                     const file = new File([blob], name, { type: 'text/plain' });
                     const processed = await processFileObject(file, relativePath);
                     if (processed.isText) processedFiles.push(processed);
                });
                promises.push(promise);
            });

            await Promise.all(promises);
            return processedFiles;
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const addFiles = useCallback(async (incomingFiles: File[]) => {
        setProcessing(true);
        let newFiles: FileData[] = [];

        for (const file of incomingFiles) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
                const extracted = await unzipAndProcess(file);
                newFiles = [...newFiles, ...extracted];
            } else if (ext !== 'rar') {
                const processed = await processFileObject(file);
                newFiles.push(processed);
            }
        }

        setFiles(prev => [...prev, ...newFiles]);
        setProcessing(false);
        const hasFolders = newFiles.some(f => f.path.includes('/'));
        if (hasFolders) setViewMode('tree');
    }, [processFileObject]);

    const handleGitImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gitUrl) return;
        setGitLoading(true);
        setLoadingText("Resolving repository...");

        try {
            const rawUrl = gitUrl.replace(/\.git\/?$/, "");
            let filesToFetch: { name: string; url: string; path: string }[] = [];

            if (rawUrl.includes('github.com')) {
                const urlObj = new URL(rawUrl);
                const pathParts = urlObj.pathname.split('/').filter(Boolean);
                const owner = pathParts[0];
                const repo = pathParts[1];
                let branch = "";
                let subPath = "";

                if (pathParts[2] === 'tree' || pathParts[2] === 'blob') {
                    branch = pathParts[3];
                    subPath = pathParts.slice(4).join('/');
                }

                if (!branch) {
                    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
                    if (!repoInfoRes.ok) throw new Error("Repository not found");
                    const repoInfo: GitHubRepoInfo = await repoInfoRes.json();
                    branch = repoInfo.default_branch;
                }

                setLoadingText("Scanning file tree...");
                const treeApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
                const treeRes = await fetch(treeApiUrl);
                if (!treeRes.ok) throw new Error("Failed to fetch file tree");

                const treeData = await treeRes.json();
                if (treeData.truncated) alert("Repo is too large, some files may be missing.");

                filesToFetch = (treeData.tree as GitHubTreeItem[])
                    .filter(item => item.type === 'blob')
                    .filter(item => {
                        if (subPath && !item.path.startsWith(subPath)) return false;
                        return true;
                    })
                    .map(item => ({
                        name: item.path.split('/').pop() || item.path,
                        path: item.path,
                        url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`
                    }));
            }

            if (filesToFetch.length === 0) throw new Error("No files found.");

            setLoadingText(`Fetching ${filesToFetch.length} files...`);
            const BATCH_SIZE = 10;
            const newFiles: FileData[] = [];

            for (let i = 0; i < filesToFetch.length; i += BATCH_SIZE) {
                const batch = filesToFetch.slice(i, i + BATCH_SIZE);
                const promises = batch.map(async (f) => {
                    try {
                        const res = await fetch(f.url);
                        if (!res.ok) return null;
                        const text = await res.text();
                        const fileId = `git-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                        return {
                            id: fileId,
                            name: f.name,
                            content: text,
                            isText: true,
                            fileObject: new Blob([text], { type: 'text/plain' }),
                            linesOfCode: text.split('\n').length,
                            characterCount: text.length,
                            tokenCount: encode(text).length,
                            path: f.path
                        } as FileData;
                    } catch { return null; }
                });
                const results = await Promise.all(promises);
                results.forEach(r => r && newFiles.push(r));
                setLoadingText(`Fetching... ${Math.min(i + BATCH_SIZE, filesToFetch.length)}/${filesToFetch.length}`);
            }

            setFiles(prev => [...prev, ...newFiles]);
            setGitModalOpen(false);
            setGitUrl("");
            setViewMode('tree');
        } catch (error: unknown) {
            const err = error as Error;
            alert(err.message || "Import failed");
        } finally {
            setGitLoading(false);
            setLoadingText("");
        }
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: (files) => addFiles(files).catch(console.error),
        noClick: true,
        noKeyboard: true
    });

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
            if (e.clipboardData?.files?.length) {
                e.preventDefault();
                addFiles(Array.from(e.clipboardData.files)).catch(console.error);
            } else {
                const text = e.clipboardData?.getData('text');
                if (text) {
                   const blob = new Blob([text], { type: 'text/plain' });
                   const file = new File([blob], `pasted_text_${Date.now()}.txt`, { type: 'text/plain' });
                   addFiles([file]).catch(console.error);
                }
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [addFiles]);

    const activeFile = useMemo(() => files.find(f => f.id === activeId), [activeId, files]);
    const fileTree = useMemo(() => buildFileTree(files), [files]);

    const combinedText = useMemo(() => {
        return files.filter(f => f.isText).map(f => {
            const pathLabel = f.path || f.name;
            const ext = f.name.split('.').pop() || 'txt';
            switch (outputStyle) {
                case 'hash': return `# --- ${pathLabel} ---\n${f.content}`;
                case 'minimal': return `--- ${pathLabel} ---\n${f.content}`;
                case 'xml': return `<file name="${pathLabel}">\n${f.content}\n</file>`;
                case 'markdown': return `### ${pathLabel}\n\`\`\`${ext}\n${f.content}\n\`\`\``;
                case 'standard': default: return `/* --- ${pathLabel} --- */\n${f.content}`;
            }
        }).join('\n\n');
    }, [files, outputStyle]);

    const lineNumbers = useMemo(() => {
        const targetFiles = files.filter(f => f.isText);

        return targetFiles.map(f => {
            const lines = f.linesOfCode;
            const fileLineNums = Array.from({ length: lines }, (_, i) => i + 1).join('\n');

            switch (outputStyle) {
                case 'markdown':
                    return ` \n \n${fileLineNums}\n `;
                case 'xml':
                    return ` \n${fileLineNums}\n `;
                case 'minimal':
                case 'hash':
                case 'standard':
                default:
                    return ` \n${fileLineNums}`;
            }
        }).join('\n\n');
    }, [files, outputStyle]);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
        }
    };

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
            textAreaRef.current.focus();
            textAreaRef.current.setSelectionRange(matches[0], matches[0] + searchTerm.length);
        }
    }, [searchTerm, combinedText]);

    const handleNextMatch = () => {
        if (searchMatches.length === 0) return;
        const nextIdx = (currentMatchIdx + 1) % searchMatches.length;
        setCurrentMatchIdx(nextIdx);
        const start = searchMatches[nextIdx];
        textAreaRef.current?.setSelectionRange(start, start + searchTerm.length);
        textAreaRef.current?.blur();
        textAreaRef.current?.focus();
    };

    const handlePrevMatch = () => {
        if (searchMatches.length === 0) return;
        const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
        setCurrentMatchIdx(prevIdx);
        const start = searchMatches[prevIdx];
        textAreaRef.current?.setSelectionRange(start, start + searchTerm.length);
        textAreaRef.current?.blur();
        textAreaRef.current?.focus();
    };

    const copyToClipboard = () => {
        if (!combinedText) return;
        navigator.clipboard.writeText(combinedText)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
            });
    };

    const stats = useMemo(() => {
        const target = files.filter(f => f.isText);
        return {
            count: target.length,
            lines: target.reduce((a, b) => a + b.linesOfCode, 0),
            tokens: target.reduce((a, b) => a + b.tokenCount, 0)
        };
    }, [files]);

    const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

    // --- NEW: Remove Node (Files & Folders) ---
    const removeNode = (node: TreeNode) => {
        if (node.type === 'folder') {
            // Remove all files that start with this folder path
            setFiles(prev => prev.filter(f => {
                // We add a slash to ensure strict folder matching (prevent removing 'src_old' when removing 'src')
                // Also check exact match just in case
                const isMatch = f.path === node.path || f.path.startsWith(node.path + '/');
                return !isMatch;
            }));
        } else {
            removeFile(node.id);
        }
    };

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

            <header className="bg-[#1E1E1E] px-6 py-3 flex items-center justify-between shrink-0 border-b border-[#444746] z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#333537] rounded-xl flex items-center justify-center text-[#A8C7FA]">
                        <GoogleIcon path={UI_ICONS.code} className="w-6 h-6" />
                    </div>
                    <span className="text-[22px] font-normal text-[#C4C7C5] tracking-tight">Textractor <span className="text-xs align-top bg-[#333537] text-[#A8C7FA] px-2 py-0.5 rounded-full ml-1 font-medium">PRO</span></span>
                </div>

                <GoogleButton
                    variant="tonal"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={files.length === 0}
                    icon={UI_ICONS.delete}
                >
                    Reset
                </GoogleButton>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden relative z-10 max-w-[1800px] w-full mx-auto">

                <section className="w-full lg:w-[460px] flex flex-col gap-4 h-full shrink-0">
                    <div className="relative shrink-0">
                        <motion.div
                            onClick={open}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                rounded-3xl border border-dashed border-[#444746] bg-[#1E1E1E] p-6 cursor-pointer
                                transition-colors duration-200 flex flex-col items-center text-center gap-3
                                hover:bg-[#2B2930] hover:border-[#8E918F] group relative overflow-hidden
                                ${processing ? 'opacity-50 pointer-events-none' : ''}
                            `}
                        >
                            {processing ? (
                                <div className="w-12 h-12 border-4 border-[#333537] border-t-[#A8C7FA] rounded-full animate-spin mb-1"></div>
                            ) : (
                                <div className="w-12 h-12 bg-[#333537] rounded-full flex items-center justify-center text-[#C4C7C5] group-hover:text-[#A8C7FA] transition-colors shadow-md">
                                    <GoogleIcon path={UI_ICONS.upload} className="w-6 h-6" />
                                </div>
                            )}
                            <div>
                                <p className="text-[#E3E3E3] font-medium text-sm">Click to upload or drop</p>
                                <p className="text-xs text-[#8E918F] mt-1">ZIPs, Folders, Code & Clipboard</p>
                            </div>
                        </motion.div>

                        <div className="mt-3">
                            <GoogleButton
                                variant="outlined"
                                icon={UI_ICONS.github}
                                className="w-full justify-center border-[#444746] bg-[#1E1E1E]"
                                onClick={(e) => { if(e) e.stopPropagation(); setGitModalOpen(true); }}
                            >
                                Import Repository
                            </GoogleButton>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent">
                            <StatChip label="Files" value={stats.count} />
                            <StatChip label="Tokens" value={formatNumber(stats.tokens)} />
                            <StatChip label="Lines" value={formatNumber(stats.lines)} />
                        </div>
                    )}

                    <div className="flex-1 flex flex-col min-h-0 bg-[#1E1E1E] rounded-3xl border border-[#444746] overflow-hidden shadow-lg">
                        <div className="px-4 py-3 border-b border-[#444746] bg-[#1E1E1E] sticky top-0 z-10 shrink-0 flex items-center justify-between">
                            <h3 className="text-[#C4C7C5] font-medium text-sm uppercase tracking-wide pl-2">Explorer</h3>

                            <div className="flex bg-[#333537] rounded-full p-1">
                                <GoogleButton
                                    variant="icon"
                                    icon={UI_ICONS.view_tree}
                                    active={viewMode === 'tree'}
                                    onClick={() => setViewMode('tree')}
                                    className="w-8 h-8"
                                />
                                <GoogleButton
                                    variant="icon"
                                    icon={UI_ICONS.view_list}
                                    active={viewMode === 'list'}
                                    onClick={() => setViewMode('list')}
                                    className="w-8 h-8"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent">
                            {isLoadingSession ? (
                                <div className="flex items-center justify-center h-full text-[#8E918F] gap-2">
                                    <div className="w-4 h-4 border-2 border-[#444746] border-t-[#A8C7FA] rounded-full animate-spin"></div>
                                    <span className="text-sm">Restoring session...</span>
                                </div>
                            ) : viewMode === 'list' ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <ul className="flex flex-col p-2">
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
                            ) : (
                                <div className="p-2">
                                    {fileTree.map(node => (
                                        <TreeItem key={node.id} node={node} level={0} onRemove={removeNode} />
                                    ))}
                                </div>
                            )}

                            {!isLoadingSession && files.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-[#8E918F] py-10 opacity-60">
                                    <GoogleIcon path={ICONS_PATHS.folder_open} className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-sm">Workspace empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="flex-1 flex flex-col h-full min-w-0">
                    <div className="bg-[#1E1E1E] rounded-3xl border border-[#444746] flex flex-col h-full shadow-lg overflow-hidden relative">
                        <div className="px-6 py-4 border-b border-[#444746] flex items-center justify-between bg-[#1E1E1E] shrink-0 flex-wrap gap-4">

                            <div className="flex-1 min-w-[240px] flex items-center gap-3 bg-[#2B2930] rounded-full px-5 py-2.5 border border-[#444746] focus-within:border-[#A8C7FA] focus-within:bg-[#1E1E1E] transition-all">
                                <GoogleIcon path={UI_ICONS.search} className="text-[#8E918F] w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Find in code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent border-none outline-none text-[#E3E3E3] text-sm w-full placeholder-[#8E918F]"
                                />
                                {searchTerm && (
                                    <div className="flex items-center gap-2 pl-2 border-l border-[#444746]">
                                        <span className="text-xs text-[#8E918F] whitespace-nowrap font-mono">
                                            {searchMatches.length > 0 ? `${currentMatchIdx + 1}/${searchMatches.length}` : '0'}
                                        </span>
                                        <button onClick={handlePrevMatch} className="p-1 hover:text-[#A8C7FA] text-[#C4C7C5] disabled:opacity-30"><GoogleIcon path={UI_ICONS.arrow_up} className="w-4 h-4"/></button>
                                        <button onClick={handleNextMatch} className="p-1 hover:text-[#A8C7FA] text-[#C4C7C5] disabled:opacity-30"><GoogleIcon path={UI_ICONS.arrow_down} className="w-4 h-4"/></button>
                                        <button onClick={() => setSearchTerm("")} className="p-1 hover:text-[#F2B8B5] text-[#8E918F]"><GoogleIcon path={UI_ICONS.close} className="w-4 h-4"/></button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <div className="relative hidden md:block group">
                                    <select
                                        value={outputStyle}
                                        onChange={(e) => setOutputStyle(e.target.value as OutputStyle)}
                                        className="appearance-none bg-[#333537] text-[#C4C7C5] border border-[#444746] rounded-full pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:border-[#A8C7FA] cursor-pointer hover:bg-[#444746] transition-colors font-medium"
                                    >
                                        <option value="standard">Standard</option>
                                        <option value="hash">Hash Style</option>
                                        <option value="minimal">Minimal</option>
                                        <option value="xml">XML Tags</option>
                                        <option value="markdown">Markdown</option>
                                    </select>
                                    <div className="absolute left-3.5 top-2.5 text-[#A8C7FA] pointer-events-none">
                                        <GoogleIcon path={UI_ICONS.tune} className="w-4.5 h-4.5" />
                                    </div>
                                </div>

                                <GoogleButton
                                    onClick={copyToClipboard}
                                    variant="filled"
                                    icon={isCopied ? UI_ICONS.check : UI_ICONS.copy}
                                    disabled={!combinedText}
                                >
                                    {isCopied ? 'Copied' : 'Copy'}
                                </GoogleButton>
                            </div>
                        </div>

                        <div className="relative flex-1 min-h-0 flex bg-[#1A1A1A] group overflow-hidden">
                            <div
                                ref={lineNumbersRef}
                                className="h-full flex-shrink-0 w-12 bg-[#1E1E1E] border-r border-[#444746] text-right pr-3 pt-8 pb-8 overflow-hidden select-none"
                                aria-hidden="true"
                            >
                                <pre className="text-[13px] leading-[1.6] font-mono text-[#6e7072]" style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace' }}>
                                    {lineNumbers}
                                </pre>
                            </div>

                            <textarea
                                ref={textAreaRef}
                                value={combinedText}
                                onScroll={handleScroll}
                                readOnly
                                className="flex-1 h-full p-8 resize-none focus:outline-none font-mono text-[13px] leading-[1.6] text-[#C4C7C5] bg-transparent scrollbar-thin scrollbar-thumb-[#444746] scrollbar-track-transparent selection:bg-[#004A77] selection:text-[#C2E7FF] whitespace-pre"
                                placeholder="// Output preview..."
                                style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace' }}
                            />
                        </div>
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {isDragActive && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[#004A77]/40 backdrop-blur-md flex items-center justify-center pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                            className="bg-[#1E1E1E] p-10 rounded-[32px] shadow-2xl border border-[#A8C7FA]/30 flex flex-col items-center"
                        >
                            <div className="w-24 h-24 bg-[#333537] rounded-full flex items-center justify-center text-[#A8C7FA] mb-6 animate-bounce border-2 border-[#444746]">
                                <GoogleIcon path={UI_ICONS.upload} className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl text-[#E3E3E3] font-normal">Drop to analyze</h2>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCopied && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#E3E3E3] text-[#062E6F] px-6 py-3.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.4)] text-sm font-medium flex items-center gap-3 border border-white/50"
                    >
                        <GoogleIcon path={UI_ICONS.check} className="w-5 h-5" />
                        Content copied to clipboard
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteConfirmOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirmOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#2B2930] rounded-[28px] p-8 w-full max-w-sm shadow-2xl border border-[#444746]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 rounded-full bg-[#601410] text-[#F9DEDC] flex items-center justify-center mb-4">
                                    <GoogleIcon path={UI_ICONS.delete} className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl text-[#E3E3E3] leading-8">Reset workspace?</h3>
                                <p className="text-[#C4C7C5] text-sm mt-2 leading-5">
                                    This will remove all {files.length} files. This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex justify-stretch gap-3">
                                <GoogleButton variant="tonal" className="flex-1" onClick={() => setDeleteConfirmOpen(false)}>
                                    Cancel
                                </GoogleButton>
                                <GoogleButton variant="filled" className="bg-[#8C1D18] text-[#F9DEDC] hover:bg-[#601410] flex-1 border-none" onClick={() => {
                                    setFiles([]);
                                    saveSession([]);
                                    setDeleteConfirmOpen(false);
                                }}>
                                    Reset
                                </GoogleButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {gitModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => !gitLoading && setGitModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#1E1E1E] rounded-[28px] p-8 w-full max-w-lg shadow-2xl border border-[#444746]"
                            onClick={e => e.stopPropagation()}
                        >
                            <form onSubmit={handleGitImport}>
                                <div className="flex items-center gap-4 mb-6 border-b border-[#444746] pb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#333537] flex items-center justify-center shrink-0">
                                        <GoogleIcon path={UI_ICONS.github} className="w-7 h-7 text-[#E3E3E3]" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl text-[#E3E3E3] font-medium">Import Repository</h3>
                                        <p className="text-sm text-[#8E918F]">Supports GitHub & GitLab</p>
                                    </div>
                                </div>
                                <div className="relative mb-6">
                                    <label className="text-xs text-[#A8C7FA] ml-4 mb-1 block font-medium">Repository URL</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={gitUrl}
                                            onChange={(e) => setGitUrl(e.target.value)}
                                            placeholder="https://github.com/username/repo"
                                            className="w-full bg-[#2B2930] border border-[#444746] rounded-xl pl-12 pr-4 py-3.5 text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none focus:border-[#A8C7FA] focus:ring-1 focus:ring-[#A8C7FA] transition-all"
                                            disabled={gitLoading}
                                        />
                                        <div className="absolute left-4 top-3.5 text-[#C4C7C5]">
                                            <GoogleIcon path={UI_ICONS.search} className="w-5 h-5" />
                                        </div>
                                        {gitLoading && (
                                            <div className="absolute right-4 top-3.5">
                                                <div className="w-5 h-5 border-2 border-[#444746] border-t-[#A8C7FA] rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {gitLoading && (
                                    <div className="bg-[#004A77]/20 border border-[#004A77] rounded-xl p-4 mb-6 flex items-center gap-3">
                                        <div className="w-2 h-2 bg-[#A8C7FA] rounded-full animate-ping"></div>
                                        <p className="text-[#A8C7FA] text-sm font-mono">{loadingText}</p>
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 mt-8">
                                    <GoogleButton variant="text" onClick={() => setGitModalOpen(false)} disabled={gitLoading}>
                                        Cancel
                                    </GoogleButton>
                                    <GoogleButton variant="filled" type="submit" disabled={!gitUrl || gitLoading}>
                                        Import Files
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