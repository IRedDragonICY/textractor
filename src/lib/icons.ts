import { ICONS_PATHS } from "@/constants";
import { IconInfo } from "@/types";

export const getFileIconInfo = (filename: string): IconInfo => {
    const name = filename.toLowerCase();
    const ext = name.split('.').pop();

    if (name === 'package.json' || name === 'yarn.lock' || name.endsWith('.lock')) return { path: ICONS_PATHS.lock, color: '#E34F26' };
    if (name === 'license' || name === 'license.txt') return { path: ICONS_PATHS.default_file, color: '#EAB308' };
    if (name.startsWith('.git') || name === '.gitignore') return { path: ICONS_PATHS.git, color: '#F05032' };
    if (name === 'readme.md') return { path: ICONS_PATHS.readme, color: '#A8C7FA' };
    if (name.startsWith('.env') || name.endsWith('.config.js') || name.endsWith('.rc')) return { path: ICONS_PATHS.settings, color: '#9CA3AF' };

    switch (ext) {
        case 'js': case 'jsx': case 'mjs': return { path: ICONS_PATHS.js, color: '#F7DF1E' };
        case 'ts': case 'tsx': return { path: ICONS_PATHS.ts, color: '#3178C6' };
        case 'html': return { path: ICONS_PATHS.html, color: '#E34F26' };
        case 'css': case 'scss': case 'sass': case 'less': return { path: ICONS_PATHS.css, color: '#264DE4' };
        case 'json': return { path: ICONS_PATHS.json, color: '#F7DF1E' };
        case 'md': case 'txt': return { path: ICONS_PATHS.markdown, color: '#9CA3AF' };
        case 'png': case 'jpg': case 'jpeg': case 'svg': case 'glb': case 'ico': return { path: ICONS_PATHS.image, color: '#C084FC' };
        case 'vue': return { path: ICONS_PATHS.vue, color: '#41B883' };
        case 'sh': case 'bat': case 'bash': return { path: ICONS_PATHS.terminal, color: '#4ADE80' };
        default: return { path: ICONS_PATHS.default_file, color: '#C4C7C5' };
    }
};

