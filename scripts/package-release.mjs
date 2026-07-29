import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const packageManagerScript = process.env.npm_execpath;
if (!packageManagerScript) {
  throw new Error('Run this script through pnpm.');
}

const build = spawnSync(process.execPath, [packageManagerScript, 'build'], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolute, relative)));
    } else if (entry.isFile()) {
      files.push({ relative, absolute });
    }
  }
  return files;
}

const fixedTime = new Date('1980-01-01T00:00:00.000Z');
const zipEntries = {};
for (const file of await listFiles(path.join(root, 'dist'))) {
  zipEntries[`dataskein-${version}/${file.relative}`] = [
    new Uint8Array(await readFile(file.absolute)),
    { mtime: fixedTime },
  ];
}
for (const name of ['LICENSE', 'README.md']) {
  zipEntries[`dataskein-${version}/${name}`] = [
    new Uint8Array(await readFile(path.join(root, name))),
    { mtime: fixedTime },
  ];
}

const archive = zipSync(zipEntries, { level: 9 });
const artifactDirectory = path.join(root, 'artifacts');
const filename = `dataskein-v${version}-static.zip`;
await mkdir(artifactDirectory, { recursive: true });
await writeFile(path.join(artifactDirectory, filename), archive);

const digest = createHash('sha256').update(archive).digest('hex');
await writeFile(
  path.join(artifactDirectory, `${filename}.sha256`),
  `${digest}  ${filename}\n`,
  'utf8',
);

console.log(`Created artifacts/${filename}`);
console.log(`SHA-256 ${digest}`);
