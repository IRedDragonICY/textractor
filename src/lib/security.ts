import { FileData } from '@/types';
import { SecuritySettings } from '@/types/settings';

export interface SecurityIssue {
    fileId: string;
    fileName: string;
    path: string;
    type: 'filename' | 'content';
    match: string;
    line?: number;
}

const MAX_LINE_LENGTH = 500;
const MAX_ISSUES_PER_FILE = 5;
const MIN_ENTROPY_LENGTH = 16;
const MAX_WHITESPACE_RATIO = 0.5;

export const calculateShannonEntropy = (str: string): number => {
    if (!str) return 0;

    const frequencies = new Map<string, number>();
    for (const char of str) {
        frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
    }

    return Array.from(frequencies.values()).reduce((sum, count) => {
        const p = count / str.length;
        return sum - p * Math.log2(p);
    }, 0);
};

const isLikelyDataImage = (line: string): boolean =>
    line.trimStart().startsWith('data:image');

const isWhitespaceHeavy = (line: string): boolean => {
    if (!line) return false;
    const whitespaceCount = (line.match(/\s/g) ?? []).length;
    return whitespaceCount / line.length > MAX_WHITESPACE_RATIO;
};

export const scanForSecrets = (files: FileData[], settings: SecuritySettings): SecurityIssue[] => {
    if (!settings.enablePreFlightCheck) return [];

    const issues: SecurityIssue[] = [];

    // Compile regex patterns
    const filenameRegexes = settings.blockedFilePatterns.map(p =>
        new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i')
    );

    const contentRegexes = settings.blockedContentPatterns.map(p => new RegExp(p, 'g'));
    const entropyEnabled = settings.enableEntropyScanning;
    const entropyThreshold = settings.entropyThreshold ?? 4.5;

    for (const file of files) {
        let issuesForFile = 0;

        // 1. Check Filename
        for (const regex of filenameRegexes) {
            regex.lastIndex = 0;
            if (regex.test(file.name)) {
                issues.push({
                    fileId: file.id,
                    fileName: file.name,
                    path: file.path,
                    type: 'filename',
                    match: file.name,
                });
                issuesForFile++;
                break; // Stop checking other filename patterns for this file
            }
        }

        if (!file.isText || !file.content) continue;

        // 2. Check Content (only for text files)
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (issuesForFile >= MAX_ISSUES_PER_FILE) break;

            const line = lines[i];
            // Skip if line is too long (performance)
            if (line.length > MAX_LINE_LENGTH) continue;

            for (const regex of contentRegexes) {
                regex.lastIndex = 0;
                if (regex.test(line)) {
                    issues.push({
                        fileId: file.id,
                        fileName: file.name,
                        path: file.path,
                        type: 'content',
                        match: regex.source, // Show the pattern that matched
                        line: i + 1,
                    });
                    issuesForFile++;
                    break; // avoid spamming issues for same line
                }
            }

            if (issuesForFile >= MAX_ISSUES_PER_FILE || !entropyEnabled) {
                continue;
            }

            // Entropy-based scanning for secrets that don't match regexes
            if (isLikelyDataImage(line) || isWhitespaceHeavy(line)) {
                continue;
            }

            const tokens = line.split(/\s+/).filter(Boolean);
            for (const token of tokens) {
                if (token.length <= MIN_ENTROPY_LENGTH) continue;

                const entropy = calculateShannonEntropy(token);
                if (entropy >= entropyThreshold) {
                    const match = token.length > 64 ? `${token.slice(0, 64)}...` : token;
                    issues.push({
                        fileId: file.id,
                        fileName: file.name,
                        path: file.path,
                        type: 'content',
                        match: `Potential high-entropy secret: ${match}`,
                        line: i + 1,
                    });
                    issuesForFile++;
                    break;
                }
            }
        }
    }

    return issues;
};
