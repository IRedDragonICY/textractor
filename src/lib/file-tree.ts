import { FileData, TreeNode } from "@/types";

export const buildFileTree = (files: FileData[]): TreeNode[] => {
    const root: TreeNode[] = [];

    files.forEach(file => {
        let cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
        if (cleanPath.startsWith('./')) cleanPath = cleanPath.slice(2);
        
        // Filter out empty parts and dot segments (.)
        const parts = cleanPath.split('/').filter(p => p && p !== '.');
        
        let currentLevel = root;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            const existingNode = currentLevel.find(n => n.name === part && n.type === (isFile ? 'file' : 'folder'));

            if (existingNode) {
                if (!isFile) {
                    currentLevel = existingNode.children;
                }
            } else {
                const newNode: TreeNode = {
                    id: isFile ? file.id : `folder-${parts.slice(0, index + 1).join('-')}`,
                    name: part,
                    type: isFile ? 'file' : 'folder',
                    path: parts.slice(0, index + 1).join('/'),
                    children: [],
                    fileData: isFile ? file : undefined
                };
                currentLevel.push(newNode);
                if (!isFile) {
                    currentLevel = newNode.children;
                }
            }
        });
    });

    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });
        nodes.forEach(node => {
            if (node.children.length > 0) sortNodes(node.children);
        });
    };

    sortNodes(root);
    return root;
};

export const generateAsciiTree = (nodes: TreeNode[], prefix = ''): string => {
    return nodes.map((node, index) => {
        const isLast = index === nodes.length - 1;
        const marker = isLast ? '└── ' : '├── ';
        const childPrefix = prefix + (isLast ? '    ' : '│   ');

        let result = `${prefix}${marker}${node.name}\n`;
        if (node.children && node.children.length > 0) {
            result += generateAsciiTree(node.children, childPrefix);
        }
        return result;
    }).join('');
};