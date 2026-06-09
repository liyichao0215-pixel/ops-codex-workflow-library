const rawBaseUrl = process.argv[2] || process.env.M1_BASE_URL || '';

if (!rawBaseUrl) {
  console.error('Usage: node scripts/m1-smoke-test.mjs https://your-m1-site.example');
  process.exit(1);
}

const baseUrl = rawBaseUrl.replace(/\/+$/, '');

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} failed with ${response.status}: ${text.slice(0, 200)}`);
  return text;
}

async function fetchJson(path) {
  const text = await fetchText(path);
  return JSON.parse(text);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const homepage = await fetchText('/');
  assert(homepage.includes('Codex 工作流资产库'), 'homepage missing product title');
  assert(homepage.includes('投稿 1 条'), 'homepage missing M1 trial task card');
  console.log('homepage ok');

  const health = await fetchJson('/api/health');
  assert(health.ok === true, 'health endpoint did not return ok=true');
  assert(health.stats && Number.isInteger(health.stats.approvedAssets), 'health endpoint missing stats');
  console.log('health ok');

  const bootstrap = await fetchJson('/api/bootstrap');
  const approvedAssets = Array.isArray(bootstrap.assets) ? bootstrap.assets.length : 0;
  assert(approvedAssets >= 10, `expected at least 10 approved assets, got ${approvedAssets}`);
  assert(Array.isArray(bootstrap.submissions), 'bootstrap missing submissions array');
  console.log('bootstrap ok');
  console.log(`approved assets: ${approvedAssets}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
