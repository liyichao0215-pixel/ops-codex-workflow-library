import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      reject(new Error(`server did not start\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, 1500);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
      if (stdout.includes('Ops Codex realtime backend')) {
        clearTimeout(timer);
        resolve(stdout);
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early with ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    });
  });
}

test('server CLI starts when launched from a path with non-ascii characters', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-server-'));
  const child = spawn(process.execPath, ['apps/api/server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '18978',
      ADMIN_TOKEN: 'test-admin',
      DATA_SOURCE: 'sqlite',
      OPS_DB_PATH: join(dir, 'ops-assets.sqlite'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const stdout = await waitForServer(child);
    assert.match(stdout, /http:\/\/127\.0\.0\.1:18978/);
  } finally {
    child.kill('SIGTERM');
    await rm(dir, { recursive: true, force: true });
  }
});
