import { writeFile } from 'node:fs/promises';

const apiBase = process.env.PUBLIC_API_BASE || '';
const outPath = process.env.OPS_WEB_CONFIG_PATH || 'apps/web/config.js';

const content = `window.OPS_CONFIG = ${JSON.stringify({ apiBase }, null, 2)};\n`;

await writeFile(outPath, content, 'utf8');
console.log(`Wrote ${outPath} with apiBase=${apiBase || '(empty)'}`);
