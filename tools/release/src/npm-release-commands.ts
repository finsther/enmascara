import type { ProvenanceRecord, ReleaseCommands } from './publish-release.ts';
import type { RunCommand } from './run-command.ts';

export const SLSA_PROVENANCE = 'https://slsa.dev/provenance/v1';

export interface ReleaseTarget {
  readonly repository: string;
  readonly commit: string;
}

export class ReleaseCommandError extends Error {
  override readonly name = 'ReleaseCommandError';
  readonly output: string;

  constructor(message: string, output: string) {
    super(message);
    this.output = output;
  }
}

export function createNpmReleaseCommands(
  run: RunCommand,
  target: ReleaseTarget,
): ReleaseCommands {
  return {
    publish: async ({ directory, tag }) => {
      const outcome = await run('npm', ['publish'], {
        workingDirectory: directory,
      });
      if (outcome.kind === 'failed') {
        throw new ReleaseCommandError(
          `npm could not publish ${tag}`,
          outcome.output,
        );
      }
    },
    provenance: async ({ tag }): Promise<ProvenanceRecord> => {
      const outcome = await run('npm', [
        'view',
        tag,
        'dist.attestations.provenance.predicateType',
      ]);
      return outcome.kind === 'succeeded' &&
        outcome.output.trim() === SLSA_PROVENANCE
        ? { kind: 'attested' }
        : { kind: 'missing' };
    },
    tag: async ({ tag }) => {
      const outcome = await run('gh', [
        'api',
        `repos/${target.repository}/git/refs`,
        '-f',
        `ref=refs/tags/${tag}`,
        '-f',
        `sha=${target.commit}`,
      ]);
      if (outcome.kind === 'failed') {
        throw new ReleaseCommandError(
          `GitHub could not create the tag ${tag}`,
          outcome.output,
        );
      }
    },
  };
}
