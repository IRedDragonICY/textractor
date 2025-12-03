import React from 'react';
import { IconType } from 'react-icons';
import { IconInfo } from "@/types";
import { EXTENSION_ICON_MAP } from "./icon-mapping";
import { SiNodedotjs, SiGit, SiMarkdown } from "react-icons/si";
import { MdLock, MdDescription, MdSettings, MdInsertDriveFile, MdTerminal, MdImage } from "react-icons/md";

interface GoogleIconProps {
    path?: string;
    icon?: IconType;
    className?: string;
    style?: React.CSSProperties;
    color?: string;
}

export const GoogleIcon = ({ path, icon: IconComponent, className = "w-5 h-5", style, color }: GoogleIconProps) => {
    const combinedStyle = color ? { ...style, color } : style;
    
    if (IconComponent) {
        return <IconComponent className={className} style={combinedStyle} />;
    }
    if (path) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor" style={combinedStyle}>
                <path d={path} />
            </svg>
        );
    }
    return null;
};

export const getFileIconInfo = (filename: string): IconInfo => {
    const name = filename.toLowerCase();
    const ext = name.split('.').pop() || '';

    if (name === 'package.json') return { icon: SiNodedotjs, color: '#339933' };
    if (name === 'yarn.lock' || name.endsWith('.lock')) return { icon: MdLock, color: '#E34F26' };
    if (name === 'license' || name === 'license.txt') return { icon: MdDescription, color: '#EAB308' };
    if (name.startsWith('.git') || name === '.gitignore') return { icon: SiGit, color: '#F05032' };
    if (name === 'readme.md') return { icon: SiMarkdown, color: '#A8C7FA' };
    if (name.startsWith('.env') || name.endsWith('.config.js') || name.endsWith('.rc')) return { icon: MdSettings, color: '#9CA3AF' };

    // Check extension map
    if (EXTENSION_ICON_MAP[ext]) {
        // Define colors for some common extensions if needed, or use default
        let color = '#C4C7C5';
        switch (ext) {
            case 'js': case 'jsx': case 'mjs': color = '#F7DF1E'; break;
            case 'ts': case 'tsx': color = '#3178C6'; break;
            case 'html': color = '#E34F26'; break;
            case 'css': case 'scss': case 'sass': case 'less': color = '#264DE4'; break;
            case 'json': color = '#F7DF1E'; break;
            case 'md': case 'txt': color = '#9CA3AF'; break;
            case 'vue': color = '#41B883'; break;
            case 'py': color = '#3776AB'; break;
            case 'java': color = '#007396'; break;
            case 'rs': color = '#DEA584'; break;
            case 'go': color = '#00ADD8'; break;
            case 'php': color = '#777BB4'; break;
            case 'rb': color = '#CC342D'; break;
            case 'c': case 'cpp': case 'h': color = '#00599C'; break;
            case 'cs': color = '#239120'; break;
            case 'swift': color = '#F05138'; break;
            case 'kt': color = '#7F52FF'; break;
            case 'dart': color = '#0175C2'; break;
            case 'sql': color = '#4479A1'; break;
            case 'dockerfile': color = '#2496ED'; break;
        }
        return { icon: EXTENSION_ICON_MAP[ext], color };
    }

    // Fallback for other types
    switch (ext) {
        case 'png': case 'jpg': case 'jpeg': case 'svg': case 'glb': case 'ico': return { icon: MdImage, color: '#C084FC' };
        case 'sh': case 'bat': case 'bash': return { icon: MdTerminal, color: '#4ADE80' };
        default: return { icon: MdInsertDriveFile, color: '#C4C7C5' };
    }
};


