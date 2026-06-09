import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function runScript(scriptPath, dbPath, args = []) {
  try {
    await execFileAsync(process.execPath, [scriptPath, ...args], {
      env: {
        ...process.env,
        OPS_DB_PATH: dbPath,
      },
    });
    return { code: 0, stderr: '' };
  } catch (error) {
    return {
      code: error.code,
      stderr: error.stderr || '',
    };
  }
}

test('backup script explains when the SQLite database has not been created yet', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-scripts-'));
  const missingDb = join(dir, 'missing.sqlite');

  try {
    const result = await runScript('scripts/backup-sqlite.mjs', missingDb, ['--dry-run']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Database not found/);
    assert.match(result.stderr, /start the API server first/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('export script explains when the SQLite database has not been created yet', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-codex-scripts-'));
  const missingDb = join(dir, 'missing.sqlite');

  try {
    const result = await runScript('scripts/export-assets.mjs', missingDb);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Database not found/);
    assert.match(result.stderr, /start the API server first/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
