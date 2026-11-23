import { describe, expect, it } from 'vitest';
import {
  createNpmRegistry,
  RegistryUnavailableError,
} from '../src/npm-registry.ts';
import type { CommandOutcome, RunCommand } from '../src/run-command.ts';

const NOT_FOUND = JSON.stringify({
  error: { code: 'E404', summary: 'Not Found - GET enmascara-pino' },
});

function answering(outcome: CommandOutcome): {
  readonly run: RunCommand;
  readonly calls: (readonly string[])[];
} {
  const calls: (readonly string[])[] = [];
  return {
    calls,
    run: async (command, args) => {
      calls.push([command, ...args]);
      return outcome;
    },
  };
}

describe('createNpmRegistry', () => {
  it('asks npm for every published version of the package', async () => {
    const npm = answering({ kind: 'succeeded', output: '["0.0.0","0.1.0"]' });

    await createNpmRegistry(npm.run).record('enmascara');

    expect(npm.calls).toEqual([
      ['npm', 'view', 'enmascara', 'versions', '--json'],
    ]);
  });

  it('lists the published versions of a reserved package', async () => {
    const npm = answering({
      kind: 'succeeded',
      output: '[\n  "0.0.0",\n  "0.1.0"\n]\n',
    });

    await expect(
      createNpmRegistry(npm.run).record('enmascara'),
    ).resolves.toEqual({ kind: 'reserved', versions: ['0.0.0', '0.1.0'] });
  });

  it('reads the single version npm prints without a list', async () => {
    const npm = answering({ kind: 'succeeded', output: '"0.0.0"\n' });

    await expect(
      createNpmRegistry(npm.run).record('enmascara-pino'),
    ).resolves.toEqual({ kind: 'reserved', versions: ['0.0.0'] });
  });

  it('treats a package npm does not know as unreserved', async () => {
    const npm = answering({
      kind: 'failed',
      output: NOT_FOUND,
      errorOutput: 'npm error code E404\nnpm error 404 Not Found',
    });

    await expect(
      createNpmRegistry(npm.run).record('enmascara-pino'),
    ).resolves.toEqual({ kind: 'unreserved' });
  });

  it.each([
    [
      'a network failure',
      { kind: 'failed', output: '', errorOutput: 'npm error code ETIMEDOUT' },
    ],
    ['output that is not JSON', { kind: 'succeeded', output: 'Not JSON' }],
    ['a list with something else', { kind: 'succeeded', output: '[1]' }],
    ['an object', { kind: 'succeeded', output: '{}' }],
  ] as const)('refuses to guess after %s', async (_case, outcome) => {
    const npm = answering(outcome);

    await expect(
      createNpmRegistry(npm.run).record('enmascara-pino'),
    ).rejects.toThrow(
      new RegistryUnavailableError(
        'npm did not report the versions of enmascara-pino',
      ),
    );
  });
});
