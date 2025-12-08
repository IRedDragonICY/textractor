/* eslint-env node */
/* global fetch, console, process, Buffer */
import fs from 'node:fs/promises';
import path from 'node:path';

const WEB_TREE_SITTER_VERSION = process.env.WEB_TREE_SITTER_VERSION ?? '0.24.4';
const LANGUAGE_CDN_BASE =
  process.env.TREE_SITTER_WASM_CDN ?? 'https://cdn.jsdelivr.net/npm/tree-sitter-wasms@latest';
const FALLBACK_GITHUB_BASE =
  process.env.TREE_SITTER_WASM_FALLBACK ??
  'https://raw.githubusercontent.com/Menci/tree-sitter-wasm-prebuilt';

const grammars = [
  {
    name: 'runtime',
    filename: 'tree-sitter.wasm',
    sources: [
      `https://cdn.jsdelivr.net/npm/web-tree-sitter@${WEB_TREE_SITTER_VERSION}/tree-sitter.wasm`,
      `https://unpkg.com/web-tree-sitter@${WEB_TREE_SITTER_VERSION}/tree-sitter.wasm`,
    ],
  },
  ...['typescript', 'tsx', 'javascript', 'python', 'rust', 'go'].map((lang) => ({
    name: lang,
    filename: `tree-sitter-${lang}.wasm`,
    sources: [
      `${LANGUAGE_CDN_BASE}/tree-sitter-${lang}.wasm`,
      `${FALLBACK_GITHUB_BASE}/main/tree-sitter-${lang}.wasm`,
      `${FALLBACK_GITHUB_BASE}/master/tree-sitter-${lang}.wasm`,
    ],
  })),
];

async function ensureOutputDir(outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
}

async function downloadGrammar({ name, filename, sources }, outputDir, force) {
  const destination = path.join(outputDir, filename);

  if (!force) {
    try {
      await fs.access(destination);
      console.log(`✓ ${filename} already exists, skipping`);
      return true;
    } catch {
      // File does not exist, proceed with download
    }
  }

  for (const url of sources) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`⚠️  ${name}: ${url} responded with ${response.status}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(destination, buffer);
      console.log(`✔ Downloaded ${filename} from ${url}`);
      return true;
    } catch (error) {
      console.warn(`⚠️  ${name}: failed from ${url}`, error instanceof Error ? error.message : error);
    }
  }

  console.error(`✖ Failed to download ${filename}`);
  return false;
}

async function main() {
  const outputDir = path.resolve('public', 'grammars');
  const force = process.argv.includes('--force');

  await ensureOutputDir(outputDir);

  let successCount = 0;
  for (const grammar of grammars) {
    const ok = await downloadGrammar(grammar, outputDir, force);
    if (ok) successCount++;
  }

  if (successCount === grammars.length) {
    console.log('🎉 All grammars downloaded.');
    return;
  }

  const missing = grammars.length - successCount;
  console.warn(`Completed with ${missing} missing grammars. See logs above.`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('Unhandled error while downloading grammars', error);
  process.exitCode = 1;
});

