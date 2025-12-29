// Type declarations for importing markdown files as raw strings
declare module '*.md' {
    const content: string;
    export default content;
}
