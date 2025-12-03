import { IconType } from 'react-icons';

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
    path?: string;
    icon?: IconType;
    color: string;
}

export interface GoogleButtonProps {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: 'filled' | 'tonal' | 'text' | 'fab' | 'outlined' | 'icon';
    icon?: string | IconType;
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

export interface GitTreeNode {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'folder';
    size?: number;
    children: GitTreeNode[];
    selected: boolean;
    indeterminate: boolean;
    url?: string;
}

export interface GitRepoMetadata {
    owner: string;
    repo: string;
    branch: string;
    baseUrl: string;
    provider: 'github' | 'gitlab';
}

export type OutputStyle = 'standard' | 'hash' | 'minimal' | 'xml' | 'markdown';
export type ViewMode = 'list' | 'tree';
