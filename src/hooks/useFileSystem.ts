import { useState, useEffect, useCallback, useMemo } from 'react';
import { DragEndEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FileData, TreeNode, ViewMode } from '@/types';
import { loadSession, saveSession } from '@/lib/db';
import { processFileObject, unzipAndProcess } from '@/lib/file-processing';
import { buildFileTree } from '@/lib/file-tree';

export const useFileSystem = () => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [processing, setProcessing] = useState(false);
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('tree');

    // Load session on mount
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

    // Save session on change
    useEffect(() => {
        if (!isLoadingSession) {
            saveSession(files);
        }
    }, [files, isLoadingSession]);

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
    }, []);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const removeNode = useCallback((node: TreeNode) => {
        if (node.type === 'folder') {
            setFiles(prev => prev.filter(f => {
                const isMatch = f.path === node.path || f.path.startsWith(node.path + '/');
                return !isMatch;
            }));
        } else {
            removeFile(node.id);
        }
    }, [removeFile]);

    const handleDragStart = useCallback((e: DragStartEvent) => {
        setActiveId(e.active.id);
    }, []);

    const handleDragEnd = useCallback((e: DragEndEvent) => {
        const { active, over } = e;
        setActiveId(null);
        if (over && active.id !== over.id) {
            setFiles(items => {
                const oldIdx = items.findIndex(i => i.id === active.id);
                const newIdx = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIdx, newIdx);
            });
        }
    }, []);

    const clearWorkspace = useCallback(() => {
        setFiles([]);
        saveSession([]);
    }, []);

    const activeFile = useMemo(() => files.find(f => f.id === activeId), [activeId, files]);
    const fileTree = useMemo(() => buildFileTree(files), [files]);
    
    const stats = useMemo(() => {
        const target = files.filter(f => f.isText);
        return {
            count: target.length,
            lines: target.reduce((a, b) => a + b.linesOfCode, 0),
            tokens: target.reduce((a, b) => a + b.tokenCount, 0)
        };
    }, [files]);

    return {
        files,
        setFiles,
        activeId,
        processing,
        isLoadingSession,
        viewMode,
        setViewMode,
        addFiles,
        removeFile,
        removeNode,
        clearWorkspace,
        handleDragStart,
        handleDragEnd,
        activeFile,
        fileTree,
        stats
    };
};

