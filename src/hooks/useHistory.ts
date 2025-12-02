// History Hook - Undo/Redo functionality
// Professional-grade history management for file operations

import { useState, useCallback, useRef } from 'react';
import { FileData } from '@/types';

interface UseHistoryReturn {
    canUndo: boolean;
    canRedo: boolean;
    undo: () => FileData[] | null;
    redo: () => FileData[] | null;
    recordState: (files: FileData[]) => void;
    clear: () => void;
}

const MAX_HISTORY_SIZE = 50;

export const useHistory = (): UseHistoryReturn => {
    // History stack: past states we can undo to
    const [past, setPast] = useState<FileData[][]>([]);
    // Future stack: states we can redo to
    const [future, setFuture] = useState<FileData[][]>([]);
    // Current state reference for comparison
    const currentStateRef = useRef<FileData[]>([]);
    // Flag to skip recording during undo/redo operations
    const isUndoRedoRef = useRef(false);
    // Debounce timer
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    // Generate signature for comparison
    const getSignature = (files: FileData[]): string => {
        return JSON.stringify(files.map(f => f.id).sort());
    };

    // Record current state before a change
    const recordState = useCallback((newFiles: FileData[]) => {
        // Skip if this is triggered by undo/redo
        if (isUndoRedoRef.current) {
            isUndoRedoRef.current = false;
            currentStateRef.current = newFiles;
            return;
        }

        const currentSignature = getSignature(currentStateRef.current);
        const newSignature = getSignature(newFiles);

        // Skip if no actual change
        if (currentSignature === newSignature) {
            return;
        }

        // Clear any pending debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Capture the previous state before updating
        const previousState = [...currentStateRef.current];

        // Debounce to group rapid changes
        debounceRef.current = setTimeout(() => {
            setPast(prev => {
                // Don't add duplicate states
                const lastState = prev[prev.length - 1];
                const lastSignature = lastState ? getSignature(lastState) : '';
                const prevSignature = getSignature(previousState);
                
                if (lastSignature === prevSignature) {
                    return prev;
                }

                const newPast = [...prev, previousState];
                return newPast.slice(-MAX_HISTORY_SIZE);
            });

            // Clear future on new action (standard undo/redo behavior)
            setFuture([]);
        }, 100);

        // Update current state immediately
        currentStateRef.current = newFiles;
    }, []);

    // Undo - restore previous state
    const undo = useCallback((): FileData[] | null => {
        if (past.length === 0) return null;

        // Set flag to skip recording
        isUndoRedoRef.current = true;

        // Get the last state from past
        const newPast = [...past];
        const previousState = newPast.pop()!;

        // Save current state to future for redo
        const currentState = [...currentStateRef.current];

        setPast(newPast);
        setFuture(prev => [...prev, currentState]);

        // Update current reference
        currentStateRef.current = previousState;

        return previousState;
    }, [past]);

    // Redo - restore next state
    const redo = useCallback((): FileData[] | null => {
        if (future.length === 0) return null;

        // Set flag to skip recording
        isUndoRedoRef.current = true;

        // Get the last state from future
        const newFuture = [...future];
        const nextState = newFuture.pop()!;

        // Save current state to past for undo
        const currentState = [...currentStateRef.current];

        setFuture(newFuture);
        setPast(prev => [...prev, currentState]);

        // Update current reference
        currentStateRef.current = nextState;

        return nextState;
    }, [future]);

    // Clear all history
    const clear = useCallback(() => {
        setPast([]);
        setFuture([]);
        currentStateRef.current = [];
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
    }, []);

    return {
        canUndo,
        canRedo,
        undo,
        redo,
        recordState,
        clear,
    };
};

export default useHistory;
