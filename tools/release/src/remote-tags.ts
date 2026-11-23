import type { RunCommand } from './run-command.ts';

export class RemoteTagsUnavailableError extends Error {
  override readonly name = 'RemoteTagsUnavailableError';
}

const TAG_REFERENCE = /^[0-9a-f]+\trefs\/tags\/(.+?)(?:\^\{\})?$/;

function tagNamesIn(output: string): ReadonlySet<string> {
  return new Set(
    output
      .split('\n')
      .map((line) => TAG_REFERENCE.exec(line)?.[1])
      .filter((tag) => tag !== undefined),
  );
}

export async function readRemoteTags(
  run: RunCommand,
): Promise<ReadonlySet<string>> {
  const outcome = await run('git', ['ls-remote', '--tags', 'origin']);
  if (outcome.kind === 'failed') {
    throw new RemoteTagsUnavailableError(
      'git could not list the tags of origin',
    );
  }
  return tagNamesIn(outcome.output);
}
