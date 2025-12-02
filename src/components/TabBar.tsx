// VS Code Style Tab Bar Component
// Professional-grade tab management with context menu, drag & drop, and animations

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@dnd-kit/core';
import {
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Session } from '@/types/session';
import { GoogleIcon } from '@/components/ui/GoogleIcon';

// Icons
const ICONS = {
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    pin: "M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z",
    home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    more: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    duplicate: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    closeOthers: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    closeAll: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
    edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
};

// File extension colors
const getExtensionColor = (files: Session['files']): string => {
    if (files.length === 0) return '#8E918F';
    const ext = files[0]?.name.split('.').pop()?.toLowerCase();
    const colorMap: Record<string, string> = {
        ts: '#3178C6',
        tsx: '#3178C6',
        js: '#F7DF1E',
        jsx: '#61DAFB',
        py: '#3776AB',
        java: '#ED8B00',
        go: '#00ADD8',
        rs: '#DEA584',
        vue: '#42B883',
        svelte: '#FF3E00',
        css: '#1572B6',
        scss: '#CC6699',
        html: '#E34F26',
        json: '#292929',
        md: '#083FA1',
    };
    return colorMap[ext || ''] || '#8E918F';
};

interface TabBarProps {
    sessions: Session[];
    activeSessionId: string | null;
    showHomeView: boolean;
    onSwitchSession: (id: string) => void;
    onCloseSession: (id: string) => void;
    onCreateSession: () => void;
    onToggleHomeView: (show: boolean) => void;
    onRenameSession: (id: string, name: string) => void;
    onDuplicateSession: (id: string) => void;
    onCloseOtherSessions: (keepId: string) => void;
    onCloseAllSessions: () => void;
    onTogglePinSession: (id: string) => void;
    onReorderSessions: (fromIndex: number, toIndex: number) => void;
}

interface ContextMenuState {
    isOpen: boolean;
    sessionId: string | null;
    x: number;
    y: number;
}

// Sortable Tab Component
interface SortableTabProps {
    session: Session;
    isActive: boolean;
    showHomeView: boolean;
    editingTabId: string | null;
    editValue: string;
    editInputRef: React.RefObject<HTMLInputElement | null>;
    onContextMenu: (e: React.MouseEvent, sessionId: string) => void;
    onSwitchSession: (id: string) => void;
    onToggleHomeView: (show: boolean) => void;
    onStartEdit: (sessionId: string, currentName: string) => void;
    onEditChange: (value: string) => void;
    onFinishEdit: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onCloseSession: (id: string) => void;
    isDragging?: boolean;
}

