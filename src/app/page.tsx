'use client';

import React, { useState, useCallback, useRef } from 'react';
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
  DragOverlay
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

interface FileData {
  id: string;
  name: string;
  content: string;
}

const FileTile = ({ file, onRemove, isDragging = false }: { file: FileData; onRemove?: (id: string) => void; isDragging?: boolean }) => {
  return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center justify-between transition-all duration-200 ${isDragging ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/10' : 'hover:bg-gray-750'}`}>
        <div className="flex items-center flex-1 min-w-0 select-none">
          <div className="mr-4 text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="truncate flex-1 min-w-0">
            <p className="font-medium text-white truncate">{file.name}</p>
            <p className="text-sm text-gray-400 truncate">
              {file.content.length > 50
                  ? `${file.content.substring(0, 50)}...`
                  : file.content}
            </p>
          </div>
        </div>
        {onRemove && (
            <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent drag when clicking remove button
                  onRemove(file.id);
                }}
                className="ml-3 p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
        )}
      </div>
  );
};

const SortableItem = ({ file, onRemove, isDragging }: { file: FileData; onRemove: (id: string) => void; isDragging: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Make the entire item draggable, not just a handle
  return (
      <motion.li
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={style}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: isDragging ? 0.4 : 1,
            y: 0,
            scale: isDragging ? 0.98 : 1,
          }}
          exit={{ opacity: 0, y: -20 }}
          className={`cursor-grab active:cursor-grabbing select-none ${isDragging ? 'pointer-events-none' : ''}`}
      >
        <FileTile file={file} onRemove={onRemove} />
      </motion.li>
  );
};

// Material Design inspired button with ripple effect
const MaterialButton = ({
                          children,
                          onClick,
                          variant = 'contained',
                          color = 'primary',
                          startIcon = null,
                          className = ''
                        }: {
  children: React.ReactNode,
  onClick: () => void,
  variant?: 'contained' | 'outlined' | 'text',
  color?: 'primary' | 'error' | 'default',
  startIcon?: React.ReactNode,
  className?: string
}) => {
  // Color classes mapping
  const colorClasses = {
    primary: {
      contained: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
      outlined: 'border-2 border-blue-500 text-blue-500 hover:bg-blue-50/10',
      text: 'text-blue-500 hover:bg-blue-50/10'
    },
    error: {
      contained: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
      outlined: 'border-2 border-red-500 text-red-500 hover:bg-red-50/10',
      text: 'text-red-500 hover:bg-red-50/10'
    },
    default: {
      contained: 'bg-gray-700 text-white hover:bg-gray-800 shadow-md',
      outlined: 'border-2 border-gray-500 text-gray-300 hover:bg-gray-700',
      text: 'text-gray-300 hover:bg-gray-700'
    }
  };

  // Base classes + variant-specific classes
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center justify-center';
  const variantClasses = colorClasses[color][variant];

  return (
      <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClick}
          className={`${baseClasses} ${variantClasses} ${className}`}
      >
        {startIcon && <span className="mr-2">{startIcon}</span>}
        {children}
      </motion.button>
  );
};

