#!/usr/bin/env node
// Verifies each defect-injection flag changes behavior (S0.10 exit criterion).
// Spawns the server on :4100 with an in-memory DB, one flag at a time.
// Usage: node scripts/defect_check.mjs

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTestIds } from '../client/src/testids.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const PORT = 4100;
const BASE = `http://localhost:${PORT}`;

let failures = 0;
function check(name, cond, detail = '') {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON
  }
  return { status: res.status, data };
}

async function login() {
  const res = await api('/api/login', { method: 'POST', body: { username: 'qa', password: 'qa1234' } });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return res.data.token;
}

async function waitFor(ms = 10000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not start');
}

async function withServer(env, fn) {
  const child = spawn(process.execPath, ['server/src/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT), DEMO_DB_FILE: ':memory:', ...env },
    stdio: 'ignore',
  });
  try {
    await waitFor();
    return await fn();
  } finally {
    child.kill();
    await new Promise((r) => setTimeout(r, 200));
  }
}

try {
  // --- DEFECT_API_500 (product defect): checkout returns 500 ---
  await withServer({ DEFECT_API_500: '1' }, async () => {
    const token = await login();
    await api('/api/cart/items', { method: 'POST', body: { product_id: 1, qty: 1 }, token });
    const co = await api('/api/checkout', { method: 'POST', token });
    check('DEFECT_API_500: POST /api/checkout -> 500', co.status === 500, `status=${co.status}`);
  });

  // --- DEFECT_BAD_DATA (test data defect): orders missing line items ---
  await withServer({ DEFECT_BAD_DATA: '1' }, async () => {
    const token = await login();
    await api('/api/cart/items', { method: 'POST', body: { product_id: 1, qty: 2 }, token });
    const co = await api('/api/checkout', { method: 'POST', token });
    check(
      'DEFECT_BAD_DATA: checkout 201 but items=[]',
      co.status === 201 && Array.isArray(co.data?.items) && co.data.items.length === 0,
      JSON.stringify(co.data),
    );
    const order = await api(`/api/orders/${co.data?.id}`, { token });
    check(
      'DEFECT_BAD_DATA: GET /api/orders/:id items=[]',
      order.status === 200 && order.data?.items?.length === 0,
      JSON.stringify(order.data),
    );
  });

  // --- DEFECT_FLAKY (flaky behavior): random 300ms-3s delays ---
  await withServer({ DEFECT_FLAKY: '1' }, async () => {
    const start = Date.now();
    const res = await api('/api/products');
    const elapsed = Date.now() - start;
    check(
      'DEFECT_FLAKY: /api/products delayed >= 300ms',
      res.status === 200 && elapsed >= 300,
      `${elapsed}ms`,
    );
  });

  // --- DEFECT_LOCATOR_DRIFT (automation defect): renamed/removed test-ids ---
  await withServer({ DEFECT_LOCATOR_DRIFT: '1' }, async () => {
    const cfg = await api('/api/config');
    check(
      'DEFECT_LOCATOR_DRIFT: /api/config reports flag',
      cfg.status === 200 && cfg.data?.defects?.locator_drift === true,
      JSON.stringify(cfg.data),
    );
  });

  // Client-side mapping (pure module — same code the UI renders from):
  const base = makeTestIds(false);
  const drifted = makeTestIds(true);
  check(
    'DEFECT_LOCATOR_DRIFT: base ids present',
    base.addCart(1) === 'add-to-cart-1' && base.loginUsername === 'login-username',
  );
  check(
    'DEFECT_LOCATOR_DRIFT: drifted ids renamed/removed',
    drifted.addCart(1) === null &&
      drifted.loginUsername === 'fld-user' &&
      drifted.placeOrder === 'btn-confirm-purchase-v2' &&
      drifted.orderConfirmation === null,
  );
} catch (err) {
  console.error(`FAIL  defect_check crashed — ${err.message}`);
  failures += 1;
}

console.log(failures === 0 ? '\nDEFECTS: all checks passed' : `\nDEFECTS: ${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
