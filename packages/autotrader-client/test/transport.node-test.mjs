import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { curlTransport, fetchTransport } from '../index.mjs';

test('curl and fetch transports read compressed local responses and status headers', async () => {
  const server = createServer((request, response) => {
    assert.equal(request.headers.accept, 'application/json');
    response.writeHead(429, { 'content-encoding': 'gzip', 'retry-after': '3' });
    response.end(gzipSync(Buffer.from('{"local":true}')));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/test`;
    for (const transport of [curlTransport, fetchTransport]) {
      const response = await transport(url, { timeoutMs: 1000 });
      assert.equal(response.status, 429);
      assert.equal(response.headers.get('retry-after'), '3');
      assert.equal(response.bytes.toString(), '{"local":true}');
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('CLI help and missing opt-in do not perform acquisition', () => {
  const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8', windowsHide: true });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  const denied = spawnSync(process.execPath, [cli], { encoding: 'utf8', windowsHide: true });
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /--allow-network are required/);
});
