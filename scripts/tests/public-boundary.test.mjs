import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const forbidden = ['/' + 'Users/', 'flova-team' + '.feishu.cn'];

test('tracked public files do not contain private machine paths or team links', async () => {
  const files = execFileSync('git', ['ls-files', '-z'])
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  const violations = [];

  for (const file of files) {
    const contents = await readFile(file);
    if (contents.includes(0)) continue;
    const text = contents.toString('utf8');
    for (const marker of forbidden) {
      if (text.includes(marker)) violations.push(`${file}: ${marker}`);
    }
  }

  assert.deepEqual(violations, [], `public-boundary violations:\n${violations.join('\n')}`);
});
