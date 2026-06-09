import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('render blueprint uses no-card free preview configuration', async () => {
  const blueprint = await readFile('render.yaml', 'utf8');

  assert.match(blueprint, /plan:\s*free/);
  assert.match(blueprint, /OPS_DB_PATH[\s\S]*value:\s*\/tmp\/ops-assets\.sqlite/);
  assert.doesNotMatch(blueprint, /^\s*disk:/m);
  assert.doesNotMatch(blueprint, /plan:\s*starter/);
});