export default function Home() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [combinedText, setCombinedText] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          delay: 100,
          tolerance: 5,
        }
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
  );

  // Handle file upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();

      reader.onload = () => {
        const content = reader.result as string;

        setFiles(prevFiles => [
          ...prevFiles,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            content
          }
        ]);
      };

      reader.readAsText(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true
  });

  // Handle drag start for sorting
  const handleDragStart = (event: DragStartEvent) => {
    document.body.classList.add('select-none');
    setActiveId(event.active.id as string);
  };

  // Handle file reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    document.body.classList.remove('select-none');
    setActiveId(null);

    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Remove a file
  const removeFile = (id: string) => {
    setFiles(prev => {
      return prev.filter(file => file.id !== id);
    });
  };

  // Delete all files
  const deleteAllFiles = () => {
    setFiles([]);
    setCombinedText('');
    setDeleteConfirmOpen(false);
  };

  // Generate combined text
  const generateCombinedText = () => {
    const text = files.map(file => `${file.name}\n${file.content}`).join('\n\n');
    setCombinedText(text);
  };

  // Copy text to clipboard
  const copyToClipboard = () => {
    if (textAreaRef.current) {
      navigator.clipboard.writeText(textAreaRef.current.value)
          .then(() => {
            setIsCopied(true);
            setTimeout(() => {
              setIsCopied(false);
            }, 2000);
          })
          .catch(err => {
            console.error('Could not copy text: ', err);
          });
    }
  };

  // Find the active file being dragged
  const activeFile = activeId ? files.find(file => file.id === activeId) : null;

  return (
      <div
          {...getRootProps()}
          className="min-h-screen flex flex-col relative"
      >
        <input {...getInputProps()} />

        {/* Main content */}
        <main className="min-h-screen bg-gray-900 p-6 md:p-10 text-white flex-grow">
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-5xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </motion.div>
              <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-3xl md:text-4xl font-medium text-white"
              >
                Textractor
              </motion.h1>
            </div>

            {/* Upload Zone */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                onClick={open}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 mb-8 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50 shadow-sm"
            >
              <div className="flex flex-col items-center justify-center">
                <svg
                    className="w-16 h-16 mb-4 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                  <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-lg font-medium mb-2 text-white">
                  Click to select files
                </p>
                <p className="text-gray-400">or drag & drop files anywhere on this page</p>
              </div>
            </motion.div>

            {/* File List */}
            {files.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-8"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div className="flex items-center">
                      <h2 className="text-xl font-medium text-white flex items-center">
                        <span className="mr-3">Files</span>
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center justify-center bg-gray-800 text-blue-300 rounded-full h-6 w-6 text-sm"
                        >
                          {files.length}
                        </motion.span>
                      </h2>

                      {files.length > 0 && (
                          <MaterialButton
                              variant="text"
                              color="error"
                              onClick={() => setDeleteConfirmOpen(true)}
                              startIcon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              }
                              className="ml-4"
                          >
                            Delete All
                          </MaterialButton>
                      )}
                    </div>
                    <MaterialButton
                        onClick={generateCombinedText}
                        startIcon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2v6h6" />
                          </svg>
                        }
                    >
                      Generate Combined Text
                    </MaterialButton>
                  </div>

                  <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={files.map(file => file.id)} strategy={verticalListSortingStrategy}>
                      <motion.ul className="space-y-3">
                        {files.map((file) => (
                            <SortableItem
                                key={file.id}
                                file={file}
                                onRemove={removeFile}
                                isDragging={activeId === file.id}
                            />
                        ))}
                      </motion.ul>
                    </SortableContext>

                    {/* Drag overlay shows above everything else */}
                    <DragOverlay adjustScale={false} zIndex={100}>
                      {activeId && activeFile ? (
                          <div className="w-full select-none opacity-100">
                            <FileTile file={activeFile} isDragging={true} />
                          </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </motion.div>
            )}

            {/* Combined Text Output */}
            <AnimatePresence>
              {combinedText && (
                  <motion.div
                      key="output"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-800 rounded-lg shadow-md border border-gray-700 p-5"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                      <h2 className="text-xl font-medium text-white">
                        Combined Text
                      </h2>
                      <div className="relative">
                        <MaterialButton
                            onClick={copyToClipboard}
                            startIcon={
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                              </svg>
                            }
                        >
                          {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                        </MaterialButton>
                      </div>
                    </div>
                    <div className="relative">
                  <textarea
                      ref={textAreaRef}
                      value={combinedText}
                      onChange={(e) => setCombinedText(e.target.value)}
                      className="w-full h-64 p-4 bg-gray-900 border border-gray-700 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-300 resize-none"
                  />
                      <AnimatePresence>
                        {isCopied && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-md shadow-md text-sm"
                            >
                              Copied to clipboard
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>

        {/* Full-page overlay when dragging files for upload */}
        <AnimatePresence>
          {isDragActive && (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50"
              >
                <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="bg-gray-800 p-10 rounded-xl border-2 border-dashed border-blue-500 max-w-xl w-full text-center"
                >
                  <motion.div
                      animate={{ y: [-10, 0, -10] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="mx-auto mb-6"
                  >
                    <svg className="w-24 h-24 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </motion.div>
                  <h2 className="text-2xl font-medium text-white mb-2">Drop Files Here</h2>
                  <p className="text-gray-300">Release to upload your files</p>
                </motion.div>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirmation dialog */}
        <AnimatePresence>
          {deleteConfirmOpen && (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50"
                  onClick={() => setDeleteConfirmOpen(false)}
              >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full m-4"
                    onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100/10 flex items-center justify-center mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-white">Delete all files?</h3>
                  </div>
                  <p className="text-gray-300 mb-6">
                    Are you sure you want to delete all files? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3">
                    <MaterialButton
                        variant="text"
                        color="default"
                        onClick={() => setDeleteConfirmOpen(false)}
                    >
                      Cancel
                    </MaterialButton>
                    <MaterialButton
                        color="error"
                        onClick={deleteAllFiles}
                        startIcon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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