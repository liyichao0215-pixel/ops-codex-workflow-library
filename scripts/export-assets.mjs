import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = process.env.OPS_DB_PATH || 'apps/api/data/ops-assets.sqlite';
const outPath = process.env.OPS_EXPORT_PATH || 'exports/assets.json';

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToAsset(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    role: row.role,
    assetType: row.asset_type,
    primaryCategory: row.primary_category,
    summary: row.summary,
    tools: parseJson(row.tools_json, []),
    tasks: parseJson(row.tasks_json, []),
    inputs: parseJson(row.inputs_json, []),
    outcomes: parseJson(row.outcomes_json, []),
    workflow: parseJson(row.workflow_json, []),
    painPoints: parseJson(row.pain_points_json, []),
    boundary: row.boundary,
    owner: row.owner,
    sourceSubmissionId: row.source_submission_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const rows = db
  .prepare("SELECT * FROM assets WHERE status = 'approved' ORDER BY updated_at DESC, title ASC")
  .all();
db.close();

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(rows.map(rowToAsset), null, 2)}\n`, 'utf8');
console.log(`Exported ${rows.length} approved assets to ${outPath}`);
