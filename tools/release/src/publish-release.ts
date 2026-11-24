import type { ReleaseStep } from './release-plan.ts';

export type ProvenanceRecord =
  | { readonly kind: 'attested' }
  | { readonly kind: 'missing' };

export interface ReleaseCommands {
  publish(step: ReleaseStep): Promise<void>;
  provenance(step: ReleaseStep): Promise<ProvenanceRecord>;
  tag(step: ReleaseStep): Promise<void>;
}

export interface ProvenancePolling {
  readonly attempts: number;
  wait(): Promise<void>;
}

export class MissingProvenanceError extends Error {
  override readonly name = 'MissingProvenanceError';
}

async function isAttested(
  step: ReleaseStep,
  commands: ReleaseCommands,
  polling: ProvenancePolling,
): Promise<boolean> {
  for (let attempt = 1; attempt <= polling.attempts; attempt += 1) {
    const record = await commands.provenance(step);
    if (record.kind === 'attested') {
      return true;
    }
    if (attempt < polling.attempts) {
      await polling.wait();
    }
  }
  return false;
}

async function release(
  step: ReleaseStep,
  commands: ReleaseCommands,
  polling: ProvenancePolling,
): Promise<void> {
  if (step.action === 'publish') {
    await commands.publish(step);
  }
  if (!(await isAttested(step, commands, polling))) {
    throw new MissingProvenanceError(
      `${step.tag} has no SLSA provenance attestation after ${polling.attempts} checks`,
    );
  }
  await commands.tag(step);
}

export async function publishRelease(
  steps: readonly ReleaseStep[],
  commands: ReleaseCommands,
  polling: ProvenancePolling,
): Promise<readonly string[]> {
  const created: string[] = [];
  for (const step of steps.filter(({ action }) => action !== 'none')) {
    await release(step, commands, polling);
    created.push(step.tag);
  }
  return created;
}
