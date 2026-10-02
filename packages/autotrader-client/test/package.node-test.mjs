import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

test('packaged archive imports and exposes the CLI outside the repository', async () => {
  const source = fileURLToPath(new URL('..', import.meta.url));
  const pack = spawnSync(process.execPath, [path.join(source, 'pack.mjs')], { windowsHide: true, encoding: 'utf8' });
  assert.equal(pack.status, 0, pack.stderr);
  const archive = pack.stdout.trim();
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'autotrader-package-test-'));
  try {
    const unpack = spawnSync('tar', ['-xzf', archive, '-C', temporary], { windowsHide: true, encoding: 'utf8' });
    assert.equal(unpack.status, 0, unpack.stderr);
    const packageDirectory = path.join(temporary, 'package');
    const client = await import(pathToFileURL(path.join(packageDirectory, 'index.mjs')).href);
    assert.equal(new URL(client.buildSearchUrl({}, 2)).searchParams.get('page'), '2');
    const summary = await client.collectListings({ allowNetwork: true, sleep: async () => {}, onPage: async () => {},
      transport: async () => ({ status: 200, headers: new Headers(), bytes: Buffer.from(JSON.stringify({
        current_page: 1, last_page: 1, per_page: 50, total: 1, data: [{ id: 1, custom: 'kept' }],
      })) }),
    });
    assert.equal(summary.status, 'COMPLETE');
    const manifest = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
    assert.equal(manifest.name, '@duckdive/autotrader-client');
    assert.equal(manifest.exports['.'].import, './index.mjs');
    assert.match(await readFile(path.join(packageDirectory, 'index.d.ts'), 'utf8'), /CollectionOptions/);
    const help = spawnSync(process.execPath, [path.join(packageDirectory, 'cli.mjs'), '--help'], { windowsHide: true, encoding: 'utf8' });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /Usage:/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
