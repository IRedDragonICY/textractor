import Parser from 'web-tree-sitter';
import TreeSitterService, { type LanguageKey } from './tree-sitter-service';

export type AstTransformMode = 'remove-comments' | 'signatures-only' | 'interfaces-only';

interface Replacement {
  start: number;
  end: number;
  text: string;
}

const TS_LIKE_LANGUAGES: LanguageKey[] = ['typescript', 'tsx', 'javascript'];

const TS_COMMENT_QUERY = '(comment) @comment';
const TS_BODY_QUERY = `
[
  (function_declaration body: (statement_block) @body)
  (function body: (statement_block) @body)
  (generator_function body: (statement_block) @body)
  (generator_function_declaration body: (statement_block) @body)
  (method_definition body: (statement_block) @body)
  (arrow_function body: (statement_block) @body)
  (class_static_block) @body
]`;
const TS_INTERFACE_QUERY = `
[
  (interface_declaration) @item
  (type_alias_declaration) @item
  (enum_declaration) @item
]`;

const queryCache = new WeakMap<Parser.Language, Map<string, Parser.Query>>();

function getCachedQuery(language: Parser.Language, cacheKey: string, source: string): Parser.Query {
  let languageCache = queryCache.get(language);
  if (!languageCache) {
    languageCache = new Map();
    queryCache.set(language, languageCache);
  }

  const existing = languageCache.get(cacheKey);
  if (existing) return existing;

  const query = language.query(source);
  languageCache.set(cacheKey, query);
  return query;
}

function applyReplacements(source: string, replacements: Replacement[]): { code: string; replaced: number } {
  const sorted = [...replacements].sort((a, b) => b.start - a.start);
  let output = source;

  for (const replacement of sorted) {
    output = `${output.slice(0, replacement.start)}${replacement.text}${output.slice(replacement.end)}`;
  }

  return { code: output, replaced: sorted.length };
}

function buildBlockReplacement(node: Parser.SyntaxNode, source: string): Replacement | null {
  const blockText = source.slice(node.startIndex, node.endIndex);
  const openIndex = blockText.indexOf('{');
  const closeIndex = blockText.lastIndexOf('}');

  if (openIndex === -1 || closeIndex === -1 || closeIndex <= openIndex) {
    return null;
  }

  const prefix = blockText.slice(0, openIndex + 1);
  const suffix = blockText.slice(closeIndex);
  const newlineMatch = blockText.match(/\{\s*\n([ \t]*)/);
  const inner = newlineMatch ? `\n${newlineMatch[1]}/* ... */\n` : ' /* ... */ ';

  return {
    start: node.startIndex,
    end: node.endIndex,
    text: `${prefix}${inner}${suffix}`,
  };
}

function collectInterfaceSegments(nodes: Parser.SyntaxNode[], source: string): string {
  const seen = new Set<number>();
  const segments: string[] = [];

  const ordered = [...nodes].sort((a, b) => a.startIndex - b.startIndex);
  for (const node of ordered) {
    if (seen.has(node.startIndex)) continue;
    seen.add(node.startIndex);

    const slice = source.slice(node.startIndex, node.endIndex).trim();
    if (slice.length > 0) {
      segments.push(slice);
    }
  }

  return segments.join('\n\n');
}

async function transformTypeScriptLike(
  source: string,
  languageKey: LanguageKey,
  mode: AstTransformMode,
  service: TreeSitterService
): Promise<string | null> {
  const language = await service.getLanguage(languageKey);
  if (!language) return null;

  const tree = await service.parse(source, languageKey);
  if (!tree) return null;

  try {
    if (mode === 'remove-comments') {
      const query = getCachedQuery(language, 'ts:comments', TS_COMMENT_QUERY);
      const captures = query.captures(tree.rootNode);
      const replacements = captures
        .filter(({ name }) => name === 'comment')
        .map(({ node }) => ({ start: node.startIndex, end: node.endIndex, text: '' }));

      return applyReplacements(source, replacements).code;
    }

    if (mode === 'signatures-only') {
      const query = getCachedQuery(language, 'ts:bodies', TS_BODY_QUERY);
      const captures = query.captures(tree.rootNode);

      const replacements: Replacement[] = [];
      for (const capture of captures) {
        if (capture.name !== 'body') continue;
        const replacement = buildBlockReplacement(capture.node, source);
        if (replacement) {
          replacements.push(replacement);
        }
      }

      if (replacements.length === 0) return source;
      return applyReplacements(source, replacements).code;
    }

    if (mode === 'interfaces-only') {
      const query = getCachedQuery(language, 'ts:interfaces', TS_INTERFACE_QUERY);
      const captures = query.captures(tree.rootNode);
      const nodes = captures.filter(({ name }) => name === 'item').map(({ node }) => node);

      return collectInterfaceSegments(nodes, source);
    }
  } catch (error) {
    console.warn(`Tree-sitter transform failed for ${languageKey} (${mode})`, error);
    return null;
  } finally {
    tree.delete();
  }

  return null;
}

export interface TransformRequest {
  source: string;
  language: LanguageKey;
  mode: AstTransformMode;
  service?: TreeSitterService;
}

export async function transformWithAST({
  source,
  language,
  mode,
  service = TreeSitterService.getInstance(),
}: TransformRequest): Promise<string | null> {
  if (TS_LIKE_LANGUAGES.includes(language)) {
    return transformTypeScriptLike(source, language, mode, service);
  }

  return null;
}

export async function transformWithExtension(
  source: string,
  extension: string,
  mode: AstTransformMode,
  service = TreeSitterService.getInstance()
): Promise<string | null> {
  const language = service.resolveLanguageKey(extension);
  if (!language) return null;

  return transformWithAST({ source, language, mode, service });
}







