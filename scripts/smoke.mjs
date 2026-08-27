#!/usr/bin/env node
// Manual smoke for the demo app API (S0.10 exit criterion: "manual smoke passes").
// Usage: node scripts/smoke.mjs [baseUrl]   (default http://localhost:4000)
// Run against a server started WITHOUT defect flags for the happy path.

const base = (process.argv[2] || 'http://localhost:4000').replace(/\/$/, '');
let failures = 0;

function check(name, cond, detail = '') {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(base + path, {
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
    // non-JSON body
  }
  return { status: res.status, data };
}

try {
  const health = await api('/health');
  check('GET /health -> 200', health.status === 200, JSON.stringify(health.data));

  const config = await api('/api/config');
  check(
    'GET /api/config -> 200, no defects active',
    config.status === 200 && Object.values(config.data?.defects ?? {}).every((v) => v === false),
    JSON.stringify(config.data),
  );

  const products = await api('/api/products');
  check(
    'GET /api/products -> 200 with items',
    products.status === 200 && Array.isArray(products.data) && products.data.length > 0,
    `${products.data?.length} products`,
  );
  const first = products.data?.[0];

  const badLogin = await api('/api/login', { method: 'POST', body: { username: 'qa', password: 'wrong' } });
  check('POST /api/login (bad password) -> 401', badLogin.status === 401);

  const login = await api('/api/login', { method: 'POST', body: { username: 'qa', password: 'qa1234' } });
  check('POST /api/login -> 200 + token', login.status === 200 && typeof login.data?.token === 'string');
  const token = login.data?.token;

  const noAuth = await api('/api/cart');
  check('GET /api/cart (no token) -> 401', noAuth.status === 401);

  const add = await api('/api/cart/items', { method: 'POST', body: { product_id: first.id, qty: 2 }, token });
  check(
    'POST /api/cart/items -> 200, one line',
    add.status === 200 && add.data?.items?.length === 1 && add.data.items[0].qty === 2,
    JSON.stringify(add.data),
  );

  const cart = await api('/api/cart', { token });
  check(
    'GET /api/cart -> total = price x qty',
    cart.status === 200 && cart.data?.total_cents === first.price_cents * 2,
    `total_cents=${cart.data?.total_cents}`,
  );

  const checkout = await api('/api/checkout', { method: 'POST', token });
  check(
    'POST /api/checkout -> 201 + order with items',
    checkout.status === 201 && checkout.data?.items?.length === 1,
    JSON.stringify(checkout.data),
  );
  const orderId = checkout.data?.id;

  const order = await api(`/api/orders/${orderId}`, { token });
  check(
    'GET /api/orders/:id -> same order, items intact',
    order.status === 200 && order.data?.id === orderId && order.data?.items?.length === 1,
    JSON.stringify(order.data),
  );

  const emptyCart = await api('/api/cart', { token });
  check('cart cleared after checkout', emptyCart.status === 200 && emptyCart.data?.items?.length === 0);
} catch (err) {
  console.error(`FAIL  smoke crashed — ${err.message}`);
  failures += 1;
}

console.log(failures === 0 ? '\nSMOKE: all checks passed' : `\nSMOKE: ${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
