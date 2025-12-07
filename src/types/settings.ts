export interface SecuritySettings {
    enablePreFlightCheck: boolean;
    enableEntropyScanning: boolean;
    entropyThreshold: number;
    blockedFilePatterns: string[];
    blockedContentPatterns: string[];
}

export interface FileFilterSettings {
    ignoredFolders: string[];
    ignoredExtensions: string[];
    sourceCodeExtensions: string[];
}

export interface AppSettings {
    security: SecuritySettings;
    filters: FileFilterSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
    security: {
        enablePreFlightCheck: true,
        enableEntropyScanning: true,
        entropyThreshold: 4.5,
        blockedFilePatterns: [
            '.env', '.env.*', '*.pem', '*.key', 'id_rsa', 'id_dsa', 
            'credentials.json', 'secrets.yaml', '*.p12', '*.pfx'
        ],
        blockedContentPatterns: [
            'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
            'sk-proj-', 'ghp_', 'xoxb-', 'xoxp-',
            '-----BEGIN RSA PRIVATE KEY-----',
            '-----BEGIN OPENSSH PRIVATE KEY-----'
        ]
    },
    filters: {
        ignoredFolders: [
            'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 
            '.idea', '.vscode', '__pycache__', 'venv', 'bin', 'obj'
        ],
        ignoredExtensions: [
            'lock', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'pdf', 
            'zip', 'tar', 'gz', '7z', 'rar', 'exe', 'dll', 'so', 'dylib', 
            'class', 'jar', 'war', 'ear', 'sqlite', 'db'
        ],
        sourceCodeExtensions: [
            // JavaScript / TypeScript
            'js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx',
            // Web
            'html', 'htm', 'css', 'scss', 'sass', 'less',
            // Data
            'json', 'xml', 'yaml', 'yml', 'toml',
            // Python
            'py', 'pyi',
            // Java / JVM
            'java', 'kt', 'kts', 'scala', 'groovy', 'clj',
            // C family
            'c', 'h', 'cpp', 'cc', 'hpp', 'cs',
            // Systems
            'go', 'rs', 'zig', 'nim',
            // Functional
            'hs', 'ml', 'fs', 'ex', 'exs', 'erl',
            // Scientific
            'r', 'jl',
            // Web scripting
            'php', 'rb', 'pl', 'lua',
            // Shell
            'sh', 'bash', 'bat', 'ps1',
            // Mobile
            'swift', 'dart',
            // Frontend
            'vue', 'svelte', 'astro',
            // Database
            'sql', 'prisma', 'graphql',
            // Others
            'sol', 'coffee', 'pug', 'hbs', 'ejs'
        ]
    }
};
