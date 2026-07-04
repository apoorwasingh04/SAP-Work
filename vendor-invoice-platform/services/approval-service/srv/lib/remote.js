'use strict';

// Service-to-service HTTP client (Node 18+ global fetch, Basic auth as "system").
const SYS_USER = process.env.SYSTEM_USER || 'system';
const SYS_PW = process.env.SYSTEM_PASSWORD || 'system-secret';

function authHeader() {
  return 'Basic ' + Buffer.from(`${SYS_USER}:${SYS_PW}`).toString('base64');
}

async function request(baseUrl, pathQuery, opts) {
  opts = opts || {};
  if (!baseUrl) throw new Error('remote base url not configured');
  const url = baseUrl.replace(/\/+$/, '') + pathQuery;
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: { authorization: authHeader(), 'content-type': 'application/json', accept: 'application/json' },
    body: opts.body != null ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error(`remote ${opts.method || 'GET'} ${url} -> ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

module.exports = { request };
