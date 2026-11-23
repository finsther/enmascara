import { spawnSync } from 'node:child_process';
import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packedFileName, packedManifest } from '../src/packed-example.ts';
import type { PublishablePackage } from '../src/release-plan.ts';
import { runCommand } from '../src/run-command.ts';
import { readPublishablePackages } from '../src/workspace-packages.ts';

const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const examplesDirectory = join(repositoryDirectory, 'examples');
const workDirectory = mkdtempSync(join(tmpdir(), 'enmascara-packed-'));
const tarballsDirectory = join(workDirectory, 'tarballs');
const installedExamplesDirectory = join(workDirectory, 'examples');
const NODE_MODULES = 'node_modules';
const MANIFEST = 'package.json';
const PACKED_EXAMPLES_VARIABLE = 'ENMASCARA_PACKED_EXAMPLES';

async function succeeded(
  description: string,
  command: string,
  args: readonly string[],
  workingDirectory: string,
): Promise<string> {
  const outcome = await runCommand(command, args, { workingDirectory });
  if (outcome.kind === 'failed') {
    throw new Error(
      `${description} failed\n${outcome.output}\n${outcome.errorOutput}`,
    );
  }
  return outcome.output;
}

async function pack(
  publishable: PublishablePackage,
): Promise<readonly [string, string]> {
  const output = await succeeded(
    `npm pack of ${publishable.name}`,
    'npm',
    ['pack', '--json', '--pack-destination', tarballsDirectory],
    publishable.directory,
  );
  return [publishable.name, join(tarballsDirectory, packedFileName(output))];
}

function isNotInstalledDependency(source: string): boolean {
  return basename(source) !== NODE_MODULES;
}

function requireInstalledCopies(
  directory: string,
  packages: readonly PublishablePackage[],
): void {
  for (const { name } of packages) {
    const installed = join(directory, NODE_MODULES, name);
    if (lstatSync(installed, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new Error(`${installed} links to the workspace instead of a copy`);
    }
  }
}

async function install(
  example: string,
  tarballs: ReadonlyMap<string, string>,
  packages: readonly PublishablePackage[],
): Promise<void> {
  const source = join(examplesDirectory, example);
  const target = join(installedExamplesDirectory, example);
  cpSync(source, target, {
    recursive: true,
    filter: isNotInstalledDependency,
  });
  const manifest: Readonly<Record<string, unknown>> = JSON.parse(
    readFileSync(join(source, MANIFEST), 'utf8'),
  );
  writeFileSync(
    join(target, MANIFEST),
    JSON.stringify(packedManifest(manifest, tarballs)),
  );
  await succeeded(
    `npm install of the ${example} example`,
    'npm',
    ['install', '--no-audit', '--no-fund', '--ignore-scripts'],
    target,
  );
  requireInstalledCopies(target, packages);
  console.log(`Installed the ${example} example from the packed tarballs`);
}

async function main(): Promise<number> {
  mkdirSync(tarballsDirectory);
  const packages = readPublishablePackages(repositoryDirectory);
  const tarballs = new Map(await Promise.all(packages.map(pack)));
  for (const example of readdirSync(examplesDirectory).sort()) {
    await install(example, tarballs, packages);
  }
  const tests = spawnSync(
    'pnpm',
    ['vitest', 'run', '--project', 'enmascara-example-*'],
    {
      cwd: repositoryDirectory,
      stdio: 'inherit',
      env: {
        ...process.env,
        [PACKED_EXAMPLES_VARIABLE]: installedExamplesDirectory,
      },
    },
  );
  return tests.status ?? 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rmSync(workDirectory, { recursive: true, force: true });
}
