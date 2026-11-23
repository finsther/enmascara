import { describe, expect, it } from 'vitest';
import {
  createNpmReleaseCommands,
  ReleaseCommandError,
  SLSA_PROVENANCE,
} from '../src/npm-release-commands.ts';
import type { ReleaseStep } from '../src/release-plan.ts';
import type {
  CommandOptions,
  CommandOutcome,
  RunCommand,
} from '../src/run-command.ts';

const STEP: ReleaseStep = {
  name: 'enmascara-pino',
  version: '0.1.0',
  directory: '/repository/packages/pino',
  tag: 'enmascara-pino@0.1.0',
  action: 'publish',
};
const TARGET = { repository: 'finsther/enmascara', commit: 'abc123' };

interface Call {
  readonly command: readonly string[];
  readonly options: CommandOptions | undefined;
}

function answering(outcome: CommandOutcome): {
  readonly run: RunCommand;
  readonly calls: Call[];
} {
  const calls: Call[] = [];
  return {
    calls,
    run: async (command, args, options) => {
      calls.push({ command: [command, ...args], options });
      return outcome;
    },
  };
}

const SUCCEEDED: CommandOutcome = { kind: 'succeeded', output: '' };
const FAILED: CommandOutcome = { kind: 'failed', output: 'npm error 403' };

describe('createNpmReleaseCommands', () => {
  it('publishes with npm from the package directory', async () => {
    const npm = answering(SUCCEEDED);

    await createNpmReleaseCommands(npm.run, TARGET).publish(STEP);

    expect(npm.calls).toEqual([
      {
        command: ['npm', 'publish'],
        options: { workingDirectory: '/repository/packages/pino' },
      },
    ]);
  });

  it('fails with what npm said when publishing fails', async () => {
    const npm = answering(FAILED);

    await expect(
      createNpmReleaseCommands(npm.run, TARGET).publish(STEP),
    ).rejects.toThrow(
      new ReleaseCommandError(
        'npm could not publish enmascara-pino@0.1.0',
        'npm error 403',
      ),
    );
  });

  it('asks npm for the provenance predicate of the version', async () => {
    const npm = answering({
      kind: 'succeeded',
      output: `${SLSA_PROVENANCE}\n`,
    });

    await expect(
      createNpmReleaseCommands(npm.run, TARGET).provenance(STEP),
    ).resolves.toEqual({ kind: 'attested' });
    expect(npm.calls.map(({ command }) => command)).toEqual([
      [
        'npm',
        'view',
        'enmascara-pino@0.1.0',
        'dist.attestations.provenance.predicateType',
      ],
    ]);
  });

  it.each([
    ['no predicate yet', { kind: 'succeeded', output: '\n' }],
    [
      'another predicate',
      { kind: 'succeeded', output: 'https://example.com/other' },
    ],
    ['the version not visible yet', { kind: 'failed', output: 'E404' }],
  ] as const)('treats %s as missing provenance', async (_case, outcome) => {
    const npm = answering(outcome);

    await expect(
      createNpmReleaseCommands(npm.run, TARGET).provenance(STEP),
    ).resolves.toEqual({ kind: 'missing' });
  });

  it('creates the tag on the released commit through the GitHub API', async () => {
    const gh = answering(SUCCEEDED);

    await createNpmReleaseCommands(gh.run, TARGET).tag(STEP);

    expect(gh.calls.map(({ command }) => command)).toEqual([
      [
        'gh',
        'api',
        'repos/finsther/enmascara/git/refs',
        '-f',
        'ref=refs/tags/enmascara-pino@0.1.0',
        '-f',
        'sha=abc123',
      ],
    ]);
  });

  it('fails when the tag cannot be created', async () => {
    const gh = answering(FAILED);

    await expect(
      createNpmReleaseCommands(gh.run, TARGET).tag(STEP),
    ).rejects.toThrow(
      new ReleaseCommandError(
        'GitHub could not create the tag enmascara-pino@0.1.0',
        'npm error 403',
      ),
    );
  });
});
