export const TEXT_FILE_EXTENSIONS = new Set([
    'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
    'less', 'json', 'xml', 'yaml', 'yml', 'py', 'java', 'c', 'cpp', 'cs',
    'go', 'rs', 'php', 'rb', 'pl', 'sh', 'bat', 'h', 'swift', 'kt', 'sql',
    'config', 'ini', 'env', 'gitignore', 'gitkeep', 'htaccess', 'log', 'csv',
    'tsv', 'dart', 'arb', 'vue', 'svelte', 'astro', 'sol', 'toml', 'lua',
    'conf', 'prisma', 'gradle', 'properties', 'lock', 'license', 'glsl', 'vert', 'frag'
]);

export const DB_NAME = 'ContextractorDB';
export const STORE_NAME = 'session';
export const DB_VERSION = 1;

export const OUTPUT_STYLES_CONFIG = [
    {
        id: 'standard',
        label: 'Standard',
        description: 'Classic commented headers, great for general use.',
        preview: '/* --- src/utils.ts --- */\nexport const add = (a, b) => a + b;'
    },
    {
        id: 'hash',
        label: 'Hash Style',
        description: 'Python/Shell friendly headers with hash symbols.',
        preview: '# --- src/utils.py ---\ndef add(a, b):\n    return a + b'
    },
    {
        id: 'minimal',
        label: 'Minimal',
        description: 'Clean separators without comments, just dashes.',
        preview: '--- src/utils.ts ---\nexport const add = (a, b) => a + b;'
    },
    {
        id: 'xml',
        label: 'XML Tags',
        description: 'Structured XML format, ideal for LLM parsing.',
        preview: '<file name="src/utils.ts">\nexport const add = (a, b) => a + b;\n</file>'
    },
    {
        id: 'markdown',
        label: 'Markdown',
        description: 'Code blocks with syntax highlighting support.',
        preview: '### src/utils.ts\n```typescript\nexport const add = (a, b) => a + b;\n```'
    }
] as const;

export const ICONS_PATHS = {
    folder: "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
    folder_open: "M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z",
    default_file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    js: "M3 3h18v18H3V3zm4.5 13.5c0 .83.67 1.5 1.5 1.5h1.5v-6h-1.5v4.5h-1.5v-4.5H6v4.5zm6-1.5h1.5v-1.5h-1.5V12h3v-1.5h-3v6zM16.5 9h-3v6h3V13.5h-1.5v-1.5h1.5V10.5h-1.5V9z",
    html: "M12 2L2.5 5.5v13L12 22l9.5-3.5v-13L12 2zm-1 15.5l-4-1.5v-9l4 1.5v9zm5-1.5l-4 1.5v-9l4-1.5v9z",
    css: "M12 2L2.5 5.5v13L12 22l9.5-3.5v-13L12 2zm0 17.5l-5-2V6.5l5-2v13zm5-2l-5 2V4.5l5 2v11z",
    json: "M4 10h2v4H4zm14 0h2v4h-2zm-6 0h2v4h-2z",
    ts: "M3 3h18v18H3V3zm15 13.5h-1.5v-4.5h-1.5v4.5h-1.5v-6h4.5v1.5zm-7.5 0H9v-6h4.5v1.5h-3v4.5z",
    git: "M19.5 10.5l-7-7c-.8-.8-2.2-.8-3 0l-7 7c-.8.8-.8 2.2 0 3l7 7c.8.8 2.2.8 3 0l7-7c.8-.8.8-2.2 0-3zM12 16.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
    image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
    markdown: "M2 4v16h20V4H2zm16 13H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z",
    lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
    settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.16 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    terminal: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z",
    readme: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    vue: "M1 3h4l7 12 7-12h4L12 22 1 3zm8.67 0L12 7l2.33-4h-4.66z",
    check_circle: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
};

export const UI_ICONS = {
    upload: "M11 16V7.85l-2.6 2.6L7 9l5-5 5 5-1.4 1.45-2.6-2.6V16h-2Zm-5 4q-.825 0-1.413-.587Q4 18.825 4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413Q18.825 20 18 20H6Z",
    delete: "M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    chevron_right: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
    view_list: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
    view_tree: "M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z",
    arrow_up: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    arrow_down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
    github: "M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.24 0-1.16.46-2.11 1.2-2.85a3.8 3.8 0 010-2.94s.95-.26 3.11 1.1a10.2 10.2 0 015.6 0c2.16-1.37 3.11-1.08 3.11-1.08a3.8 3.8 0 01.02 2.92c.74.74 1.2 1.69 1.2 2.85 0 4.06-2.59 4.96-5.05 5.23a1.75 1.75 0 01.5 1.35v2.23c0 .27.2.65.75.55A11 11 0 0012 1.27",
    tune: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
    code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
    expand_more: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
    menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
    // New icons for Git Import Progress
    warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    minimize: "M6 19h12v2H6z",
    network: "M12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11A2.98 2.98 0 0122 15c0 1.65-1.35 3-3 3H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95A5.469 5.469 0 0112 6m0-2C9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96C18.67 6.59 15.64 4 12 4z",
    download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    timer: "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    speed: "M20.38 8.57l-1.23 1.85a8 8 0 01-.22 7.58H5.07A8 8 0 0115.58 6.85l1.85-1.23A10 10 0 003.35 19a2 2 0 001.72 1h13.85a2 2 0 001.74-1 10 10 0 00-.27-10.44z M10.59 15.41a2 2 0 002.83 0l5.66-8.49-8.49 5.66a2 2 0 000 2.83z"
};
