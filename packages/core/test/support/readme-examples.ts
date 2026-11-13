export interface ReadmeExample {
  readonly line: number;
  readonly code: string;
}

const FENCE = '```';
const TYPESCRIPT_FENCE = '```ts';
const EXPECTATION =
  /^(?<indent>\s*)(?<expression>.+?);?\s*\/\/ → (?<expected>.+)$/;
const ASSERTION_PRELUDE = [
  "import { deepStrictEqual } from 'node:assert/strict';",
  'const expectReadmeOutput = (actual, expected) =>',
  '  deepStrictEqual(structuredClone(actual), expected);',
].join('\n');

export function extractTypeScriptExamples(
  markdown: string,
): readonly ReadmeExample[] {
  const lines = markdown.split('\n');
  const examples: ReadmeExample[] = [];
  let openedAt: number | undefined;
  lines.forEach((line, index) => {
    if (openedAt === undefined && line === TYPESCRIPT_FENCE) {
      openedAt = index;
    } else if (openedAt !== undefined && line === FENCE) {
      examples.push({
        line: openedAt + 2,
        code: lines.slice(openedAt + 1, index).join('\n'),
      });
      openedAt = undefined;
    }
  });
  return examples;
}

function toAssertion(line: string): string {
  const groups = EXPECTATION.exec(line)?.groups;
  if (groups === undefined) {
    return line;
  }
  const { indent, expression, expected } = groups;
  return `${indent}expectReadmeOutput(${expression}, ${expected});`;
}

export function toExecutableModule(code: string): string {
  return [ASSERTION_PRELUDE, ...code.split('\n').map(toAssertion)].join('\n');
}
