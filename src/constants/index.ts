export const TEXT_FILE_EXTENSIONS = new Set([
    // JavaScript / TypeScript
    'js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx',
    
    // Web
    'html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less', 'styl', 'stylus', 'pcss', 'postcss',
    
    // Data formats
    'json', 'jsonc', 'json5', 'xml', 'xsl', 'xslt', 'yaml', 'yml', 'toml', 'csv', 'tsv',
    
    // Python
    'py', 'pyw', 'pyx', 'pxd', 'pyi',
    
    // Java / JVM
    'java', 'kt', 'kts', 'scala', 'sc', 'groovy', 'gradle', 'clj', 'cljs', 'cljc', 'edn',
    
    // C family
    'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'hxx', 'cs', 'csx',
    
    // Systems programming
    'go', 'mod', 'sum', 'rs', 'zig', 'nim', 'cr',
    
    // Functional languages
    'hs', 'lhs', 'ml', 'mli', 'fs', 'fsx', 'fsi', 'ex', 'exs', 'eex', 'heex', 'erl', 'hrl',
    
    // Scientific
    'r', 'rmd', 'jl', 'm', 'mat', 'f', 'f90', 'f95', 'for',
    
    // Web scripting
    'php', 'phtml', 'rb', 'erb', 'rake', 'gemspec', 'pl', 'pm', 'pod', 't', 'lua',
    
    // Shell
    'sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh', 'bat', 'cmd', 'ps1', 'psm1', 'psd1',
    
    // Mobile
    'swift', 'dart', 'arb',
    
    // Frontend frameworks
    'vue', 'svelte', 'astro',
    
    // Template engines
    'pug', 'jade', 'hbs', 'handlebars', 'mustache', 'ejs', 'njk', 'nunjucks', 'twig', 'liquid',
    
    // Transpiled
    'coffee', 'litcoffee',
    
    // Blockchain
    'sol', 'vy',
    
    // Database
    'sql', 'prisma', 'graphql', 'gql',
    
    // Config
    'config', 'cfg', 'ini', 'env', 'properties', 'prop', 'conf', 'htaccess', 'editorconfig',
    
    // Git
    'gitignore', 'gitattributes', 'gitmodules', 'gitkeep',
    
    // DevOps
    'dockerfile', 'tf', 'tfvars', 'hcl',
    
    // Documentation
    'md', 'mdx', 'markdown', 'rst', 'adoc', 'asciidoc', 'txt', 'log', 'license',
    
    // LaTeX
    'tex', 'latex', 'bib',
    
    // Shaders
    'glsl', 'vert', 'frag', 'hlsl', 'shader',
    
    // Assembly
    'asm', 's', 'nasm',
    
    // Build
    'makefile', 'mk', 'cmake', 'meson', 'ninja',
    
    // Misc
    'lock', 'wasm', 'wat'
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
