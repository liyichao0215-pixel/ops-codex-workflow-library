import { access, copyFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const dbPath = process.env.OPS_DB_PATH || 'apps/api/data/ops-assets.sqlite';
const backupDir = process.env.OPS_BACKUP_DIR || 'backups';
const dryRun = process.argv.includes('--dry-run');

function timestamp() {
  return new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, 'Z');
}

async function main() {
  await access(dbPath);
  const target = join(backupDir, `${timestamp()}-${basename(dbPath)}`);
  if (dryRun) {
    console.log(`Would back up ${dbPath} to ${target}`);
    return;
  }
  await mkdir(backupDir, { recursive: true });
  await copyFile(dbPath, target);
  console.log(`Backed up ${dbPath} to ${target}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
