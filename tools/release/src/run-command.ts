import { execFile } from 'node:child_process';

export type CommandOutcome =
  | { readonly kind: 'succeeded'; readonly output: string }
  | {
      readonly kind: 'failed';
      readonly output: string;
      readonly errorOutput: string;
    };

export interface CommandOptions {
  readonly workingDirectory?: string;
}

export type RunCommand = (
  command: string,
  args: readonly string[],
  options?: CommandOptions,
) => Promise<CommandOutcome>;

export const runCommand: RunCommand = (command, args, options = {}) =>
  new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { cwd: options.workingDirectory, encoding: 'utf8' },
      (error, standardOutput, standardError) => {
        resolve(
          error === null
            ? { kind: 'succeeded', output: standardOutput }
            : {
                kind: 'failed',
                output: standardOutput,
                errorOutput: standardError,
              },
        );
      },
    );
  });
