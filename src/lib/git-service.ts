import { calculateTokens } from '@/lib/tokenWorker';
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

interface HFEntry {
    type: 'file' | 'directory';
    path: string;
    size?: number;
    oid?: string;
    lfs?: { size: number };
}

type HuggingFaceRepoType = 'models' | 'datasets' | 'spaces';

const buildBaseUrlForProvider = (metadata: GitRepoMetadata, branch: string): string => {
    if (metadata.provider === 'huggingface') {
        const resource = metadata.resource || 'models';
        const prefix = resource === 'models' ? '' : `${resource}/`;
        return `https://huggingface.co/${prefix}${metadata.owner}/${metadata.repo}/resolve/${branch}`;
    }

    // Default: GitHub-style raw URL
    return `https://raw.githubusercontent.com/${metadata.owner}/${metadata.repo}/${branch}`;
};

const getHuggingFacePathInfo = (pathParts: string[]): { resource: HuggingFaceRepoType; ownerIndex: number } => {
    if (pathParts[0] === 'datasets') return { resource: 'datasets', ownerIndex: 1 };
    if (pathParts[0] === 'spaces') return { resource: 'spaces', ownerIndex: 1 };
    return { resource: 'models', ownerIndex: 0 };
};

const getHuggingFaceApiBase = (resource: HuggingFaceRepoType, owner: string, repo: string) =>
    `https://huggingface.co/api/${resource}/${owner}/${repo}`;

const normalizeHuggingFaceRefName = (ref?: string): string => {
    if (!ref) return '';
    return ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
};

const fetchHuggingFaceRefs = async (
    resource: HuggingFaceRepoType,
    owner: string,
    repo: string
): Promise<{ branches: string[]; tags: string[] }> => {
    try {
        const res = await fetch(`${getHuggingFaceApiBase(resource, owner, repo)}/refs`);
        if (!res.ok) return { branches: [], tags: [] };
        const data = await res.json();
        const branches = Array.isArray(data?.branches)
            ? data.branches.map((b: any) => normalizeHuggingFaceRefName(b?.name ?? b?.ref ?? b)).filter(Boolean)
            : [];
        const tags = Array.isArray(data?.tags)
            ? data.tags.map((t: any) => normalizeHuggingFaceRefName(t?.name ?? t?.ref ?? t)).filter(Boolean)
            : [];
        return { branches, tags };
    } catch {
        return { branches: [], tags: [] };
    }
};

const detectHuggingFaceDefaultBranch = async (
    resource: HuggingFaceRepoType,
    owner: string,
    repo: string
): Promise<string> => {
    const { branches } = await fetchHuggingFaceRefs(resource, owner, repo);
    if (branches.length === 0) return '';
    return branches.find(b => b === 'main') || branches.find(b => b === 'master') || branches[0];
};

const MAX_HF_ITEMS = 50000;

const fetchHuggingFaceTreeRecursive = async (
    metadata: GitRepoMetadata,
    setLoadingText: (text: string) => void
): Promise<GitHubTreeItem[]> => {
    const resource = metadata.resource || 'models';
    const apiBase = `https://huggingface.co/api/${resource === 'models' ? 'models' : resource}/${metadata.owner}/${metadata.repo}`;

    // BFS queue of relative paths ('' = repo root)
    const queue: string[] = [metadata.initialPath || ''];
    const items: GitHubTreeItem[] = [];
    const visited = new Set<string>();

    const normalizeFullPath = (parent: string, child: string): string => {
        const cleanChild = child.replace(/^\/+/, '');
        if (!parent) return cleanChild;
        // If HF already returned parent-prefixed path, keep as-is; otherwise join
        return cleanChild.startsWith(`${parent}/`) ? cleanChild : `${parent}/${cleanChild}`;
    };

    while (queue.length > 0) {
        const currentPath = queue.shift()!;
        if (visited.has(currentPath)) continue;
        visited.add(currentPath);

        const pathSuffix = currentPath
            ? `/${currentPath.split('/').map(encodeURIComponent).join('/')}`
            : '';
        const treeApiUrl = `${apiBase}/tree/${encodeURIComponent(metadata.branch)}${pathSuffix}`;

        setLoadingText(`Scanning ${currentPath || 'root'} (${items.length} files)...`);

        let entries: HFEntry[];
        try {
            const res = await fetch(treeApiUrl);
            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error("Access denied. The repository may be private or gated.");
                }
                // skip missing/forbidden folders so other branches continue
                if (res.status === 403 || res.status === 404) {
                    console.warn(`Skipping ${currentPath}: ${res.status} ${res.statusText}`);
                    continue;
                }
                const errorMessage = await res.text().catch(() => '');
                throw new Error(errorMessage || "Failed to fetch repository structure");
            }
            entries = await res.json() as HFEntry[];
        } catch (error) {
            console.error(`Error scanning ${currentPath}:`, error);
            continue;
        }

        if (!Array.isArray(entries)) continue;

        for (const entry of entries) {
            if (!entry?.path || typeof entry.path !== 'string') continue;

            const fullPath = normalizeFullPath(currentPath, entry.path);
            const isDirectory = entry.type === 'directory';
            const size = typeof entry.size === 'number' ? entry.size : entry.lfs?.size;

            items.push({
                path: fullPath,
                mode: '100644',
                type: isDirectory ? 'tree' : 'blob',
                sha: entry.oid || '',
                size,
                url: ''
            } as GitHubTreeItem);

            if (isDirectory) {
                queue.push(fullPath);
            }

            if (items.length >= MAX_HF_ITEMS) {
                setLoadingText(`Limit reached (${MAX_HF_ITEMS} items). Stopping scan.`);
                break;
            }
        }

        if (items.length >= MAX_HF_ITEMS) break;
    }

    if (items.length === 0) {
        throw new Error("Repository appears empty or access may be restricted.");
    }

    return items;
};