const SortableTab: React.FC<SortableTabProps> = ({
    session,
    isActive,
    showHomeView,
    editingTabId,
    editValue,
    editInputRef,
    onContextMenu,
    onSwitchSession,
    onToggleHomeView,
    onStartEdit,
    onEditChange,
    onFinishEdit,
    onKeyDown,
    onCloseSession,
    isDragging = false,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: session.id });

    const fileCount = session.files.length;
    const hasUnsavedChanges = session.files.length > 0;
    const isActiveTab = isActive && !showHomeView;

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            onContextMenu={(e) => onContextMenu(e, session.id)}
            onClick={() => {
                if (editingTabId !== session.id) {
                    onSwitchSession(session.id);
                    onToggleHomeView(false);
                }
            }}
            onDoubleClick={() => onStartEdit(session.id, session.name)}
            className={`
                group relative flex items-center gap-2 px-3 h-[35px] min-w-[120px] max-w-[200px] cursor-grab active:cursor-grabbing
                border-r border-[#3C3C3C] transition-all duration-150
                ${isActiveTab 
                    ? 'bg-[#1E1E1E] text-[#E3E3E3]' 
                    : 'bg-[#2D2D2D] text-[#969696] hover:text-[#E3E3E3] hover:bg-[#323232]'
                }
                ${isDragging ? 'shadow-lg ring-2 ring-[#A8C7FA]/50' : ''}
            `}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isSortableDragging ? 0.5 : 1,
                zIndex: isSortableDragging ? 100 : 1,
                borderTop: isActiveTab ? `2px solid ${session.color || '#A8C7FA'}` : '2px solid transparent',
            }}
        >
            {/* Pin indicator */}
            {session.isPinned && (
                <GoogleIcon 
                    path={ICONS.pin} 
                    className="w-3 h-3 text-[#A8C7FA] shrink-0" 
                />
            )}

            {/* File icon with extension color */}
            <div 
                className="w-4 h-4 shrink-0 flex items-center justify-center rounded"
                style={{ color: getExtensionColor(session.files) }}
            >
                <GoogleIcon path={ICONS.file} className="w-4 h-4" />
            </div>

            {/* Tab name or input */}
            {editingTabId === session.id ? (
                <input
                    ref={editInputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    onBlur={onFinishEdit}
                    onKeyDown={onKeyDown}
                    className="flex-1 bg-[#3C3C3C] text-[#E3E3E3] text-xs px-1 py-0.5 rounded outline-none border border-[#007ACC] min-w-0"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className="text-xs truncate flex-1">{session.name}</span>
            )}

            {/* File count badge */}
            {fileCount > 0 && editingTabId !== session.id && (
                <span className="text-[10px] bg-[#3C3C3C] text-[#969696] px-1.5 rounded-full shrink-0">
                    {fileCount}
                </span>
            )}

            {/* Unsaved indicator */}
            {hasUnsavedChanges && !session.isPinned && (
                <div className="w-2 h-2 rounded-full bg-[#E3E3E3] shrink-0 group-hover:hidden" />
            )}

            {/* Close button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onCloseSession(session.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`
                    w-5 h-5 rounded flex items-center justify-center shrink-0
                    text-[#969696] hover:text-[#E3E3E3] hover:bg-[#4A4A4A]
                    ${hasUnsavedChanges && !session.isPinned ? 'hidden group-hover:flex' : 'opacity-0 group-hover:opacity-100'}
                `}
            >
                <GoogleIcon path={ICONS.close} className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

// Drag overlay tab (shown while dragging)
const DragOverlayTab: React.FC<{ session: Session }> = ({ session }) => {
    const fileCount = session.files.length;
    
    return (
        <div
            className="flex items-center gap-2 px-3 h-[35px] min-w-[120px] max-w-[200px] cursor-grabbing
                bg-[#1E1E1E] text-[#E3E3E3] border border-[#A8C7FA] rounded shadow-xl"
            style={{ borderTop: `2px solid ${session.color || '#A8C7FA'}` }}
        >
            {session.isPinned && (
                <GoogleIcon path={ICONS.pin} className="w-3 h-3 text-[#A8C7FA] shrink-0" />
            )}
            <div 
                className="w-4 h-4 shrink-0 flex items-center justify-center rounded"
                style={{ color: getExtensionColor(session.files) }}
            >
                <GoogleIcon path={ICONS.file} className="w-4 h-4" />
            </div>
            <span className="text-xs truncate flex-1">{session.name}</span>
            {fileCount > 0 && (
                <span className="text-[10px] bg-[#3C3C3C] text-[#969696] px-1.5 rounded-full shrink-0">
                    {fileCount}
                </span>
            )}
        </div>
    );
};

export const TabBar: React.FC<TabBarProps> = ({
    sessions,
    activeSessionId,
    showHomeView,
    onSwitchSession,
    onCloseSession,
    onCreateSession,
    onToggleHomeView,
    onRenameSession,
    onDuplicateSession,
    onCloseOtherSessions,
    onCloseAllSessions,
    onTogglePinSession,
    onReorderSessions,
}) => {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        isOpen: false,
        sessionId: null,
        x: 0,
        y: 0,
    });
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    // Handle drag start
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveTabId(String(event.active.id));
    }, []);

    // Handle drag end
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTabId(null);

        if (over && active.id !== over.id) {
            const oldIndex = sessions.findIndex(s => s.id === active.id);
            const newIndex = sessions.findIndex(s => s.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                onReorderSessions(oldIndex, newIndex);
            }
        }
    }, [sessions, onReorderSessions]);

    // Close context menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(prev => ({ ...prev, isOpen: false }));
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when editing
    useEffect(() => {
        if (editingTabId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingTabId]);

    const handleContextMenu = useCallback((e: React.MouseEvent, sessionId: string) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            sessionId,
            x: e.clientX,
            y: e.clientY,
        });
    }, []);

    const handleStartEdit = useCallback((sessionId: string, currentName: string) => {
        setEditingTabId(sessionId);
        setEditValue(currentName);
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleFinishEdit = useCallback(() => {
        if (editingTabId && editValue.trim()) {
            onRenameSession(editingTabId, editValue.trim());
        }
        setEditingTabId(null);
        setEditValue('');
    }, [editingTabId, editValue, onRenameSession]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFinishEdit();
        } else if (e.key === 'Escape') {
            setEditingTabId(null);
            setEditValue('');
        }
    }, [handleFinishEdit]);

    const contextSession = sessions.find(s => s.id === contextMenu.sessionId);
    const draggedSession = activeTabId ? sessions.find(s => s.id === activeTabId) : null;

    return (
        <div className="bg-[#252526] border-b border-[#3C3C3C] flex items-center h-[35px] select-none overflow-hidden">
            {/* Home Tab */}
            <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onToggleHomeView(true)}
                className={`
                    flex items-center gap-2 px-4 h-full border-r border-[#3C3C3C] transition-colors shrink-0
                    ${showHomeView ? 'bg-[#1E1E1E] text-[#E3E3E3]' : 'text-[#969696] hover:text-[#E3E3E3]'}
                `}
            >
                <GoogleIcon path={ICONS.home} className="w-4 h-4" />
                <span className="text-xs font-medium">Home</span>
            </motion.button>

            {/* Session Tabs with DnD */}
            <div className="flex-1 flex items-center overflow-x-auto scrollbar-none h-full">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={sessions.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                        {sessions.map((session) => (
                            <SortableTab
                                key={session.id}
                                session={session}
                                isActive={session.id === activeSessionId}
                                showHomeView={showHomeView}
                                editingTabId={editingTabId}
                                editValue={editValue}
                                editInputRef={editInputRef}
                                onContextMenu={handleContextMenu}
                                onSwitchSession={onSwitchSession}
                                onToggleHomeView={onToggleHomeView}
                                onStartEdit={handleStartEdit}
                                onEditChange={setEditValue}
                                onFinishEdit={handleFinishEdit}
                                onKeyDown={handleKeyDown}
                                onCloseSession={onCloseSession}
                            />
                        ))}
                    </SortableContext>

                    {/* Drag overlay */}
                    <DragOverlay>
                        {draggedSession ? <DragOverlayTab session={draggedSession} /> : null}
                    </DragOverlay>
                </DndContext>

                {/* New Tab Button */}
                <motion.button
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onCreateSession}
                    className="flex items-center justify-center w-[35px] h-[35px] shrink-0 text-[#969696] hover:text-[#E3E3E3] transition-colors"
                    title="New Tab (Ctrl+T)"
                >
                    <GoogleIcon path={ICONS.add} className="w-5 h-5" />
                </motion.button>
            </div>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu.isOpen && contextSession && (
                    <motion.div
                        ref={contextMenuRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="fixed z-[100] bg-[#252526] border border-[#454545] rounded-md shadow-xl py-1 min-w-[180px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <ContextMenuItem
                            icon={ICONS.edit}
                            label="Rename"
                            onClick={() => handleStartEdit(contextSession.id, contextSession.name)}
                        />
                        <ContextMenuItem
                            icon={ICONS.pin}
                            label={contextSession.isPinned ? 'Unpin Tab' : 'Pin Tab'}
                            onClick={() => {
                                onTogglePinSession(contextSession.id);
                                setContextMenu(prev => ({ ...prev, isOpen: false }));
                            }}
                        />
                        <ContextMenuItem
                            icon={ICONS.duplicate}
                            label="Duplicate Tab"
                            onClick={() => {
                                onDuplicateSession(contextSession.id);
                                setContextMenu(prev => ({ ...prev, isOpen: false }));
                            }}
                        />
                        <div className="h-px bg-[#454545] my-1" />
                        <ContextMenuItem
                            icon={ICONS.close}
                            label="Close"
                            shortcut="Ctrl+W"
                            onClick={() => {
                                onCloseSession(contextSession.id);
                                setContextMenu(prev => ({ ...prev, isOpen: false }));
                            }}
                        />
                        <ContextMenuItem
                            icon={ICONS.closeOthers}
                            label="Close Others"
                            onClick={() => {
                                onCloseOtherSessions(contextSession.id);
                                setContextMenu(prev => ({ ...prev, isOpen: false }));
                            }}
                            disabled={sessions.length <= 1}
                        />
                        <ContextMenuItem
                            icon={ICONS.closeAll}
                            label="Close All"
                            onClick={() => {
                                onCloseAllSessions();
                                setContextMenu(prev => ({ ...prev, isOpen: false }));
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Context Menu Item Component
interface ContextMenuItemProps {
    icon: string;
    label: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
}

const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
    icon,
    label,
    shortcut,
    onClick,
    disabled = false,
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
            w-full flex items-center gap-3 px-3 py-1.5 text-xs text-left
            transition-colors
            ${disabled 
                ? 'text-[#5A5A5A] cursor-not-allowed' 
                : 'text-[#CCCCCC] hover:bg-[#094771] hover:text-white'
            }
        `}
    >
        <GoogleIcon path={icon} className="w-4 h-4" />
        <span className="flex-1">{label}</span>
        {shortcut && (
            <span className="text-[10px] text-[#6E6E6E]">{shortcut}</span>
        )}
    </button>
);

export default TabBar;
