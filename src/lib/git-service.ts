import { encode } from 'gpt-tokenizer';
import { FileData, GitHubRepoInfo, GitHubTreeItem, GitTreeNode, GitRepoMetadata } from "@/types";

// Parse git URL and extract metadata
export const parseGitUrl = async (gitUrl: string): Promise<GitRepoMetadata> => {
    const rawUrl = gitUrl.replace(/\.git\/?$/, "");
    
    if (rawUrl.includes('github.com')) {
        const urlObj = new URL(rawUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const owner = pathParts[0];
        const repo = pathParts[1];
        let branch = "";

        if (pathParts[2] === 'tree' || pathParts[2] === 'blob') {
            branch = pathParts[3];
        }

        if (!branch) {
            const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
            if (!repoInfoRes.ok) throw new Error("Repository not found");
            const repoInfo: GitHubRepoInfo = await repoInfoRes.json();
            branch = repoInfo.default_branch;
        }

        return {
            owner,
            repo,
            branch,
            baseUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`,
            provider: 'github'
        };
    }

    throw new Error("Unsupported Git provider. Currently only GitHub is supported.");
};

// Build tree structure from flat file list
const buildGitTree = (items: GitHubTreeItem[], metadata: GitRepoMetadata): GitTreeNode[] => {
    const root: GitTreeNode[] = [];
    const pathMap = new Map<string, GitTreeNode>();

    // Sort items to process folders before files
    const sortedItems = [...items].sort((a, b) => {
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
        return a.path.localeCompare(b.path);
    });

    for (const item of sortedItems) {
        const parts = item.path.split('/');
        const name = parts[parts.length - 1];
        const isFolder = item.type === 'tree';

        // Use path as ID since it's always unique (sha can be duplicate for identical content files)
        const node: GitTreeNode = {
            id: item.path,
            name,
            path: item.path,
            type: isFolder ? 'folder' : 'file',
            size: item.size,
            children: [],
            selected: false,
            indeterminate: false,
            url: isFolder ? undefined : `${metadata.baseUrl}/${item.path}`
        };

        if (parts.length === 1) {
            root.push(node);
        } else {
            const parentPath = parts.slice(0, -1).join('/');
            const parent = pathMap.get(parentPath);
            if (parent) {
                parent.children.push(node);
            }
        }

        pathMap.set(item.path, node);
    }

    // Sort: folders first, then files, alphabetically
    const sortNodes = (nodes: GitTreeNode[]): GitTreeNode[] => {
        return nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        }).map(node => ({
            ...node,
            children: sortNodes(node.children)
        }));
    };

    return sortNodes(root);
};

// Fetch repository tree structure
export const fetchGitTree = async (
    gitUrl: string,
    setLoadingText: (text: string) => void
): Promise<{ tree: GitTreeNode[]; metadata: GitRepoMetadata }> => {
    setLoadingText("Parsing repository URL...");
    const metadata = await parseGitUrl(gitUrl);

    setLoadingText("Scanning repository structure...");
    const treeApiUrl = `https://api.github.com/repos/${metadata.owner}/${metadata.repo}/git/trees/${metadata.branch}?recursive=1`;
    const treeRes = await fetch(treeApiUrl);
    
    if (!treeRes.ok) {
        const errorData = await treeRes.json().catch(() => ({}));
        if (treeRes.status === 403) {
            throw new Error("Rate limit exceeded. Please try again later or use a smaller repository.");
        }
        throw new Error(errorData.message || "Failed to fetch repository structure");
    }

    const treeData = await treeRes.json();
    if (treeData.truncated) {
        console.warn("Repository is large, some files may be missing.");
    }

    setLoadingText("Building file tree...");
    const tree = buildGitTree(treeData.tree as GitHubTreeItem[], metadata);

    return { tree, metadata };
};

// Get all selected file paths from tree
export const getSelectedPaths = (nodes: GitTreeNode[]): string[] => {
    const paths: string[] = [];

    const traverse = (node: GitTreeNode) => {
        if (node.type === 'file' && node.selected) {
            paths.push(node.path);
        }
        node.children.forEach(traverse);
    };

    nodes.forEach(traverse);
    return paths;
};

// Count selected files
export const countSelectedFiles = (nodes: GitTreeNode[]): number => {
    let count = 0;

    const traverse = (node: GitTreeNode) => {
        if (node.type === 'file' && node.selected) {
            count++;
        }
        node.children.forEach(traverse);
    };

    nodes.forEach(traverse);
    return count;
};

// Fetch selected files content
export const fetchSelectedFiles = async (
    nodes: GitTreeNode[],
    metadata: GitRepoMetadata,
    setLoadingText: (text: string) => void,
    onProgress?: (current: number, total: number) => void
): Promise<FileData[]> => {
    const selectedPaths = getSelectedPaths(nodes);
    
    if (selectedPaths.length === 0) {
        throw new Error("No files selected");
    }

    const filesToFetch = selectedPaths.map(path => ({
        name: path.split('/').pop() || path,
        path,
        url: `${metadata.baseUrl}/${path}`
    }));

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
        
        const progress = Math.min(i + BATCH_SIZE, filesToFetch.length);
        setLoadingText(`Fetching... ${progress}/${filesToFetch.length}`);
        onProgress?.(progress, filesToFetch.length);
    }

    return newFiles;
};

// Legacy function for backward compatibility
export const fetchGitFiles = async (
    gitUrl: string, 
    setLoadingText: (text: string) => void
): Promise<FileData[]> => {
    const { tree, metadata } = await fetchGitTree(gitUrl, setLoadingText);
    
    // Select all files by default
    const selectAll = (nodes: GitTreeNode[]): GitTreeNode[] => {
        return nodes.map(node => ({
            ...node,
            selected: true,
            children: selectAll(node.children)
        }));
    };
    
    const selectedTree = selectAll(tree);
    return fetchSelectedFiles(selectedTree, metadata, setLoadingText);
};

