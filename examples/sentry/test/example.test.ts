import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const exampleDirectory = fileURLToPath(new URL('..', import.meta.url));
const RAW_IDENTIFIERS = [
  '002180032240946700',
  'GODE561231HDFRRN00',
  'GODE561231GR8',
  '4242 4242 4242 4242',
] as const;

function runExample(): string {
  return execFileSync(process.execPath, ['index.ts'], {
    cwd: exampleDirectory,
    encoding: 'utf8',
  });
}

function parseLines(output: string): readonly unknown[] {
  return output
    .trim()
    .split('\n')
    .map((line): unknown => JSON.parse(line));
}

describe('Sentry example', () => {
  const output = runExample();

  it('prints the error event Sentry would send, masked', () => {
    expect(parseLines(output)).toMatchObject([
      {
        exception: {
          values: [{ value: 'RFC [RFC] no coincide con el beneficiario' }],
        },
        user: { id: '[CURP]' },
        contexts: { pago: { tarjeta: '[CARD]' } },
        breadcrumbs: [{ category: 'spei', message: 'transferencia a [CLABE]' }],
      },
    ]);
  });

  it.each(RAW_IDENTIFIERS)('never prints %s', (identifier) => {
    expect(output).not.toContain(identifier);
  });
});
