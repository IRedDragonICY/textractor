export interface FileData {
    id: string;
    name: string;
    content: string;
    isText: boolean;
    fileObject: File | Blob;
    linesOfCode: number;
    characterCount: number;
    tokenCount: number;
    path: string;
}

export interface TreeNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    children: TreeNode[];
    fileData?: FileData;
}

export interface IconInfo {
    path: string;
    color: string;
}

export interface GoogleButtonProps {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: 'filled' | 'tonal' | 'text' | 'fab' | 'outlined' | 'icon';
    icon?: string;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    active?: boolean;
}

export interface GitHubTreeItem {
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
    url: string;
}

export interface GitHubRepoInfo {
    default_branch: string;
}

export interface GitLabTreeItem {
    id: string;
    name: string;
    type: string;
    path: string;
    mode: string;
}

export type OutputStyle = 'standard' | 'hash' | 'minimal' | 'xml' | 'markdown';
export type ViewMode = 'list' | 'tree';
