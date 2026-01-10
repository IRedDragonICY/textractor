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
    icon?: IconType;
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
    downloadUrl?: string;
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
    provider: 'github' | 'gitlab' | 'huggingface';
    /**
     * Optional namespace for providers that differentiate resources
     * (e.g., Hugging Face: models, datasets, spaces)
     */
    resource?: 'models' | 'datasets' | 'spaces';
    /** Optional initial path when the URL points to a subfolder */
    initialPath?: string;
}

export type OutputStyle = 'standard' | 'hash' | 'minimal' | 'xml' | 'markdown';
export type ViewMode = 'list' | 'tree';
export type CodeProcessingMode =
    | 'raw'
    | 'remove-comments'
    | 'minify'
    | 'signatures-only'
    | 'interfaces-only';

export type { PromptTemplate } from '@/constants';
