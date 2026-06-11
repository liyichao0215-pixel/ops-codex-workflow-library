import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('render blueprint uses no-card free preview configuration', async () => {
  const blueprint = await readFile('render.yaml', 'utf8');

  assert.match(blueprint, /plan:\s*free/);
  assert.match(blueprint, /buildCommand:\s*DATA_SOURCE=sqlite node --test/);
  assert.match(blueprint, /OPS_DB_PATH[\s\S]*value:\s*\/tmp\/ops-assets\.sqlite/);
  assert.match(blueprint, /DATA_SOURCE[\s\S]*value:\s*feishu/);
  assert.match(blueprint, /FEISHU_APP_ID[\s\S]*sync:\s*false/);
  assert.match(blueprint, /FEISHU_APP_SECRET[\s\S]*sync:\s*false/);
  assert.match(blueprint, /FEISHU_BASE_APP_TOKEN[\s\S]*sync:\s*false/);
  assert.match(blueprint, /FEISHU_ASSETS_TABLE_ID[\s\S]*sync:\s*false/);
  assert.match(blueprint, /FEISHU_SUBMISSIONS_TABLE_ID[\s\S]*sync:\s*false/);
  assert.match(blueprint, /FEISHU_DUPLICATES_TABLE_ID[\s\S]*sync:\s*false/);
  assert.match(blueprint, /FEISHU_AUDIT_TABLE_ID[\s\S]*sync:\s*false/);
  assert.doesNotMatch(blueprint, /^\s*disk:/m);
  assert.doesNotMatch(blueprint, /plan:\s*starter/);
});
