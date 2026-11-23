import { describe, expect, it } from 'vitest';
import { runCommand } from '../src/run-command.ts';

function node(source: string): Promise<unknown> {
  return runCommand(process.execPath, ['--eval', source]);
}

describe('runCommand', () => {
  it('returns what a successful command prints', async () => {
    await expect(node("process.stdout.write('hola')")).resolves.toEqual({
      kind: 'succeeded',
      output: 'hola',
    });
  });

  it('keeps apart what a failed command prints on each stream', async () => {
    await expect(
      node(
        "process.stdout.write('salida'); process.stderr.write('error'); process.exit(1)",
      ),
    ).resolves.toEqual({
      kind: 'failed',
      output: 'salida',
      errorOutput: 'error',
    });
  });

  it('runs the command in the given directory', async () => {
    const outcome = await runCommand(
      process.execPath,
      ['--eval', 'process.stdout.write(process.cwd())'],
      { workingDirectory: '/' },
    );

    expect(outcome).toEqual({ kind: 'succeeded', output: '/' });
  });

  it('reports a command that cannot start as failed', async () => {
    await expect(
      runCommand('enmascara-command-that-does-not-exist', []),
    ).resolves.toMatchObject({ kind: 'failed' });
  });
});
