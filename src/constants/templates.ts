export const TEMPLATE_PLACEHOLDER = '{{CODE}}';

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    category: 'analysis' | 'refactor' | 'doc' | 'test' | 'security' | 'custom';
    template: string; // Must contain {{CODE}}
}

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
    // Analysis
    {
        id: 'analysis-explain',
        name: 'Explain Code',
        description: 'Summarize intent, inputs, outputs, and side effects.',
        category: 'analysis',
        template: `You are a senior engineer. Explain what this code does with a concise summary, detailing inputs, outputs, data flow, error handling, and notable edge cases. Provide bullet highlights and keep the tone direct.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'analysis-time-complexity',
        name: 'Time Complexity Analysis',
        description: 'Evaluate time/space complexity and hotspots.',
        category: 'analysis',
        template: `Analyze the time and space complexity of the following code. Identify the dominant operations, worst/average/best cases where relevant, and call out any bottlenecks or hot paths. Suggest tighter bounds if possible.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'analysis-architecture',
        name: 'Architectural Review',
        description: 'Assess modularity, layering, and coupling.',
        category: 'analysis',
        template: `Perform an architectural review of this code. Discuss layering, separation of concerns, coupling, cohesion, and any implicit contracts. Identify risks to scalability, observability, and maintainability. Provide a short list of actionable improvements.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'analysis-qol-improvements',
        name: 'QoL / Feature Suggestions',
        description: 'Spot missing quality-of-life features and quick wins.',
        category: 'analysis',
        template: `Review this code and propose pragmatic quality-of-life improvements and small feature additions. Focus on friction points (DX/UX), missing safeguards, default behaviors, sensible shortcuts, accessibility, and configuration toggles. Prioritize by impact vs effort and note any dependencies.

${TEMPLATE_PLACEHOLDER}`,
    },

    // Refactor / Conversion
    {
        id: 'refactor-clean-code',
        name: 'Clean Code Refactor',
        description: 'Improve readability, naming, and structure.',
        category: 'refactor',
        template: `Refactor the following code for clarity and maintainability. Improve naming, simplify control flow, remove dead code, and ensure consistent error handling. Preserve behavior and add brief reasoning for key changes.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'refactor-modernize-es6',
        name: 'Modernize Syntax (ES6+)',
        description: 'Upgrade to modern JavaScript/TypeScript patterns.',
        category: 'refactor',
        template: `Modernize this code to ES6+ standards. Prefer const/let, arrow functions, destructuring, optional chaining, nullish coalescing, template literals, and module syntax. Keep behavior identical and note any noteworthy changes.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'refactor-performance',
        name: 'Optimize Performance',
        description: 'Find hotspots and propose faster approaches.',
        category: 'refactor',
        template: `Identify performance hotspots in this code. Recommend concrete optimizations (algorithmic improvements, memoization, batching, reduced allocations, better data structures). Keep readability reasonable and note trade-offs.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'refactor-dry',
        name: 'Apply DRY Principles',
        description: 'Remove duplication and centralize shared logic.',
        category: 'refactor',
        template: `Refactor the code to follow DRY principles. Consolidate repeated logic, extract reusable helpers, and clarify boundaries between responsibilities. Preserve behavior and provide a brief summary of extracted pieces.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'refactor-ts-to-py',
        name: 'TypeScript to Python',
        description: 'Convert logic to idiomatic Python 3.',
        category: 'refactor',
        template: `Convert the following TypeScript/JavaScript code to idiomatic Python 3. Use standard library features, type hints where helpful, and maintain functionality. Explain any key semantic changes briefly.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'refactor-tailwind-to-css',
        name: 'Tailwind to CSS',
        description: 'Expand Tailwind utility classes into plain CSS.',
        category: 'refactor',
        template: `Rewrite the styling by converting Tailwind utility classes into plain CSS (or SCSS). Provide a minimal, organized stylesheet and update the markup accordingly. Preserve visual appearance.

${TEMPLATE_PLACEHOLDER}`,
    },

    // Security
    {
        id: 'security-audit',
        name: 'Security Audit',
        description: 'Review code for common security pitfalls.',
        category: 'security',
        template: `Perform a security audit of the following code. Identify injection risks, insecure deserialization, unsafe eval/exec, XSS/CSRF vectors, auth/authorization gaps, and secrets handling issues. Provide a prioritized remediation checklist.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'security-vulnerabilities',
        name: 'Find Vulnerabilities',
        description: 'Locate and explain exploitable issues.',
        category: 'security',
        template: `Locate potential vulnerabilities in this code. For each finding, provide a short exploit scenario and a recommended fix aligned with best practices. Focus on practical, high-impact issues first.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'security-sql-injection',
        name: 'SQL Injection Check',
        description: 'Audit database calls for injection risks.',
        category: 'security',
        template: `Audit this code for SQL injection risks. Flag string concatenation in queries, missing parameter binding, and unsafe user input handling. Suggest secure patterns using parameterized queries or ORM safeguards.

${TEMPLATE_PLACEHOLDER}`,
    },

    // Documentation
    {
        id: 'doc-jsdoc',
        name: 'Generate JSDoc/TSDoc',
        description: 'Produce type-aware documentation blocks.',
        category: 'doc',
        template: `Generate high-quality JSDoc/TSDoc comments for the following code. Document parameter types, return types, errors thrown, side effects, and examples where useful. Keep comments succinct and accurate.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'doc-readme',
        name: 'Write README.md',
        description: 'Draft a concise README with usage and setup.',
        category: 'doc',
        template: `Write a concise README for this code. Include: project summary, key features, setup/install steps, configuration, commands, usage examples, and troubleshooting notes. Keep it scannable.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'doc-non-tech',
        name: 'Explain for Non-Tech',
        description: 'Translate technical details for stakeholders.',
        category: 'doc',
        template: `Explain the following codebase to a non-technical stakeholder. Focus on purpose, value, user impact, and operational considerations. Avoid jargon; use plain language and short paragraphs.

${TEMPLATE_PLACEHOLDER}`,
    },

    // Testing
    {
        id: 'test-generate-unit',
        name: 'Generate Unit Tests (Jest/Vitest)',
        description: 'Create focused, deterministic unit tests.',
        category: 'test',
        template: `Generate unit tests in Jest or Vitest for the following code. Cover happy paths, edge cases, and failure modes. Use clear arrange/act/assert structure and avoid testing implementation details.

${TEMPLATE_PLACEHOLDER}`,
    },
    {
        id: 'test-edge-cases',
        name: 'Edge Case Analysis',
        description: 'List missing edge cases and risks.',
        category: 'test',
        template: `List edge cases and failure scenarios this code should handle. Identify missing checks, boundary conditions, concurrency/race risks, and input validation gaps. Provide concise recommendations.

${TEMPLATE_PLACEHOLDER}`,
    },
];

