import { appendFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createNpmRegistry } from '../src/npm-registry.ts';
import { createNpmReleaseCommands } from '../src/npm-release-commands.ts';
import { publishRelease } from '../src/publish-release.ts';
import { planRelease, type ReleaseStep } from '../src/release-plan.ts';
import { readRemoteTags } from '../src/remote-tags.ts';
import { runCommand } from '../src/run-command.ts';
import { readPublishablePackages } from '../src/workspace-packages.ts';

const PROVENANCE_CHECKS = 30;
const SECONDS_BETWEEN_CHECKS = 10;
const MILLISECONDS_PER_SECOND = 1000;
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} must be set to publish`);
  }
  return value;
}

async function currentPlan(): Promise<readonly ReleaseStep[]> {
  const steps = await planRelease(
    readPublishablePackages(repositoryDirectory),
    createNpmRegistry(runCommand),
    await readRemoteTags(runCommand),
  );
  for (const { tag, action } of steps) {
    console.log(`${tag}: ${action}`);
  }
  return steps;
}

async function plan(): Promise<void> {
  const steps = await currentPlan();
  const pending = steps.some(({ action }) => action !== 'none');
  const { GITHUB_OUTPUT: outputFile } = process.env;
  if (outputFile !== undefined) {
    appendFileSync(outputFile, `pending=${pending}\n`);
  }
}

async function publish(): Promise<void> {
  const commands = createNpmReleaseCommands(runCommand, {
    repository: requiredEnvironment('GITHUB_REPOSITORY'),
    commit: requiredEnvironment('GITHUB_SHA'),
  });
  const tags = await publishRelease(await currentPlan(), commands, {
    attempts: PROVENANCE_CHECKS,
    wait: () => delay(SECONDS_BETWEEN_CHECKS * MILLISECONDS_PER_SECOND),
  });
  for (const tag of tags) {
    console.log(`Released ${tag} with SLSA provenance`);
  }
}

const COMMANDS: Readonly<Record<string, () => Promise<void>>> = {
  plan,
  publish,
};

const [commandName = ''] = process.argv.slice(2);
const command = Object.hasOwn(COMMANDS, commandName)
  ? COMMANDS[commandName]
  : undefined;

if (command === undefined) {
  console.error('Usage: node tools/release/scripts/release.ts plan|publish');
  process.exitCode = 1;
} else {
  try {
    await command();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    if (error instanceof Error && 'output' in error) {
      console.error(error.output);
    }
    process.exitCode = 1;
  }
}
