import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import test from 'node:test';

const sourceRoot = new URL('../../skills/', import.meta.url);
const webRoot = new URL('../../apps/web/skills/', import.meta.url);

test('web skill mirrors match their root skill sources', async () => {
  const webEntries = await readdir(webRoot, {withFileTypes: true});
  const mirroredSkills = webEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  assert.ok(mirroredSkills.length > 0, 'expected at least one web skill mirror');

  for (const name of mirroredSkills) {
    const source = await readFile(new URL(`${name}/SKILL.md`, sourceRoot), 'utf8');
    const mirror = await readFile(new URL(`${name}/SKILL.md`, webRoot), 'utf8');
    assert.equal(mirror, source, `${name} web mirror drifted from skills/${name}/SKILL.md`);
  }
});
