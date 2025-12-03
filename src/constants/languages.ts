export const LANGUAGE_CONFIG: Record<string, { color: string; name: string }> = {
    ts: { color: '#3178C6', name: 'TypeScript' },
    tsx: { color: '#3178C6', name: 'React TSX' },
    js: { color: '#F7DF1E', name: 'JavaScript' },
    jsx: { color: '#61DAFB', name: 'React JSX' },
    py: { color: '#3776AB', name: 'Python' },
    java: { color: '#ED8B00', name: 'Java' },
    go: { color: '#00ADD8', name: 'Go' },
    rs: { color: '#DEA584', name: 'Rust' },
    vue: { color: '#42B883', name: 'Vue' },
    svelte: { color: '#FF3E00', name: 'Svelte' },
    css: { color: '#1572B6', name: 'CSS' },
    scss: { color: '#CC6699', name: 'SCSS' },
    html: { color: '#E34F26', name: 'HTML' },
    json: { color: '#292929', name: 'JSON' },
    md: { color: '#083FA1', name: 'Markdown' },
    php: { color: '#777BB4', name: 'PHP' },
    rb: { color: '#CC342D', name: 'Ruby' },
    swift: { color: '#FA7343', name: 'Swift' },
    kt: { color: '#7F52FF', name: 'Kotlin' },
    c: { color: '#A8B9CC', name: 'C' },
    cpp: { color: '#00599C', name: 'C++' },
    cs: { color: '#239120', name: 'C#' },
    txt: { color: '#8E918F', name: 'Text' },
    // Add more as needed
    xml: { color: '#0060AC', name: 'XML' },
    yaml: { color: '#CB171E', name: 'YAML' },
    sql: { color: '#e38c00', name: 'SQL' },
    sh: { color: '#89e051', name: 'Shell' },
};

export const getLanguageConfig = (extension: string) => {
    return LANGUAGE_CONFIG[extension.toLowerCase()] || LANGUAGE_CONFIG.txt;
};
