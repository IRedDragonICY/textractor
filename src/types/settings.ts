export interface SecuritySettings {
    enablePreFlightCheck: boolean;
    blockedFilePatterns: string[];
    blockedContentPatterns: string[];
}

export interface FileFilterSettings {
    ignoredFolders: string[];
    ignoredExtensions: string[];
}

export interface AppSettings {
    security: SecuritySettings;
    filters: FileFilterSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
    security: {
        enablePreFlightCheck: true,
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
        ]
    }
};
