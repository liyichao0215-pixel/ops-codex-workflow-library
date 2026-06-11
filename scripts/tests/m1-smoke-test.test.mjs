import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

import { createApp } from '../../apps/api/server.mjs';

const execFileAsync = promisify(execFile);

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

test('m1 smoke test verifies homepage, health, bootstrap, and seed assets', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-m1-smoke-'));
  const server = await createApp({ dbPath: join(dir, 'ops-assets.sqlite'), env: { ...process.env, DATA_SOURCE: 'sqlite' } });
  const port = await listen(server);

  try {
    const { stdout } = await execFileAsync(process.execPath, ['scripts/m1-smoke-test.mjs', `http://127.0.0.1:${port}`]);

    assert.match(stdout, /homepage ok/);
    assert.match(stdout, /health ok/);
    assert.match(stdout, /bootstrap ok/);
    assert.match(stdout, /approved assets: [1-9]\d*/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    server.store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
