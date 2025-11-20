import { encode } from 'gpt-tokenizer';
import { FileData, GitHubRepoInfo, GitHubTreeItem } from "@/types";

export const fetchGitFiles = async (
    gitUrl: string, 
    setLoadingText: (text: string) => void
): Promise<FileData[]> => {
    const rawUrl = gitUrl.replace(/\.git\/?$/, "");
    let filesToFetch: { name: string; url: string; path: string }[] = [];
    let owner = "", repo = "", branch = "";

    if (rawUrl.includes('github.com')) {
        const urlObj = new URL(rawUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        owner = pathParts[0];
        repo = pathParts[1];
        let subPath = "";

        if (pathParts[2] === 'tree' || pathParts[2] === 'blob') {
            branch = pathParts[3];
            subPath = pathParts.slice(4).join('/');
        }

        if (!branch) {
            const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
            if (!repoInfoRes.ok) throw new Error("Repository not found");
            const repoInfo: GitHubRepoInfo = await repoInfoRes.json();
            branch = repoInfo.default_branch;
        }

        setLoadingText("Scanning file tree...");
        const treeApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        const treeRes = await fetch(treeApiUrl);
        if (!treeRes.ok) throw new Error("Failed to fetch file tree");

        const treeData = await treeRes.json();
        if (treeData.truncated) alert("Repo is too large, some files may be missing.");

        filesToFetch = (treeData.tree as GitHubTreeItem[])
            .filter(item => item.type === 'blob')
            .filter(item => {
                if (subPath && !item.path.startsWith(subPath)) return false;
                return true;
            })
            .map(item => ({
                name: item.path.split('/').pop() || item.path,
                path: item.path,
                url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`
            }));
    }

    if (filesToFetch.length === 0) throw new Error("No files found.");

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
        setLoadingText(`Fetching... ${Math.min(i + BATCH_SIZE, filesToFetch.length)}/${filesToFetch.length}`);
    }
    
    return newFiles;
};

