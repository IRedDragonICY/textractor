// Prompt templates with runtime file loading
// Full prompts stored in public/prompts/<category>/<name>.md

export const TEMPLATE_PLACEHOLDER = '{{CODE}}';

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    category: 'analysis' | 'refactor' | 'doc' | 'test' | 'security' | 'custom';
    template: string; // For custom templates or cached content
    promptFile?: string; // Path to .md file (relative to /prompts/)
}

// Prompt file paths for dynamic loading
export const PROMPT_FILES: Record<string, string> = {
    'analysis-explain': 'analysis/explain.md',
    'analysis-time-complexity': 'analysis/time-complexity.md',
    'analysis-architecture': 'analysis/architecture.md',
    'analysis-qol-improvements': 'analysis/qol-improvements.md',
    'refactor-clean-code': 'refactor/clean-code.md',
    'refactor-modernize-es6': 'refactor/modernize-es6.md',
    'refactor-performance': 'refactor/performance.md',
    'refactor-dry': 'refactor/dry.md',
    'refactor-ts-to-py': 'refactor/ts-to-py.md',
    'refactor-tailwind-to-css': 'refactor/tailwind-to-css.md',
    'security-audit': 'security/audit.md',
    'security-vulnerabilities': 'security/vulnerabilities.md',
    'security-sql-injection': 'security/sql-injection.md',
    'doc-jsdoc': 'doc/jsdoc.md',
    'doc-readme': 'doc/readme.md',
    'doc-non-tech': 'doc/non-tech.md',
    'test-generate-unit': 'test/generate-unit.md',
    'test-edge-cases': 'test/edge-cases.md',
};

// Cache for loaded prompts
const promptCache = new Map<string, string>();

/**
 * Load a prompt template from its markdown file
 * @param templateId - The template ID (e.g., 'analysis-explain')
 * @returns The prompt content or fallback message
 */
export async function loadPromptContent(templateId: string): Promise<string> {
    // Check cache first
    if (promptCache.has(templateId)) {
        return promptCache.get(templateId)!;
    }

    const filePath = PROMPT_FILES[templateId];
    if (!filePath) {
        return `Template not found: ${templateId}\n\n${TEMPLATE_PLACEHOLDER}`;
    }

    try {
        const response = await fetch(`/prompts/${filePath}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const content = await response.text();
        promptCache.set(templateId, content);
        return content;
    } catch (error) {
        console.error(`Failed to load prompt ${templateId}:`, error);
        return `Failed to load template. Using fallback.\n\n${TEMPLATE_PLACEHOLDER}`;
    }
}

/**
 * Get prompt content synchronously (from cache ONLY)
 * Returns the cached content or a placeholder
 */
export function getPromptContentSync(templateId: string): string {
    return promptCache.get(templateId) ?? TEMPLATE_PLACEHOLDER;
}

/**
 * Preload all prompt templates into cache
 */
export async function preloadAllPrompts(): Promise<void> {
    const promises = Object.keys(PROMPT_FILES).map(id => loadPromptContent(id));
    await Promise.all(promises);
}

// Default templates with metadata only (content loaded at runtime)
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
    // Analysis
    {
        id: 'analysis-explain',
        name: 'Explain Code',
        description: 'Comprehensive line-by-line code explanation with anti-laziness directives.',
        category: 'analysis',
        template: TEMPLATE_PLACEHOLDER, // Loaded dynamically
        promptFile: 'analysis/explain.md',
    },
    {
        id: 'analysis-time-complexity',
        name: 'Time Complexity Analysis',
        description: 'Rigorous algorithm complexity analysis with mathematical derivations.',
        category: 'analysis',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'analysis/time-complexity.md',
    },
    {
        id: 'analysis-architecture',
        name: 'Architectural Review',
        description: 'Complete architectural assessment with coupling, cohesion, and quality metrics.',
        category: 'analysis',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'analysis/architecture.md',
    },
    {
        id: 'analysis-qol-improvements',
        name: 'QoL / Feature Suggestions',
        description: 'Exhaustive quality-of-life improvements (50+ suggestions minimum).',
        category: 'analysis',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'analysis/qol-improvements.md',
    },

    // Refactor
    {
        id: 'refactor-clean-code',
        name: 'Clean Code Refactor',
        description: 'Complete code smell detection and refactoring with before/after code.',
        category: 'refactor',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'refactor/clean-code.md',
    },
    {
        id: 'refactor-modernize-es6',
        name: 'Modernize Syntax (ES6+)',
        description: 'Exhaustive modernization of every legacy JavaScript pattern.',
        category: 'refactor',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'refactor/modernize-es6.md',
    },
    {
        id: 'refactor-performance',
        name: 'Optimize Performance',
        description: 'Complete hotspot analysis with quantified optimizations.',
        category: 'refactor',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'refactor/performance.md',
    },
    {
        id: 'refactor-dry',
        name: 'Apply DRY Principles',
        description: 'Exhaustive duplication detection with extracted utility code.',
        category: 'refactor',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'refactor/dry.md',
    },
    {
        id: 'refactor-ts-to-py',
        name: 'TypeScript to Python',
        description: 'Complete TypeScript to idiomatic Python 3 conversion.',
        category: 'refactor',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'refactor/ts-to-py.md',
    },
    {
        id: 'refactor-tailwind-to-css',
        name: 'Tailwind to CSS',
        description: 'Complete Tailwind utility classes to organized CSS conversion.',
        category: 'refactor',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'refactor/tailwind-to-css.md',
    },

    // Security
    {
        id: 'security-audit',
        name: 'Security Audit',
        description: 'Complete OWASP-based security audit with remediation checklist.',
        category: 'security',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'security/audit.md',
    },
    {
        id: 'security-vulnerabilities',
        name: 'Find Vulnerabilities',
        description: 'Offensive security analysis with proof-of-concept exploits.',
        category: 'security',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'security/vulnerabilities.md',
    },
    {
        id: 'security-sql-injection',
        name: 'SQL Injection Check',
        description: 'Complete database query audit for injection vulnerabilities.',
        category: 'security',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'security/sql-injection.md',
    },

    // Documentation
    {
        id: 'doc-jsdoc',
        name: 'Generate JSDoc/TSDoc',
        description: 'Complete JSDoc/TSDoc documentation for all public APIs.',
        category: 'doc',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'doc/jsdoc.md',
    },
    {
        id: 'doc-readme',
        name: 'Write README.md',
        description: 'Complete scannable README with examples and troubleshooting.',
        category: 'doc',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'doc/readme.md',
    },
    {
        id: 'doc-non-tech',
        name: 'Explain for Non-Tech',
        description: 'Plain-language explanation for non-technical stakeholders.',
        category: 'doc',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'doc/non-tech.md',
    },

    // Testing
    {
        id: 'test-generate-unit',
        name: 'Generate Unit Tests (Jest/Vitest)',
        description: 'Complete test suite covering happy paths, edge cases, and errors.',
        category: 'test',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'test/generate-unit.md',
    },
    {
        id: 'test-edge-cases',
        name: 'Edge Case Analysis',
        description: 'Exhaustive edge case and failure scenario identification.',
        category: 'test',
        template: TEMPLATE_PLACEHOLDER,
        promptFile: 'test/edge-cases.md',
    },
];
