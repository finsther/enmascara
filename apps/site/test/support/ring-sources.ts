import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const SITE_DIRECTORY = resolve(import.meta.dirname, '../..');
const RING_DIRECTORIES = ['src/ring', 'src/components/ring'].map((path) =>
  join(SITE_DIRECTORY, path),
);
const SOURCE_EXTENSIONS = ['.ts', '.astro'];
const PACKAGE_IMPORT = 'enmascara';
const FORBIDDEN_IDENTIFIERS = new Set([
  'RegExp',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'cookie',
  'history',
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
]);
const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const SCRIPT_BLOCK = /<script[^>]*>([\s\S]*?)<\/script>/g;

export interface RingSource {
  readonly path: string;
  readonly code: string;
}

function isInsideRing(path: string): boolean {
  return RING_DIRECTORIES.some(
    (directory) => !relative(directory, path).startsWith('..'),
  );
}

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((path) =>
      SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension)),
    )
    .map((path) => join(directory, path));
}

function scriptsOf(path: string, content: string): string {
  if (!path.endsWith('.astro')) {
    return content;
  }
  const frontmatter = FRONTMATTER.exec(content)?.[1] ?? '';
  const scripts = [...content.matchAll(SCRIPT_BLOCK)].map(
    ([, code]) => code ?? '',
  );
  return [frontmatter, ...scripts].join('\n');
}

/**
 * Reads the code of every source of the ring island. For Astro components
 * it keeps the frontmatter and the `<script>` blocks.
 */
export function ringSources(): readonly RingSource[] {
  return RING_DIRECTORIES.flatMap(sourceFiles).map((path) => ({
    path,
    code: scriptsOf(path, readFileSync(path, 'utf8')),
  }));
}

function importViolation(
  source: RingSource,
  specifier: string,
): string | undefined {
  if (specifier === PACKAGE_IMPORT) {
    return undefined;
  }
  const isRelative = specifier.startsWith('.');
  if (isRelative && isInsideRing(resolve(dirname(source.path), specifier))) {
    return undefined;
  }
  return `import ${specifier}`;
}

function nodeViolation(source: RingSource, node: ts.Node): string | undefined {
  if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
    return 'regular expression literal';
  }
  if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
    return `identifier ${node.text}`;
  }
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return importViolation(source, node.moduleSpecifier.text);
  }
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword
  ) {
    const [specifier] = node.arguments;
    return specifier !== undefined && ts.isStringLiteral(specifier)
      ? importViolation(source, specifier.text)
      : 'dynamic import without a literal path';
  }
  return undefined;
}

/**
 * Lists what a ring source must not contain: regular expressions, imports
 * other than `enmascara` and the ring itself, and network, storage, URL
 * history or HTML-writing APIs.
 */
export function ringSourceViolations(source: RingSource): readonly string[] {
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    const violation = nodeViolation(source, node);
    if (violation !== undefined) {
      violations.push(violation);
    }
    ts.forEachChild(node, visit);
  };
  visit(
    ts.createSourceFile(source.path, source.code, ts.ScriptTarget.Latest, true),
  );
  return violations;
}
