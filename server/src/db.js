import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stock INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cart_items (
  session_token TEXT NOT NULL REFERENCES sessions(token) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (session_token, product_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  session_token TEXT NOT NULL REFERENCES sessions(token),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  total_cents INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
`;

const SEED_PRODUCTS = [
  {
    name: 'Aurora Headphones',
    description: 'Wireless over-ear headphones with active noise cancellation.',
    price_cents: 12999,
    stock: 25,
  },
  {
    name: 'Keystrike Keyboard',
    description: 'Mechanical keyboard with hot-swappable switches.',
    price_cents: 8999,
    stock: 40,
  },
  {
    name: 'Glide Mouse',
    description: 'Ergonomic wireless mouse with 8 programmable buttons.',
    price_cents: 4999,
    stock: 60,
  },
  {
    name: 'Clarity Monitor 27"',
    description: '27-inch 4K IPS monitor with USB-C hub.',
    price_cents: 34999,
    stock: 12,
  },
];

export function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seed(db);
  return db;
}

function seed(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  if (count > 0) return; // idempotent
  const insert = db.prepare(
    'INSERT INTO products (name, description, price_cents, stock) VALUES (@name, @description, @price_cents, @stock)',
  );
  const tx = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  tx(SEED_PRODUCTS);
}

export function listProducts(db) {
  return db.prepare('SELECT id, name, description, price_cents, stock FROM products ORDER BY id').all();
}

export function getProduct(db, id) {
  return db.prepare('SELECT id, name, description, price_cents, stock FROM products WHERE id = ?').get(id);
}

export function createSession(db, token, username) {
  db.prepare('INSERT INTO sessions (token, username) VALUES (?, ?)').run(token, username);
}

export function getSession(db, token) {
  return db.prepare('SELECT token, username FROM sessions WHERE token = ?').get(token);
}

export function getCart(db, token) {
  const items = db
    .prepare(
      `SELECT p.id AS product_id, p.name, p.price_cents, c.qty, p.price_cents * c.qty AS line_total_cents
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.session_token = ? ORDER BY p.id`,
    )
    .all(token);
  const total_cents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  return { items, total_cents };
}

export function upsertCartItem(db, token, productId, qty) {
  db.prepare(
    `INSERT INTO cart_items (session_token, product_id, qty) VALUES (?, ?, ?)
     ON CONFLICT(session_token, product_id) DO UPDATE SET qty = excluded.qty`,
  ).run(token, productId, qty);
}

export function removeCartItem(db, token, productId) {
  db.prepare('DELETE FROM cart_items WHERE session_token = ? AND product_id = ?').run(token, productId);
}

export function clearCart(db, token) {
  db.prepare('DELETE FROM cart_items WHERE session_token = ?').run(token);
}

export function createOrder(db, token, totalCents) {
  const info = db.prepare('INSERT INTO orders (session_token, total_cents) VALUES (?, ?)').run(token, totalCents);
  return info.lastInsertRowid;
}

export function addOrderItem(db, orderId, item) {
  db.prepare(
    'INSERT INTO order_items (order_id, product_id, name, price_cents, qty) VALUES (?, ?, ?, ?, ?)',
  ).run(orderId, item.product_id, item.name, item.price_cents, item.qty);
}

export function getOrder(db, id) {
  return db.prepare('SELECT id, session_token, created_at, total_cents FROM orders WHERE id = ?').get(id);
}

export function listOrders(db, token) {
  return db.prepare('SELECT id, created_at, total_cents FROM orders WHERE session_token = ? ORDER BY id DESC').all(token);
}

export function getOrderItems(db, orderId) {
  return db
    .prepare(
      'SELECT product_id, name, price_cents, qty FROM order_items WHERE order_id = ? ORDER BY product_id',
    )
    .all(orderId);
}
