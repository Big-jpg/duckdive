// Dependency-free local packaging when package-manager execution is unavailable.
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = path.dirname(fileURLToPath(import.meta.url));
const destination = path.resolve(source, '../../dist');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'autotrader-pack-'));
try {
  await mkdir(destination, { recursive: true });
  await mkdir(path.join(temporary, 'package'));
  for (const filename of ['package.json', 'index.mjs', 'index.d.ts', 'cli.mjs', 'README.md']) {
    await cp(path.join(source, filename), path.join(temporary, 'package', filename));
  }
  const archive = path.join(destination, 'duckdive-autotrader-client-0.1.0.tgz');
  const result = spawnSync('tar', ['-czf', archive, '-C', temporary, 'package'], { windowsHide: true, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'tar failed');
  console.log(archive);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
