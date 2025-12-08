import type { CodeProcessingModeType } from '@/types/session';

/**
 * Language types for comment syntax detection
 */
type LanguageType = 
  | 'c-style'      // JS, TS, C, C++, Java, Rust, Go, Swift, Kotlin, Scala, CSS, SCSS, Less
  | 'python-style' // Python, Shell, Ruby, Perl, YAML, TOML, Dockerfile
  | 'html-style'   // HTML, XML, SVG, Vue, Svelte
  | 'sql-style'    // SQL (-- and /* */)
  | 'lua-style'    // Lua (-- and --[[ ]])
  | 'unknown';

/**
 * Detects the language type based on file extension for comment syntax handling
 */
export function detectLanguageType(filename: string): LanguageType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  
  const extensionMap: Record<string, LanguageType> = {
    // C-style comments (// and /* */)
    'js': 'c-style',
    'jsx': 'c-style',
    'ts': 'c-style',
    'tsx': 'c-style',
    'mjs': 'c-style',
    'cjs': 'c-style',
    'mts': 'c-style',
    'cts': 'c-style',
    'c': 'c-style',
    'h': 'c-style',
    'cpp': 'c-style',
    'hpp': 'c-style',
    'cc': 'c-style',
    'cxx': 'c-style',
    'java': 'c-style',
    'kt': 'c-style',
    'kts': 'c-style',
    'scala': 'c-style',
    'rs': 'c-style',
    'go': 'c-style',
    'swift': 'c-style',
    'cs': 'c-style',
    'css': 'c-style',
    'scss': 'c-style',
    'sass': 'c-style',
    'less': 'c-style',
    'php': 'c-style',
    'json': 'c-style', // JSON doesn't have comments, but JSONC does
    'jsonc': 'c-style',
    
    // Python-style comments (#)
    'py': 'python-style',
    'pyw': 'python-style',
    'pyi': 'python-style',
    'sh': 'python-style',
    'bash': 'python-style',
    'zsh': 'python-style',
    'fish': 'python-style',
    'rb': 'python-style',
    'rbw': 'python-style',
    'rake': 'python-style',
    'gemspec': 'python-style',
    'pl': 'python-style',
    'pm': 'python-style',
    'yaml': 'python-style',
    'yml': 'python-style',
    'toml': 'python-style',
    'dockerfile': 'python-style',
    'r': 'python-style',
    'ps1': 'python-style',
    'psm1': 'python-style',
    'psd1': 'python-style',
    'conf': 'python-style',
    'ini': 'python-style',
    'env': 'python-style',
    'gitignore': 'python-style',
    'dockerignore': 'python-style',
    'editorconfig': 'python-style',
    
    // HTML-style comments (<!-- -->)
    'html': 'html-style',
    'htm': 'html-style',
    'xml': 'html-style',
    'xhtml': 'html-style',
    'svg': 'html-style',
    'vue': 'html-style',
    'svelte': 'html-style',
    'astro': 'html-style',
    'md': 'html-style',
    'mdx': 'html-style',
    
    // SQL-style comments (-- and /* */)
    'sql': 'sql-style',
    'pgsql': 'sql-style',
    'mysql': 'sql-style',
    'sqlite': 'sql-style',
    
    // Lua-style comments (-- and --[[ ]])
    'lua': 'lua-style',
  };
  
  // Handle special filenames without extensions
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename === 'dockerfile' || lowerFilename.startsWith('dockerfile.')) {
    return 'python-style';
  }
  if (lowerFilename === 'makefile' || lowerFilename === 'gnumakefile') {
    return 'python-style';
  }
  
  return extensionMap[ext] ?? 'unknown';
}

/**
 * State machine states for tokenization
 */
type TokenizerState = 
  | 'code'
  | 'single-line-comment'
  | 'block-comment'
  | 'html-comment'
  | 'single-string'
  | 'double-string'
  | 'template-string'
  | 'regex';

/**
 * Removes comments from code while preserving strings and regex literals.
 * Uses a state-machine approach to safely handle nested constructs.
 */
