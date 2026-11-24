import { describe, expect, it } from 'vitest';
import {
  RemoteTagsUnavailableError,
  readRemoteTags,
} from '../src/remote-tags.ts';
import type { RunCommand } from '../src/run-command.ts';

const LS_REMOTE = [
  'f97c8980137f7939f7fdc4bc1a88152610bac015\trefs/tags/enmascara@0.1.0',
  '0123456789abcdef0123456789abcdef01234567\trefs/tags/v1',
  '89abcdef0123456789abcdef0123456789abcdef\trefs/tags/v1^{}',
  '',
].join('\n');

describe('readRemoteTags', () => {
  it('asks git for the tags of origin', async () => {
    const calls: (readonly string[])[] = [];
    const run: RunCommand = async (command, args) => {
      calls.push([command, ...args]);
      return { kind: 'succeeded', output: '' };
    };

    await readRemoteTags(run);

    expect(calls).toEqual([['git', 'ls-remote', '--tags', 'origin']]);
  });

  it('reads every tag name once', async () => {
    const tags = await readRemoteTags(async () => ({
      kind: 'succeeded',
      output: LS_REMOTE,
    }));

    expect([...tags]).toEqual(['enmascara@0.1.0', 'v1']);
  });

  it('names its errors', () => {
    expect(new RemoteTagsUnavailableError('').name).toBe(
      'RemoteTagsUnavailableError',
    );
  });

  it('fails instead of assuming there are no tags', async () => {
    await expect(
      readRemoteTags(async () => ({
        kind: 'failed',
        output: '',
        errorOutput: 'fatal',
      })),
    ).rejects.toThrow(
      new RemoteTagsUnavailableError('git could not list the tags of origin'),
    );
  });
});
