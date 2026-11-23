import { readFileSync } from 'node:fs';

export const BUNDLES = ['index.js', 'index.cjs'] as const;

const MODULE_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;
const NETWORK_APIS =
  /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/g;

export function readBundle(packageUrl: URL, fileName: string): string {
  return readFileSync(new URL(`dist/${fileName}`, packageUrl), 'utf8');
}

export function moduleSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(MODULE_SPECIFIER)].map((match) => match[1] ?? '');
}

export function networkApis(source: string): readonly string[] {
  return [...source.matchAll(NETWORK_APIS)].map((match) => match[0]);
}
