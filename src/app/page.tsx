'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { GoogleButton } from '@/components/ui/GoogleButton';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { FileCard } from '@/components/FileCard';
import { SortableItem } from '@/components/SortableItem';
import { TreeItem } from '@/components/TreeItem';
import { OutputStyleSelector } from '@/components/OutputStyleSelector';
import { StatChip } from '@/components/StatChip';

// Hooks
import { useFileSystem } from '@/hooks/useFileSystem';
import { useSearch } from '@/hooks/useSearch';

// Services & Utils
import { fetchGitFiles } from '@/lib/git-service';
import { formatNumber } from '@/lib/format';

// Types & Constants
import { OutputStyle } from '@/types';
import { UI_ICONS, ICONS_PATHS } from '@/constants';

export default function Contextractor() {
    // State for UI specific features
    const [isCopied, setIsCopied] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [outputStyle, setOutputStyle] = useState<OutputStyle>('standard');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // New State for Mobile Sidebar
    
    // Git Modal State
    const [gitModalOpen, setGitModalOpen] = useState(false);
    const [gitUrl, setGitUrl] = useState("");
    const [gitLoading, setGitLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");

    // Refs
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    // Custom Hooks
    const { 
        files, setFiles, activeId, processing, isLoadingSession, 
        viewMode, setViewMode, addFiles, removeFile, removeNode, clearWorkspace, 
        handleDragStart, handleDragEnd, activeFile, fileTree, stats 
    } = useFileSystem();

    // Derived State (Computed Text)
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

    // Search Hook
    const { 
        searchTerm, setSearchTerm, searchMatches, currentMatchIdx, 
        handleNextMatch, handlePrevMatch 
    } = useSearch(combinedText, textAreaRef);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Git Import Handler
    const handleGitImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gitUrl) return;
        setGitLoading(true);
        
        try {
            const newFiles = await fetchGitFiles(gitUrl, setLoadingText);
            setFiles(prev => [...prev, ...newFiles]);
            setGitModalOpen(false);
            setGitUrl("");
            setViewMode('tree');
            setIsMobileSidebarOpen(false); // Close sidebar on mobile after import
        } catch (error: unknown) {
            const err = error as Error;
            alert(err.message || "Import failed");
        } finally {
            setGitLoading(false);
            setLoadingText("");
        }
    };

    // Dropzone
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: (files) => {
            addFiles(files).catch(console.error);
            setIsMobileSidebarOpen(false); // Close sidebar on mobile after drop
        },
        noClick: true,
        noKeyboard: true
    });

    // Paste Handler (Effect)
    React.useEffect(() => {
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

    // Text Area Utils
    const lineNumbers = useMemo(() => {
        const targetFiles = files.filter(f => f.isText);

        return targetFiles.map(f => {
            const lines = f.linesOfCode;
            const fileLineNums = Array.from({ length: lines }, (_, i) => i + 1).join('\n');

            switch (outputStyle) {
                case 'markdown': return ` \n \n${fileLineNums}\n `;
                case 'xml': return ` \n${fileLineNums}\n `;
                default: return ` \n${fileLineNums}`;
            }
        }).join('\n\n');
    }, [files, outputStyle]);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
        }
    };

    const copyToClipboard = () => {
        if (!combinedText) return;
        navigator.clipboard.writeText(combinedText)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
            });
    };

    return (
        <div {...getRootProps()} className="h-screen bg-[#131314] text-[#E3E3E3] font-sans flex flex-col selection:bg-[#004A77] selection:text-[#C2E7FF] outline-none overflow-hidden">
            <input {...getInputProps()} />

            <header className="bg-[#1E1E1E] px-6 py-3 flex items-center justify-between shrink-0 border-b border-[#444746] z-20">
                <div className="flex items-center gap-3">
                    {/* Mobile Menu Button - Use explicit toggle to improve responsiveness */}
                    <div className="lg:hidden">
                        <GoogleButton
                            variant="icon"
                            onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                            icon={UI_ICONS.menu}
                        />
                    </div>

                    <div className="hidden sm:block">
                        <AnimatedLogo />
                    </div>
                    <span className="text-[22px] font-normal text-[#C4C7C5] tracking-tight hidden sm:inline">Contextractor <span className="text-xs align-top bg-[#333537] text-[#A8C7FA] px-2 py-0.5 rounded-full ml-1 font-medium">PRO</span></span>
                    <span className="text-[22px] font-normal text-[#C4C7C5] tracking-tight sm:hidden">Contextractor</span>
                </div>

                <GoogleButton
                    variant="tonal"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={files.length === 0}
                    icon={UI_ICONS.delete}
                >
                    <span className="hidden sm:inline">Reset</span>
                </GoogleButton>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row lg:gap-6 lg:p-6 overflow-hidden relative z-10 max-w-[1800px] w-full mx-auto">

                {/* Mobile Sidebar Overlay */}
                <AnimatePresence>
                    {isMobileSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                        />
                    )}
                </AnimatePresence>

                {/* Explorer Section - Responsive Sidebar */}
                <section className={`
                    flex flex-col gap-4 h-full shrink-0
                    fixed inset-y-0 left-0 z-40 w-[320px] bg-[#1E1E1E] p-4 border-r border-[#444746] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                    lg:relative lg:inset-auto lg:z-auto lg:w-[460px] lg:bg-transparent lg:p-0 lg:border-none lg:shadow-none lg:translate-x-0
                    ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    {/* Mobile Sidebar Header */}
                    <div className="flex items-center justify-between mb-2 lg:hidden">
                        <h2 className="text-lg font-medium text-[#E3E3E3] flex items-center gap-2">
                            <GoogleIcon path={ICONS_PATHS.folder_open} className="w-5 h-5 text-[#A8C7FA]" />
                            Files
                        </h2>
                        <GoogleButton variant="icon" icon={UI_ICONS.close} onClick={() => setIsMobileSidebarOpen(false)} />
                    </div>

                    {/* Mobile-Only Output Style Selector - Added here as requested */}
                    <div className="lg:hidden mb-4">
                        <div className="relative group z-50">
                            <OutputStyleSelector 
                                value={outputStyle} 
                                onChange={setOutputStyle} 
                            />
                        </div>
                    </div>

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
                    <div className="bg-[#1E1E1E] lg:rounded-3xl lg:border border-[#444746] flex flex-col h-full lg:shadow-lg overflow-hidden relative border-t lg:border-t-0">
                        <div className="px-4 lg:px-6 py-4 border-b border-[#444746] flex items-center justify-between bg-[#1E1E1E] shrink-0 flex-wrap gap-4">

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
                                <div className="relative hidden md:block group z-50">
                                    <OutputStyleSelector 
                                        value={outputStyle} 
                                        onChange={setOutputStyle} 
                                    />
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
                                    clearWorkspace();
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
