#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { mkdir, readFile, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collectListings } from './index.mjs';

const { values } = parseArgs({ options: {
  help: { type: 'boolean' }, scope: { type: 'string' }, out: { type: 'string' },
  'max-pages': { type: 'string' }, all: { type: 'boolean' },
  'allow-network': { type: 'boolean' }, 'delay-ms': { type: 'string' },
} });

if (values.help) {
  console.log('Usage: node cli.mjs --scope scope.json --out NEW_DIRECTORY --allow-network [--max-pages 1 | --all] [--delay-ms 1000]');
} else {
  let output;
  let file;
  let summary;
  try {
    if (!values.out || !values['allow-network']) throw new Error('--out and --allow-network are required');
    if (values.all && values['max-pages']) throw new Error('Choose --all or --max-pages');
    const scope = values.scope ? JSON.parse(await readFile(values.scope, 'utf8')) : {};
    const maxPages = values.all ? null : Number(values['max-pages'] ?? 1);
    const delayMs = Number(values['delay-ms'] ?? 1000);
    if (!Number.isSafeInteger(delayMs) || delayMs < 0 || (maxPages !== null && (!Number.isSafeInteger(maxPages) || maxPages < 1))) {
      throw new Error('Invalid --delay-ms or --max-pages');
    }
    output = path.resolve(values.out);
    await mkdir(output); // Refuse to overwrite a previous dataset.
    await mkdir(path.join(output, 'raw'));
    file = await open(path.join(output, 'listings.ndjson'), 'wx');
    summary = await collectListings({ scope, allowNetwork: true, maxPages, delayMs,
      onResponse: async response => {
        const name = `${response.role}-page-${response.page}-attempt-${response.attempt}-${response.sha256}.json`;
        await writeFile(path.join(output, 'raw', name), response.bytes, { flag: 'wx' });
      },
      onPage: async page => {
        for (const listing of page.listings) await file.writeFile(`${JSON.stringify(listing)}\n`);
        console.error(`Captured page ${page.pageNumber}/${page.metadata.lastPage}: ${page.listings.length} listings`);
      },
    });
    console.error(`${summary.status}: ${summary.rawHits} records saved to ${output}`);
    if (summary.status !== 'COMPLETE') process.exitCode = 2;
  } catch (error) {
    summary = error.summary ?? { status: 'PARTIAL', errors: [error.message] };
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await file?.close();
    if (file) await writeFile(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' });
  }
}
