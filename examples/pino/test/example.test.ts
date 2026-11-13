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

describe('pino example', () => {
  const output = runExample();

  it('writes every line masked', () => {
    expect(parseLines(output)).toMatchObject([
      {
        requestId: 'req-7f3a',
        curp: '[CURP]',
        clabe: '[CLABE]',
        amount: 1500,
        msg: 'transferencia creada',
      },
      {
        requestId: 'req-7f3a',
        msg: 'reintento de cargo a la tarjeta [CARD]',
      },
      {
        err: { message: 'RFC [RFC] no coincide con el beneficiario' },
        msg: 'RFC [RFC] no coincide con el beneficiario',
      },
    ]);
  });

  it.each(RAW_IDENTIFIERS)('never writes %s', (identifier) => {
    expect(output).not.toContain(identifier);
  });
});
