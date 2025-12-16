import Parser from 'web-tree-sitter';

export type LanguageKey = 'typescript' | 'tsx' | 'javascript' | 'python' | 'rust' | 'go';

const LANGUAGE_EXTENSIONS: Record<LanguageKey, string[]> = {
  typescript: ['ts', 'mts', 'cts'],
  tsx: ['tsx'],
  javascript: ['js', 'mjs', 'cjs', 'jsx'],
  python: ['py', 'pyw', 'pyx'],
  rust: ['rs'],
  go: ['go'],
};

const RUNTIME_WASM_PATH = '/grammars/tree-sitter.wasm';

export class TreeSitterService {
  private static instance: TreeSitterService | null = null;

  private initPromise: Promise<void> | null = null;
  private languageCache = new Map<LanguageKey, Parser.Language>();
  private languagePromises = new Map<LanguageKey, Promise<Parser.Language | null>>();
  private parserCache = new Map<LanguageKey, Parser>();

  static getInstance(): TreeSitterService {
    if (!TreeSitterService.instance) {
      TreeSitterService.instance = new TreeSitterService();
    }
    return TreeSitterService.instance;
  }

  /**
   * Ensure the global Parser wasm is ready.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = Parser.init({
        locateFile: () => RUNTIME_WASM_PATH,
      }).then(() => undefined);
    }
    await this.initPromise;
  }

  /**
   * Map a filename or extension to a known language key.
   */
  resolveLanguageKey(nameOrExtension: string): LanguageKey | null {
    if (!nameOrExtension) return null;

    const ext = nameOrExtension.toLowerCase().replace(/^\./, '');

    for (const [key, exts] of Object.entries(LANGUAGE_EXTENSIONS) as [LanguageKey, string[]][]) {
      if (exts.includes(ext)) {
        return key;
      }
    }

    return null;
  }

  private getGrammarUrl(key: LanguageKey): string {
    return `/grammars/tree-sitter-${key}.wasm`;
  }

  /**
   * Load and cache a Tree-sitter language wasm.
   */
  async getLanguage(key: LanguageKey): Promise<Parser.Language | null> {
    await this.ensureInitialized();

    const cached = this.languageCache.get(key);
    if (cached) return cached;

    const pending = this.languagePromises.get(key);
    if (pending) return pending;

    const promise = Parser.Language.load(this.getGrammarUrl(key))
      .then((language) => {
        this.languageCache.set(key, language);
        return language;
      })
      .catch((error) => {
        console.warn(`Tree-sitter: failed to load language ${key}`, error);
        this.languagePromises.delete(key);
        return null;
      });

    this.languagePromises.set(key, promise);
    return promise;
  }

  /**
   * Get a parser instance bound to the requested language. Parsers are cached per language
   * to avoid cross-language state reuse.
   */
  private async getParserForLanguage(key: LanguageKey): Promise<Parser | null> {
    await this.ensureInitialized();
    const language = await this.getLanguage(key);
    if (!language) return null;

    const cached = this.parserCache.get(key);
    if (cached) return cached;

    const parser = new Parser();
    parser.setLanguage(language);
    this.parserCache.set(key, parser);
    return parser;
  }

  /**
   * Parse source text with the specified language key.
   */
  async parse(source: string, key: LanguageKey): Promise<Parser.Tree | null> {
    const parser = await this.getParserForLanguage(key);
    if (!parser) return null;

    return parser.parse(source);
  }
}

export default TreeSitterService;







