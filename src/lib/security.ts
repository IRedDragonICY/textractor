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

export const scanForSecrets = (files: FileData[], settings: SecuritySettings): SecurityIssue[] => {
    if (!settings.enablePreFlightCheck) return [];

    const issues: SecurityIssue[] = [];

    // Compile regex patterns
    const filenameRegexes = settings.blockedFilePatterns.map(p => 
        new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i')
    );
    
    const contentRegexes = settings.blockedContentPatterns.map(p => new RegExp(p, 'g'));

    for (const file of files) {
        // 1. Check Filename
        for (const regex of filenameRegexes) {
            if (regex.test(file.name)) {
                issues.push({
                    fileId: file.id,
                    fileName: file.name,
                    path: file.path,
                    type: 'filename',
                    match: file.name
                });
                break; // Stop checking other filename patterns for this file
            }
        }

        // 2. Check Content (only for text files)
        if (file.isText && file.content) {
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Skip if line is too long (performance)
                if (line.length > 1000) continue;

                for (const regex of contentRegexes) {
                    if (regex.test(line)) {
                        issues.push({
                            fileId: file.id,
                            fileName: file.name,
                            path: file.path,
                            type: 'content',
                            match: regex.source, // Show the pattern that matched
                            line: i + 1
                        });
                        // We found a secret in this file, maybe enough to warn?
                        // Let's continue to find all issues or break?
                        // Let's break inner loop to avoid spamming issues for same line
                        break; 
                    }
                }
                // Limit issues per file to avoid UI explosion
                if (issues.filter(is => is.fileId === file.id).length > 5) break;
            }
        }
    }

    return issues;
};
