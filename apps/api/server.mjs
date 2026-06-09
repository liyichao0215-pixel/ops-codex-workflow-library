import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { openStore } from './store.mjs';

const backendRoot = fileURLToPath(new URL('./', import.meta.url));
const siteRoot = fileURLToPath(new URL('../web/', import.meta.url));
const dbPath = process.env.OPS_DB_PATH || join(backendRoot, 'data/ops-assets.sqlite');
const port = Number(process.env.PORT || 8787);
const adminToken = process.env.ADMIN_TOKEN || '';
const allowedOrigins = new Set(
  (process.env.PUBLIC_ORIGINS ||
    'http://127.0.0.1:4174,http://localhost:4174,https://liyichao0215-pixel.github.io')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);
const requestCounts = new Map();

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
]);

function corsHeaders(req) {
  const origin = req.headers.origin || '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : [...allowedOrigins][0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  };
}

function jsonResponse(req, res, status, data) {
  res.writeHead(status, {
    ...corsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(data, null, 2));
}

function errorResponse(req, res, status, message) {
  jsonResponse(req, res, status, { error: message });
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  if (text.length > 80_000) throw new Error('payload too large');
  return JSON.parse(text);
}

function requireAdmin(req) {
  if (!adminToken) return true;
  return req.headers['x-admin-token'] === adminToken;
}

function rateLimit(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const key = `${ip}:${Math.floor(Date.now() / 60_000)}`;
  const count = (requestCounts.get(key) || 0) + 1;
  requestCounts.set(key, count);
  if (requestCounts.size > 2000) {
    for (const currentKey of requestCounts.keys()) {
      if (!currentKey.endsWith(String(Math.floor(Date.now() / 60_000)))) requestCounts.delete(currentKey);
    }
  }
  return count <= 80;
}

async function handleApi(req, res, url, store) {
  if (req.method === 'OPTIONS') {
    jsonResponse(req, res, 200, { ok: true });
    return;
  }
  if (!rateLimit(req)) {
    errorResponse(req, res, 429, 'too many requests');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    jsonResponse(req, res, 200, { ok: true, mode: 'realtime-backend', stats: store.stats() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    jsonResponse(req, res, 200, {
      stats: store.stats(),
      assets: store.listAssets(),
      submissions: store.listSubmissions(url.searchParams.get('status') || 'pending'),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/assets') {
    jsonResponse(req, res, 200, { assets: store.listAssets(), stats: store.stats() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/submissions') {
    jsonResponse(req, res, 200, {
      submissions: store.listSubmissions(url.searchParams.get('status') || 'pending'),
      stats: store.stats(),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/submissions') {
    const body = await parseBody(req);
    const submission = store.createSubmission(body);
    jsonResponse(req, res, 201, { submission, stats: store.stats() });
    return;
  }

  const reviewMatch = url.pathname.match(/^\/api\/submissions\/([^/]+)\/reviews$/);
  if (req.method === 'GET' && reviewMatch) {
    const submissionId = decodeURIComponent(reviewMatch[1]);
    jsonResponse(req, res, 200, {
      submission: store.getSubmission(submissionId),
      reviews: store.listReviews(submissionId),
      summary: store.reviewSummary(submissionId),
    });
    return;
  }
  if (req.method === 'POST' && reviewMatch) {
    const submissionId = decodeURIComponent(reviewMatch[1]);
    const review = store.createReview(submissionId, await parseBody(req));
    jsonResponse(req, res, 201, {
      review,
      summary: store.reviewSummary(submissionId),
    });
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/submissions\/([^/]+)\/(approve|reject|request-changes)$/);
  if (req.method === 'POST' && statusMatch) {
    if (!requireAdmin(req)) {
      errorResponse(req, res, 401, 'admin token required');
      return;
    }
    const submissionId = decodeURIComponent(statusMatch[1]);
    const action = statusMatch[2];
    if (action === 'approve') {
      const asset = store.approveSubmission(submissionId, await parseBody(req));
      jsonResponse(req, res, 200, { asset, submission: store.getSubmission(submissionId), stats: store.stats() });
      return;
    }
    const status = action === 'reject' ? 'rejected' : 'request_changes';
    jsonResponse(req, res, 200, { submission: store.setSubmissionStatus(submissionId, status), stats: store.stats() });
    return;
  }

  errorResponse(req, res, 404, 'api route not found');
}

async function serveStatic(req, res, url) {
  const rawPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(siteRoot, safePath);
  if (!filePath.startsWith(siteRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes.get(extname(filePath)) || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

export async function createApp(options = {}) {
  const store = await openStore(options.dbPath || dbPath);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    try {
      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url, store);
        return;
      }
      await serveStatic(req, res, url);
    } catch (error) {
      errorResponse(req, res, 500, error.message);
    }
  });
  server.store = store;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await createApp();
  server.listen(port, () => {
    console.log(`Ops Codex realtime backend: http://127.0.0.1:${port}`);
    console.log(`Database: ${dbPath}`);
    if (!adminToken) console.log('ADMIN_TOKEN is not set; approval endpoints are open for local testing.');
  });
}