// Cache for parsed metadata to avoid redundant parsing
const metadataCache = new Map<string, GitRepoMetadata>();

// Parse git URL and extract metadata with caching
export const parseGitUrl = async (gitUrl: string): Promise<GitRepoMetadata> => {
    // Check cache first
    if (metadataCache.has(gitUrl)) {
        return metadataCache.get(gitUrl)!;
    }

    const rawUrl = gitUrl.replace(/\.git\/?$/, "");
    let urlObj: URL;

    try {
        urlObj = new URL(rawUrl);
    } catch {
        throw new Error("Invalid URL format");
    }

    const hostname = urlObj.hostname.toLowerCase();
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (hostname.includes('github.com')) {
        const owner = pathParts[0];
        const repo = pathParts[1];
        if (!owner || !repo) throw new Error("Invalid GitHub repository URL");
        let branch = "";
        let initialPath = "";

        if (pathParts[2] === 'tree' || pathParts[2] === 'blob') {
            branch = pathParts[3];
            if (pathParts.length > 4) {
                initialPath = pathParts.slice(4).join('/');
            }
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
            baseUrl: '',
            provider: 'github',
            initialPath
        };
        metadata.baseUrl = buildBaseUrlForProvider(metadata, branch);

        // Cache the result
        metadataCache.set(gitUrl, metadata);
        return metadata;
    }

    if (hostname.includes('huggingface.co')) {
        const trimmedParts = pathParts[0] === 'api' ? pathParts.slice(1) : pathParts;
        const pathString = trimmedParts.join('/');

        const hfMatch = /^(?:(datasets|spaces)\/)?([^/]+)\/([^/]+)(?:\/(tree|blob|resolve)\/([^/]+)(?:\/(.+))?)?$/.exec(pathString);
        if (!hfMatch) {
            throw new Error("Invalid Hugging Face repository URL");
        }

        const [, resourceRaw, owner, repo, action, revisionFromPath, remainingPath] = hfMatch;
        const resource: HuggingFaceRepoType =
            (resourceRaw as HuggingFaceRepoType)
            || (trimmedParts[0] === 'datasets' ? 'datasets'
                : trimmedParts[0] === 'spaces' ? 'spaces' : 'models');

        let branch = urlObj.searchParams.get('revision') || revisionFromPath || '';
        let initialPath = '';

        if (action && remainingPath) {
            initialPath = remainingPath;
        }

        if (!branch) {
            branch = await detectHuggingFaceDefaultBranch(resource, owner, repo) || 'main';
        }

        const metadata: GitRepoMetadata = {
            owner,
            repo,
            branch,
            provider: 'huggingface',
            resource,
            baseUrl: '',
            initialPath
        };
        metadata.baseUrl = buildBaseUrlForProvider(metadata, branch);

        // Cache the result
        metadataCache.set(gitUrl, metadata);
        return metadata;
    }

    throw new Error("Unsupported Git provider. Supported providers: GitHub and Hugging Face.");
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
    }
    metadata.baseUrl = buildBaseUrlForProvider(metadata, metadata.branch);

    if (metadata.provider === 'huggingface') {
        const normalizedItems = await fetchHuggingFaceTreeRecursive(metadata, setLoadingText);
        setLoadingText("Building file tree...");
        const tree = buildGitTree(normalizedItems, metadata);
        return { tree, metadata };
    }

    // Default to GitHub-style API
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
export const fetchGitRefs = async (metadata: GitRepoMetadata): Promise<{ branches: string[], tags: string[] }> => {
    // Hugging Face refs
    if (metadata.provider === 'huggingface') {
        const resource = metadata.resource || 'models';
        const refs = await fetchHuggingFaceRefs(resource, metadata.owner, metadata.repo);
        const branches = Array.from(new Set([...(refs.branches ?? []), metadata.branch].filter(Boolean)));
        return { branches, tags: refs.tags ?? [] };
    }

    // Default: GitHub
    try {
        const [branchesRes, tagsRes] = await Promise.all([
            fetch(`https://api.github.com/repos/${metadata.owner}/${metadata.repo}/branches`),
            fetch(`https://api.github.com/repos/${metadata.owner}/${metadata.repo}/tags`)
        ]);

        const branches = branchesRes.ok ? await branchesRes.json() : [];
        const tags = tagsRes.ok ? await tagsRes.json() : [];

        const branchList = branchesRes.ok && Array.isArray(branches)
            ? branches.map((b: GitHubRef) => b.name)
            : [];
        const tagList = tagsRes.ok && Array.isArray(tags)
            ? tags.map((t: GitHubRef) => t.name)
            : [];

        return { branches: branchList, tags: tagList };
    } catch (error) {
        console.error("Failed to fetch refs:", error);
        return { branches: [], tags: [] };
    }
};

// Fetch commits for a specific branch/tag
export const fetchGitCommits = async (metadata: GitRepoMetadata, ref: string): Promise<{ sha: string, message: string, date: string, author: string }[]> => {
    if (metadata.provider === 'huggingface') {
        // Commit listing not exposed via public Hugging Face API; skip gracefully
        return [];
    }

    try {
        const res = await fetch(`https://api.github.com/repos/${metadata.owner}/${metadata.repo}/commits?sha=${ref}&per_page=20`);
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
                // Use async token counting via web worker (non-blocking)
                const tokenCount = await calculateTokens(text);
                return {
                    id: fileId,
                    name: f.name,
                    content: text,
                    isText: true,
                    fileObject: new Blob([text], { type: 'text/plain' }),
                    linesOfCode: text.split('\n').length,
                    characterCount: text.length,
                    tokenCount,
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

