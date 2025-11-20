import React from 'react';

export const GoogleIcon = ({ path, className = "w-5 h-5", style }: { path: string; className?: string; style?: React.CSSProperties }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d={path} />
    </svg>
);

