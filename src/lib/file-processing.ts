import JSZip from 'jszip';
import { calculateTokens } from '@/lib/tokenWorker';
import { FileData } from "@/types";
import { TEXT_FILE_EXTENSIONS } from "@/constants";

interface FileWithPaths extends Blob {
    path?: string;
    webkitRelativePath?: string;
    name?: string;
}

export const processFileObject = async (fileObject: File | Blob, explicitPath: string = ""): Promise<FileData> => {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const name = (fileObject instanceof File) ? fileObject.name : `pasted_${Date.now()}.txt`;

    let fullPath = explicitPath;
    const fileWithPaths = fileObject as FileWithPaths;
    
    if (!fullPath && 'path' in fileObject) fullPath = fileWithPaths.path || "";
    if (!fullPath && fileWithPaths.webkitRelativePath) fullPath = fileWithPaths.webkitRelativePath;
    if (!fullPath) fullPath = name;
    
    // Normalize path: remove leading slash or dot-slash
    // Repeat to handle multiple leading slashes or ././
    while (fullPath.startsWith('/') || fullPath.startsWith('./')) {
        if (fullPath.startsWith('/')) fullPath = fullPath.substring(1);
        if (fullPath.startsWith('./')) fullPath = fullPath.substring(2);
    }

    // If path is empty or just dots after normalization, fallback to name
    if (!fullPath || fullPath === '.' || fullPath === '..') {
        fullPath = name;
    }

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
            // Use async token counting via web worker (non-blocking)
            tokens = await calculateTokens(content);
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
};

export const unzipAndProcess = async (zipFile: File): Promise<FileData[]> => {
    try {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        const processedFiles: FileData[] = [];
        const promises: Promise<void>[] = [];

        content.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            if (relativePath.includes('/.')) return; // Skip hidden files/folders in zip

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
