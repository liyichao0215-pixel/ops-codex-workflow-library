function assertOk(payload, context) {
  if (!payload || payload.code !== 0) {
    const message = payload?.msg || payload?.message || 'unknown Feishu API error';
    throw new Error(`${context}: ${message}`);
  }
}

async function parseJsonResponse(response, context) {
  if (!response.ok) throw new Error(`${context}: HTTP ${response.status}`);
  return response.json();
}

export function createFeishuClient(options = {}) {
  const apiBase = options.apiBase || 'https://open.feishu.cn/open-apis';
  const fetchImpl = options.fetchImpl || fetch;
  const appId = options.appId || process.env.FEISHU_APP_ID;
  const appSecret = options.appSecret || process.env.FEISHU_APP_SECRET;
  const appToken = options.appToken || process.env.FEISHU_BASE_APP_TOKEN;
  let tokenCache = null;

  async function tenantToken() {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
    if (!appId || !appSecret) throw new Error('Feishu app credentials are missing');
    const response = await fetchImpl(`${apiBase}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const payload = await parseJsonResponse(response, 'Feishu tenant token');
    assertOk(payload, 'Feishu tenant token');
    tokenCache = { value: payload.tenant_access_token, expiresAt: Date.now() + 100 * 60_000 };
    return tokenCache.value;
  }

  async function request(path, options = {}) {
    if (!appToken) throw new Error('FEISHU_BASE_APP_TOKEN is missing');
    const token = await tenantToken();
    const response = await fetchImpl(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await parseJsonResponse(response, `Feishu request ${path}`);
    assertOk(payload, `Feishu request ${path}`);
    return payload.data || {};
  }

  return {
    async listRecords(tableId) {
      const records = [];
      let pageToken = '';
      do {
        const suffix = pageToken ? `?page_token=${encodeURIComponent(pageToken)}` : '';
        const data = await request(`/bitable/v1/apps/${appToken}/tables/${tableId}/records${suffix}`, { method: 'GET' });
        records.push(...(data.items || []));
        pageToken = data.has_more ? data.page_token || '' : '';
      } while (pageToken);
      return records;
    },

    async createRecord(tableId, fields) {
      const data = await request(`/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      return data.record;
    },

    async updateRecord(tableId, recordId, fields) {
      const data = await request(`/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify({ fields }),
      });
      return data.record;
    },
  };
}
