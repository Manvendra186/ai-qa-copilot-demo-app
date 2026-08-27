import crypto from 'node:crypto';
import { Router } from 'express';
import { createSession, getSession } from '../db.js';

// Single documented demo user (build bible §23 — synthetic app, no real accounts).
export const DEMO_USER = { username: 'qa', password: 'qa1234' };

export function requireAuth(db) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
    const session = token ? getSession(db, token) : undefined;
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.session = session;
    next();
  };
}

export function authRouter(db) {
  const router = Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body ?? {};
    if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    createSession(db, token, username);
    res.json({ token, username });
  });

  router.get('/me', requireAuth(db), (req, res) => {
    res.json({ username: req.session.username });
  });

  return router;
}
