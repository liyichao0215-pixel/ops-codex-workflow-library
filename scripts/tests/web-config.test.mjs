import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('write-web-config writes the configured public API base', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-web-config-'));
  const outPath = join(dir, 'config.js');

  try {
    await execFileAsync(process.execPath, ['scripts/write-web-config.mjs'], {
      env: {
        ...process.env,
        PUBLIC_API_BASE: 'https://api.example.test',
        OPS_WEB_CONFIG_PATH: outPath,
      },
    });

    const content = await readFile(outPath, 'utf8');
    assert.match(content, /window\.OPS_CONFIG/);
    assert.match(content, /https:\/\/api\.example\.test/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
