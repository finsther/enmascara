import { describe, expect, it } from 'vitest';
import {
  MissingProvenanceError,
  type ProvenancePolling,
  type ProvenanceRecord,
  publishRelease,
  type ReleaseCommands,
} from '../src/publish-release.ts';
import type { ReleaseAction, ReleaseStep } from '../src/release-plan.ts';

const ATTEMPTS = 3;

function step(name: string, action: ReleaseAction): ReleaseStep {
  return {
    name,
    version: '0.1.0',
    directory: `packages/${name}`,
    tag: `${name}@0.1.0`,
    action,
  };
}

interface Recorder {
  readonly commands: ReleaseCommands;
  readonly polling: ProvenancePolling;
  readonly events: string[];
}

function recorder(
  provenanceAnswers: readonly ProvenanceRecord[] = [{ kind: 'attested' }],
): Recorder {
  const events: string[] = [];
  const answers = [...provenanceAnswers];
  return {
    events,
    commands: {
      publish: async ({ tag }) => {
        events.push(`publish ${tag}`);
      },
      provenance: async ({ tag }) => {
        events.push(`provenance ${tag}`);
        return answers.shift() ?? { kind: 'missing' };
      },
      tag: async ({ tag }) => {
        events.push(`tag ${tag}`);
      },
    },
    polling: {
      attempts: ATTEMPTS,
      wait: async () => {
        events.push('wait');
      },
    },
  };
}

describe('publishRelease', () => {
  it('publishes, confirms the provenance and only then tags', async () => {
    const release = recorder();

    await publishRelease(
      [step('enmascara', 'publish')],
      release.commands,
      release.polling,
    );

    expect(release.events).toEqual([
      'publish enmascara@0.1.0',
      'provenance enmascara@0.1.0',
      'tag enmascara@0.1.0',
    ]);
  });

  it('tags a published version only after confirming its provenance', async () => {
    const release = recorder();

    await publishRelease(
      [step('enmascara', 'tag')],
      release.commands,
      release.polling,
    );

    expect(release.events).toEqual([
      'provenance enmascara@0.1.0',
      'tag enmascara@0.1.0',
    ]);
  });

  it('leaves alone the packages with nothing to do', async () => {
    const release = recorder();

    await expect(
      publishRelease(
        [step('enmascara-pino', 'none')],
        release.commands,
        release.polling,
      ),
    ).resolves.toEqual([]);
    expect(release.events).toEqual([]);
  });

  it('returns the tags it created, in order', async () => {
    const release = recorder([{ kind: 'attested' }, { kind: 'attested' }]);

    await expect(
      publishRelease(
        [
          step('enmascara', 'publish'),
          step('enmascara-pino', 'none'),
          step('enmascara-sentry', 'tag'),
        ],
        release.commands,
        release.polling,
      ),
    ).resolves.toEqual(['enmascara@0.1.0', 'enmascara-sentry@0.1.0']);
  });

  it('waits between checks until npm shows the provenance', async () => {
    const release = recorder([
      { kind: 'missing' },
      { kind: 'missing' },
      { kind: 'attested' },
    ]);

    await publishRelease(
      [step('enmascara', 'publish')],
      release.commands,
      release.polling,
    );

    expect(release.events).toEqual([
      'publish enmascara@0.1.0',
      'provenance enmascara@0.1.0',
      'wait',
      'provenance enmascara@0.1.0',
      'wait',
      'provenance enmascara@0.1.0',
      'tag enmascara@0.1.0',
    ]);
  });

  it('stops without tagging or going on when the provenance never shows', async () => {
    const release = recorder([]);

    await expect(
      publishRelease(
        [step('enmascara', 'publish'), step('enmascara-pino', 'publish')],
        release.commands,
        release.polling,
      ),
    ).rejects.toThrow(
      new MissingProvenanceError(
        'enmascara@0.1.0 has no SLSA provenance attestation after 3 checks',
      ),
    );
    expect(release.events).toEqual([
      'publish enmascara@0.1.0',
      'provenance enmascara@0.1.0',
      'wait',
      'provenance enmascara@0.1.0',
      'wait',
      'provenance enmascara@0.1.0',
    ]);
  });
});
