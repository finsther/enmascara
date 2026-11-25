import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codeSnippet } from '../../src/ring/code-snippet.ts';
import {
  DEMO_HMAC_KEY,
  type RingOptions,
  type RingStrategy,
} from '../../src/ring/ring-options.ts';
import { runRing } from '../../src/ring/run-ring.ts';

const HMAC_KEY_VARIABLE = 'ENMASCARA_HMAC_KEY';
const CLABE = '002180032240946700';
const CARD = '4242424242424242';
const CURP = 'BNQF380215XSRHNDD6';
const INPUT = `SPEI a ${CLABE}\ntarjeta ${CARD}\nCURP ${CURP}`;
const ALL_TYPES: RingOptions['detect'] = ['clabe', 'curp', 'rfc', 'card'];
const STRATEGIES: readonly RingStrategy[] = [
  'fullMask',
  'halfMask',
  'incognito',
];

let snippetDirectory = '';

async function runSnippet(options: RingOptions, input: string) {
  const module = [
    `const text = ${JSON.stringify(input)};`,
    codeSnippet(options),
    'export { masked };',
  ].join('\n');
  const path = join(
    snippetDirectory,
    `${options.strategy}-${options.detect.join('-')}.mjs`,
  );
  await writeFile(path, module);
  const { masked } = await import(pathToFileURL(path).href);
  return masked;
}

beforeAll(async () => {
  snippetDirectory = await mkdtemp(join(import.meta.dirname, '.snippets-'));
  process.env[HMAC_KEY_VARIABLE] = DEMO_HMAC_KEY;
});

afterAll(async () => {
  delete process.env[HMAC_KEY_VARIABLE];
  await rm(snippetDirectory, { recursive: true, force: true });
});

describe('codeSnippet', () => {
  it('shows only the strategy when every type is selected', () => {
    expect(codeSnippet({ detect: ALL_TYPES, strategy: 'fullMask' })).toBe(
      [
        "import { createRedactor } from 'enmascara';",
        '',
        'const redact = createRedactor({',
        "  strategy: 'redact',",
        '});',
        '',
        'const masked = redact.text(text);',
      ].join('\n'),
    );
  });

  it('lists the selected types when some are left out', () => {
    expect(
      codeSnippet({ detect: ['clabe', 'card'], strategy: 'halfMask' }),
    ).toBe(
      [
        "import { createRedactor } from 'enmascara';",
        '',
        'const redact = createRedactor({',
        "  detect: ['clabe', 'card'],",
        "  strategy: 'partial',",
        '});',
        '',
        'const masked = redact.text(text);',
      ].join('\n'),
    );
  });

  it('reads the hmac key from the environment in incognito', () => {
    expect(codeSnippet({ detect: ['curp'], strategy: 'incognito' })).toBe(
      [
        "import { createRedactor } from 'enmascara';",
        '',
        'const redact = createRedactor({',
        "  detect: ['curp'],",
        "  strategy: 'hmac',",
        `  hmacKey: process.env.${HMAC_KEY_VARIABLE},`,
        '});',
        '',
        'const masked = redact.text(text);',
      ].join('\n'),
    );
  });

  it('never contains the demo key', () => {
    for (const strategy of STRATEGIES) {
      expect(codeSnippet({ detect: ALL_TYPES, strategy })).not.toContain(
        DEMO_HMAC_KEY,
      );
    }
  });

  it.each(
    STRATEGIES.flatMap((strategy) => [
      { detect: ALL_TYPES, strategy },
      { detect: ['clabe', 'curp'] as RingOptions['detect'], strategy },
    ]),
  )('masks like the ring with $strategy and $detect', async (options) => {
    expect(await runSnippet(options, INPUT)).toBe(
      runRing(INPUT, options).output,
    );
  });
});
