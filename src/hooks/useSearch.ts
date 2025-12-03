import { useState, useEffect, useCallback, RefObject } from 'react';

// Legacy hook for string-based search (kept for backward compatibility)
export const useSearch = (
    textToSearch: string,
    textAreaRef: RefObject<HTMLTextAreaElement | null>
) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMatches, setSearchMatches] = useState<number[]>([]);
    const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

    useEffect(() => {
        if (!searchTerm) {
            setSearchMatches([]);
            setCurrentMatchIdx(0);
            return;
        }
        const matches: number[] = [];
        let startIndex = 0;
        const lowerText = textToSearch.toLowerCase();
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
    }, [searchTerm, textToSearch, textAreaRef]);

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

    return {
        searchTerm,
        setSearchTerm,
        searchMatches,
        currentMatchIdx,
        handleNextMatch,
        handlePrevMatch
    };
};

// New hook for lines-based search (avoids main thread string operations)
export const useSearchLines = (lines: string[]) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMatches, setSearchMatches] = useState<number[]>([]); // Line indices
    const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

    useEffect(() => {
        if (!searchTerm || lines.length === 0) {
            setSearchMatches([]);
            setCurrentMatchIdx(0);
            return;
        }
        
        const lowerTerm = searchTerm.toLowerCase();
        const matches: number[] = [];
        
        // Find all line indices that contain the search term
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(lowerTerm)) {
                matches.push(i);
            }
        }
        
        setSearchMatches(matches);
        setCurrentMatchIdx(0);
    }, [searchTerm, lines]);

    const handleNextMatch = useCallback(() => {
        if (searchMatches.length === 0) return;
        setCurrentMatchIdx(prev => (prev + 1) % searchMatches.length);
    }, [searchMatches.length]);

    const handlePrevMatch = useCallback(() => {
        if (searchMatches.length === 0) return;
        setCurrentMatchIdx(prev => (prev - 1 + searchMatches.length) % searchMatches.length);
    }, [searchMatches.length]);

    return {
        searchTerm,
        setSearchTerm,
        searchMatches,
        currentMatchIdx,
        handleNextMatch,
        handlePrevMatch
    };
};