function removeCommentsCSyle(content: string): string {
  let result = '';
  let state: TokenizerState = 'code';
  let i = 0;
  const len = content.length;
  const regexPrecederChars = new Set(['=', '(', ',', ':', '[', '!', '&', '|', '?', ';', '{', '}']);
  const regexPrecederKeywords = /\b(return|typeof|void|delete|new|case|throw)\b/;
  
  while (i < len) {
    const char = content[i];
    const nextChar = content[i + 1] ?? '';
    
    switch (state) {
      case 'code': {
        // Check for single-line comment
        if (char === '/' && nextChar === '/') {
          state = 'single-line-comment';
          i += 2;
          continue;
        }
        
        // Check for block comment
        if (char === '/' && nextChar === '*') {
          state = 'block-comment';
          i += 2;
          continue;
        }
        
        // Check for single-quoted string
        if (char === "'") {
          state = 'single-string';
          result += char;
          i++;
          continue;
        }
        
        // Check for double-quoted string
        if (char === '"') {
          state = 'double-string';
          result += char;
          i++;
          continue;
        }
        
        // Check for template literal
        if (char === '`') {
          state = 'template-string';
          result += char;
          i++;
          continue;
        }
        
        // Check for regex literal
        // Regex can appear after: ( , = [ ! & | ? : ; { } return typeof void delete ~ + - 
        // But NOT after: ) ] } identifier number string
        if (char === '/') {
          const rawLookback = result.slice(-20);
          const lookback = rawLookback.trimEnd();
          const lastChar = lookback.slice(-1);
          
          if (
            regexPrecederKeywords.test(lookback) ||
            regexPrecederChars.has(lastChar) ||
            lookback === '' ||
            rawLookback.endsWith('\n')
          ) {
            // This could be a regex
            state = 'regex';
            result += char;
            i++;
            continue;
          }
        }
        
        result += char;
        i++;
        break;
      }
      
      case 'single-line-comment': {
        // Consume until end of line
        if (char === '\n') {
          state = 'code';
          result += '\n'; // Preserve the newline
        }
        i++;
        break;
      }
      
      case 'block-comment': {
        // Consume until */
        if (char === '*' && nextChar === '/') {
          state = 'code';
          i += 2;
          // Add a space to prevent token merging (e.g., a/**/b -> a b not ab)
          result += ' ';
        } else {
          // Preserve newlines in block comments for line count consistency
          if (char === '\n') {
            result += '\n';
          }
          i++;
        }
        break;
      }
      
      case 'single-string': {
        result += char;
        // Check for escape sequence
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        // Check for end of string
        if (char === "'") {
          state = 'code';
        }
        i++;
        break;
      }
      
      case 'double-string': {
        result += char;
        // Check for escape sequence
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        // Check for end of string
        if (char === '"') {
          state = 'code';
        }
        i++;
        break;
      }
      
      case 'template-string': {
        result += char;
        // Check for escape sequence
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        // Check for end of template string
        if (char === '`') {
          state = 'code';
        }
        // Note: We don't handle ${} interpolation specially since 
        // comments inside ${} would be handled when we return to 'code' state
        // For simplicity, we treat the whole template literal as a string
        i++;
        break;
      }
      
      case 'regex': {
        result += char;
        // Check for escape sequence
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        // Check for character class (don't end on / inside [])
        if (char === '[') {
          // Consume until ]
          i++;
          while (i < len) {
            const c = content[i];
            result += c;
            if (c === '\\' && i + 1 < len) {
              result += content[i + 1];
              i += 2;
              continue;
            }
            if (c === ']') {
              break;
            }
            i++;
          }
          i++;
          continue;
        }
        // Check for end of regex
        if (char === '/') {
          state = 'code';
          // Consume regex flags
          i++;
          while (i < len && /[gimsuy]/.test(content[i])) {
            result += content[i];
            i++;
          }
          continue;
        }
        // Regex cannot span multiple lines (except in rare cases with \n in character class)
        if (char === '\n') {
          // This wasn't a regex, backtrack... but for simplicity, just continue
          state = 'code';
        }
        i++;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Removes Python-style comments (#) while preserving strings
 */
function removeCommentsPythonStyle(content: string): string {
  let result = '';
  let state: 'code' | 'single-string' | 'double-string' | 'triple-single' | 'triple-double' | 'comment' = 'code';
  let i = 0;
  const len = content.length;
  
  while (i < len) {
    const char = content[i];
    const nextTwo = content.slice(i, i + 3);
    const nextChar = content[i + 1] ?? '';
    
    switch (state) {
      case 'code': {
        // Check for triple-quoted strings first
        if (nextTwo === '"""') {
          state = 'triple-double';
          result += nextTwo;
          i += 3;
          continue;
        }
        if (nextTwo === "'''") {
          state = 'triple-single';
          result += nextTwo;
          i += 3;
          continue;
        }
        
        // Check for single-quoted string
        if (char === "'") {
          state = 'single-string';
          result += char;
          i++;
          continue;
        }
        
        // Check for double-quoted string
        if (char === '"') {
          state = 'double-string';
          result += char;
          i++;
          continue;
        }
        
        // Check for comment
        if (char === '#') {
          state = 'comment';
          i++;
          continue;
        }
        
        result += char;
        i++;
        break;
      }
      
      case 'comment': {
        if (char === '\n') {
          state = 'code';
          result += '\n';
        }
        i++;
        break;
      }
      
      case 'single-string': {
        result += char;
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === "'") {
          state = 'code';
        }
        i++;
        break;
      }
      
      case 'double-string': {
        result += char;
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === '"') {
          state = 'code';
        }
        i++;
        break;
      }
      
      case 'triple-single': {
        result += char;
        if (nextTwo === "'''" && content[i - 1] !== '\\') {
          result += "''";
          state = 'code';
          i += 3;
          continue;
        }
        i++;
        break;
      }
      
      case 'triple-double': {
        result += char;
        if (nextTwo === '"""' && content[i - 1] !== '\\') {
          result += '""';
          state = 'code';
          i += 3;
          continue;
        }
        i++;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Removes HTML-style comments (<!-- -->) while preserving strings in attributes
 */
function removeCommentsHTMLStyle(content: string): string {
  let result = '';
  let state: 'normal' | 'comment' | 'single-string' | 'double-string' = 'normal';
  let i = 0;
  const len = content.length;
  let inTag = false;
  
  while (i < len) {
    const char = content[i];
    const fourChars = content.slice(i, i + 4);
    const threeChars = content.slice(i, i + 3);
    
    switch (state) {
      case 'normal': {
        // Track if we're inside a tag for string handling
        if (char === '<' && fourChars !== '<!--') {
          inTag = true;
        } else if (char === '>' && inTag) {
          inTag = false;
        }
        
        // Check for comment start
        if (fourChars === '<!--') {
          state = 'comment';
          i += 4;
          continue;
        }
        
        // Inside a tag, handle strings
        if (inTag) {
          if (char === '"') {
            state = 'double-string';
            result += char;
            i++;
            continue;
          }
          if (char === "'") {
            state = 'single-string';
            result += char;
            i++;
            continue;
          }
        }
        
        result += char;
        i++;
        break;
      }
      
      case 'comment': {
        // Look for -->
        if (threeChars === '-->') {
          state = 'normal';
          i += 3;
          // Add a space to prevent content merging
          result += ' ';
          continue;
        }
        // Preserve newlines
        if (char === '\n') {
          result += '\n';
        }
        i++;
        break;
      }
      
      case 'double-string': {
        result += char;
        if (char === '"') {
          state = 'normal';
        }
        i++;
        break;
      }
      
      case 'single-string': {
        result += char;
        if (char === "'") {
          state = 'normal';
        }
        i++;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Removes SQL-style comments (-- and block comments) while preserving strings
 */
function removeCommentsSQLStyle(content: string): string {
  let result = '';
  let state: 'code' | 'single-string' | 'double-string' | 'line-comment' | 'block-comment' = 'code';
  let i = 0;
  const len = content.length;
  
  while (i < len) {
    const char = content[i];
    const nextChar = content[i + 1] ?? '';
    
    switch (state) {
      case 'code': {
        // Check for line comment (--)
        if (char === '-' && nextChar === '-') {
          state = 'line-comment';
          i += 2;
          continue;
        }
        
        // Check for block comment
        if (char === '/' && nextChar === '*') {
          state = 'block-comment';
          i += 2;
          continue;
        }
        
        // Check for strings (SQL uses single quotes primarily)
        if (char === "'") {
          state = 'single-string';
          result += char;
          i++;
          continue;
        }
        
        // Some SQL dialects support double-quoted identifiers
        if (char === '"') {
          state = 'double-string';
          result += char;
          i++;
          continue;
        }
        
        result += char;
        i++;
        break;
      }
      
      case 'line-comment': {
        if (char === '\n') {
          state = 'code';
          result += '\n';
        }
        i++;
        break;
      }
      
      case 'block-comment': {
        if (char === '*' && nextChar === '/') {
          state = 'code';
          i += 2;
          result += ' ';
          continue;
        }
        if (char === '\n') {
          result += '\n';
        }
        i++;
        break;
      }
      
      case 'single-string': {
        result += char;
        // SQL escapes single quotes by doubling them
        if (char === "'" && nextChar === "'") {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === "'") {
          state = 'code';
        }
        i++;
        break;
      }
      
      case 'double-string': {
        result += char;
        if (char === '"' && nextChar === '"') {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === '"') {
          state = 'code';
        }
        i++;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Removes Lua-style comments (-- and --[[ ]]) while preserving strings
 */
function removeCommentsLuaStyle(content: string): string {
  let result = '';
  let state: 'code' | 'single-string' | 'double-string' | 'long-string' | 'line-comment' | 'block-comment' = 'code';
  let i = 0;
  const len = content.length;
  let longStringLevel = 0;
  
  while (i < len) {
    const char = content[i];
    const nextChar = content[i + 1] ?? '';
    
    switch (state) {
      case 'code': {
        // Check for block comment --[[ or --[=[ etc.
        if (char === '-' && nextChar === '-') {
          const rest = content.slice(i + 2);
          const blockMatch = rest.match(/^\[(=*)\[/);
          if (blockMatch) {
            state = 'block-comment';
            longStringLevel = blockMatch[1].length;
            i += 4 + longStringLevel;
            continue;
          } else {
            state = 'line-comment';
            i += 2;
            continue;
          }
        }
        
        // Check for long strings [[ or [=[ etc.
        if (char === '[') {
          const rest = content.slice(i);
          const longMatch = rest.match(/^\[(=*)\[/);
          if (longMatch) {
            state = 'long-string';
            longStringLevel = longMatch[1].length;
            result += longMatch[0];
            i += longMatch[0].length;
            continue;
          }
        }
        
        if (char === "'") {
          state = 'single-string';
          result += char;
          i++;
          continue;
        }
        
        if (char === '"') {
          state = 'double-string';
          result += char;
          i++;
          continue;
        }
        
        result += char;
        i++;
        break;
      }
      
      case 'line-comment': {
        if (char === '\n') {
          state = 'code';
          result += '\n';
        }
        i++;
        break;
      }
      
      case 'block-comment': {
        // Look for ]=] or ]===] etc. matching the opening level
        const closePattern = ']' + '='.repeat(longStringLevel) + ']';
        if (content.slice(i, i + closePattern.length) === closePattern) {
          state = 'code';
          i += closePattern.length;
          result += ' ';
          continue;
        }
        if (char === '\n') {
          result += '\n';
        }
        i++;
        break;
      }
      
      case 'long-string': {
        const closePattern = ']' + '='.repeat(longStringLevel) + ']';
        result += char;
        if (content.slice(i, i + closePattern.length) === closePattern) {
          result += content.slice(i + 1, i + closePattern.length);
          state = 'code';
          i += closePattern.length;
          continue;
        }
        i++;
        break;
      }
      
      case 'single-string': {
        result += char;
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === "'") {
          state = 'code';
        }
        i++;
        break;
      }
      
      case 'double-string': {
        result += char;
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === '"') {
          state = 'code';
        }
        i++;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Removes comments based on the detected language type
 */
function removeComments(content: string, languageType: LanguageType): string {
  switch (languageType) {
    case 'c-style':
      return removeCommentsCSyle(content);
    case 'python-style':
      return removeCommentsPythonStyle(content);
    case 'html-style':
      return removeCommentsHTMLStyle(content);
    case 'sql-style':
      return removeCommentsSQLStyle(content);
    case 'lua-style':
      return removeCommentsLuaStyle(content);
    case 'unknown':
      // For unknown languages, try C-style as it's most common
      return removeCommentsCSyle(content);
    default:
      return content;
  }
}

/**
 * Performs smart whitespace reduction while preserving code structure
 */
function smartMinify(content: string, languageType: LanguageType): string {
  // First remove comments
  let result = removeComments(content, languageType);
  
  // Split into lines for processing
  const lines = result.split('\n');
  
  // Trim each line
  const trimmedLines = lines.map(line => line.trim());
  
  // Remove empty lines but keep at most one empty line between non-empty lines
  const collapsedLines: string[] = [];
  let prevWasEmpty = false;
  
  for (const line of trimmedLines) {
    if (line === '') {
      if (!prevWasEmpty) {
        // Keep one empty line as separator
        collapsedLines.push('');
        prevWasEmpty = true;
      }
      // Skip additional empty lines
    } else {
      collapsedLines.push(line);
      prevWasEmpty = false;
    }
  }
  
  // Remove leading and trailing empty lines
  while (collapsedLines.length > 0 && collapsedLines[0] === '') {
    collapsedLines.shift();
  }
  while (collapsedLines.length > 0 && collapsedLines[collapsedLines.length - 1] === '') {
    collapsedLines.pop();
  }
  
  result = collapsedLines.join('\n');
  
  // Collapse multiple spaces to single space (but not in strings)
  // We need to be careful here - use state machine to preserve strings
  result = collapseSpacesPreservingStrings(result, languageType);
  
  return result;
}

/**
 * Collapses multiple spaces to single space while preserving strings
 */
function collapseSpacesPreservingStrings(content: string, languageType: LanguageType): string {
  // For safety, we only collapse spaces outside of string literals
  // This is a simplified approach that works for most languages
  
  let result = '';
  let state: 'code' | 'single-string' | 'double-string' | 'template-string' = 'code';
  let i = 0;
  const len = content.length;
  let lastWasSpace = false;
  
  while (i < len) {
    const char = content[i];
    const nextChar = content[i + 1] ?? '';
    
    switch (state) {
      case 'code': {
        // Check for string starts
        if (char === "'" && languageType !== 'html-style') {
          state = 'single-string';
          result += char;
          lastWasSpace = false;
          i++;
          continue;
        }
        
        if (char === '"') {
          state = 'double-string';
          result += char;
          lastWasSpace = false;
          i++;
          continue;
        }
        
        if (char === '`' && (languageType === 'c-style' || languageType === 'unknown')) {
          state = 'template-string';
          result += char;
          lastWasSpace = false;
          i++;
          continue;
        }
        
        // Collapse spaces (but not newlines)
        if (char === ' ' || char === '\t') {
          if (!lastWasSpace) {
            result += ' ';
            lastWasSpace = true;
          }
          i++;
          continue;
        }
        
        result += char;
        lastWasSpace = (char === '\n'); // Reset after newline
        i++;
        break;
      }
      
      case 'single-string': {
        result += char;
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === "'") {
          state = 'code';
        }
        i++;
        lastWasSpace = false;
        break;
      }
      
      case 'double-string': {
        result += char;
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === '"') {
          state = 'code';
        }
        i++;
        lastWasSpace = false;
        break;
      }
      
      case 'template-string': {
        result += char;
        if (char === '\\' && i + 1 < len) {
          result += nextChar;
          i += 2;
          continue;
        }
        if (char === '`') {
          state = 'code';
        }
        i++;
        lastWasSpace = false;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Main code processing function that handles different processing modes
 * 
 * @param content - The source code content to process
 * @param filename - The filename (used for language detection)
 * @param mode - The processing mode: 'raw', 'remove-comments', or 'minify'
 * @returns The processed code content
 * 
 * @example
 * ```typescript
 * // Keep code as-is
 * processCode(code, 'app.ts', 'raw');
 * 
 * // Remove comments while preserving strings
 * processCode(code, 'app.ts', 'remove-comments');
 * 
 * // Remove comments and reduce whitespace
 * processCode(code, 'app.ts', 'minify');
 * ```
 */
export function processCode(
  content: string,
  filename: string,
  mode: CodeProcessingModeType
): string {
  // Early return for empty content
  if (!content) {
    return content;
  }
  
  // Raw mode - return as-is
  if (mode === 'raw') {
    return content;
  }
  
  // Detect language type based on filename
  const languageType = detectLanguageType(filename);
  
  // Remove comments mode
  if (mode === 'remove-comments') {
    return removeComments(content, languageType);
  }
  
  // Minify mode - remove comments and reduce whitespace
  if (mode === 'minify') {
    return smartMinify(content, languageType);
  }

  if (mode === 'signatures-only' || mode === 'interfaces-only') {
    return content;
  }
  
  // Fallback - return as-is for unknown modes
  return content;
}

/**
 * Batch process multiple files
 * 
 * @param files - Array of objects with content and filename
 * @param mode - The processing mode to apply
 * @returns Array of processed content strings
 */
export function processCodeBatch(
  files: Array<{ content: string; filename: string }>,
  mode: CodeProcessingModeType
): string[] {
  return files.map(file => processCode(file.content, file.filename, mode));
}

/**
 * Estimates token savings from processing
 * 
 * @param originalContent - Original code content
 * @param processedContent - Processed code content
 * @returns Object with original length, processed length, and savings percentage
 */
export function estimateTokenSavings(
  originalContent: string,
  processedContent: string
): { originalLength: number; processedLength: number; savingsPercent: number } {
  const originalLength = originalContent.length;
  const processedLength = processedContent.length;
  const savingsPercent = originalLength > 0
    ? Math.round(((originalLength - processedLength) / originalLength) * 100)
    : 0;
  
  return {
    originalLength,
    processedLength,
    savingsPercent: Math.max(0, savingsPercent), // Ensure non-negative
  };
}
