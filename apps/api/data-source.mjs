import { openFeishuStore } from './feishu/store.mjs';
import { openStore } from './store.mjs';

function hasFeishuConfig(env = {}) {
  return Boolean(
    env.FEISHU_BASE_APP_TOKEN &&
      env.FEISHU_ASSETS_TABLE_ID &&
      env.FEISHU_SUBMISSIONS_TABLE_ID &&
      env.FEISHU_AUDIT_TABLE_ID,
  );
}

export async function openDataSource(options = {}) {
  const env = options.env || process.env;
  if (env.DATA_SOURCE === 'feishu' && hasFeishuConfig(env)) {
    return openFeishuStore({
      env,
      client: options.feishuClient,
      tableIds: {
        assets: env.FEISHU_ASSETS_TABLE_ID,
        submissions: env.FEISHU_SUBMISSIONS_TABLE_ID,
        audit: env.FEISHU_AUDIT_TABLE_ID,
      },
    });
  }
  const store = await openStore(options.dbPath);
  store.dataSource = 'sqlite';
  return store;
}
