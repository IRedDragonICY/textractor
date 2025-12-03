import { encode } from 'gpt-tokenizer';
import { FileData, GitHubRepoInfo, GitHubTreeItem, GitTreeNode, GitRepoMetadata } from "@/types";

interface GitHubRef {
    name: string;
}

interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
}

// Cache for parsed metadata to avoid redundant parsing
const metadataCache = new Map<string, GitRepoMetadata>();

// Parse git URL and extract metadata with caching
export const parseGitUrl = async (gitUrl: string): Promise<GitRepoMetadata> => {
    // Check cache first
    if (metadataCache.has(gitUrl)) {
        return metadataCache.get(gitUrl)!;
    }

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

        const metadata: GitRepoMetadata = {
            owner,
            repo,
            branch,
            baseUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`,
            provider: 'github'
        };

        // Cache the result
        metadataCache.set(gitUrl, metadata);
        return metadata;
    }

    throw new Error("Unsupported Git provider. Currently only GitHub is supported.");
};

// Build tree structure from flat file list - Optimized with Map-based lookup
const buildGitTree = (items: GitHubTreeItem[], metadata: GitRepoMetadata): GitTreeNode[] => {
    const root: GitTreeNode[] = [];
    const pathMap = new Map<string, GitTreeNode>();

    // Pre-sort items: folders first, then by depth, then alphabetically
    // This ensures parent folders exist before their children
    const sortedItems = [...items].sort((a, b) => {
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
        return a.path.localeCompare(b.path);
    });

    // Single pass to build tree
    for (const item of sortedItems) {
        const parts = item.path.split('/');
        const name = parts[parts.length - 1];
        const isFolder = item.type === 'tree';

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

    // Recursive sort function - optimized with in-place sorting
    const sortNodes = (nodes: GitTreeNode[]): void => {
        nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        for (const node of nodes) {
            if (node.children.length > 0) {
                sortNodes(node.children);
            }
        }
    };

    sortNodes(root);
    return root;
};

// Fetch repository tree structure
export const fetchGitTree = async (
    gitUrl: string,
    setLoadingText: (text: string) => void,
    ref?: string // Optional branch/tag/commit hash
): Promise<{ tree: GitTreeNode[]; metadata: GitRepoMetadata }> => {
    setLoadingText("Parsing repository URL...");
    const metadata = await parseGitUrl(gitUrl);
    
    // Override branch if ref is provided
    if (ref) {
        metadata.branch = ref;
        metadata.baseUrl = `https://raw.githubusercontent.com/${metadata.owner}/${metadata.repo}/${ref}`;
    }

    setLoadingText(`Scanning repository structure (${metadata.branch})...`);
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

// Fetch branches and tags for a repository
export const fetchGitRefs = async (owner: string, repo: string): Promise<{ branches: string[], tags: string[] }> => {
    try {
        const [branchesRes, tagsRes] = await Promise.all([
            fetch(`https://api.github.com/repos/${owner}/${repo}/branches`),
            fetch(`https://api.github.com/repos/${owner}/${repo}/tags`)
        ]);

        const branches = branchesRes.ok ? await branchesRes.json() : [];
        const tags = tagsRes.ok ? await tagsRes.json() : [];

        return {
            branches: Array.isArray(branches) ? branches.map((b: GitHubRef) => b.name) : [],
            tags: Array.isArray(tags) ? tags.map((t: GitHubRef) => t.name) : []
        };
    } catch (error) {
        console.error("Failed to fetch refs:", error);
        return { branches: [], tags: [] };
    }
};

// Fetch commits for a specific branch/tag
export const fetchGitCommits = async (owner: string, repo: string, ref: string): Promise<{ sha: string, message: string, date: string, author: string }[]> => {
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${ref}&per_page=20`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.map((item: GitHubCommit) => ({
            sha: item.sha,
            message: item.commit.message.split('\n')[0],
            date: item.commit.author.date,
            author: item.commit.author.name
        })) : [];
    } catch (error) {
        console.error("Failed to fetch commits:", error);
        return [];
    }
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

// Count selected files - Optimized with iterative approach
export const countSelectedFiles = (nodes: GitTreeNode[]): number => {
    let count = 0;
    const stack = [...nodes];

    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.type === 'file' && node.selected) {
            count++;
        }
        // Add children to stack for processing
        if (node.children.length > 0) {
            stack.push(...node.children);
        }
    }

    return count;
};

// Fetch selected files content - Now delegated to git-import-worker for background processing
// This function is kept for backward compatibility
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
    
    // Use optimized concurrent fetching with higher batch size
    const BATCH_SIZE = 15; // Increased from 10
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

