import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { loadDefects } from './defects.js';
import { authRouter } from './routes/auth.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';

const FLAKY_MIN_MS = 300;
const FLAKY_RANGE_MS = 2700; // 300ms + 0..2700ms => 300ms-3000ms (build bible §23)

export function createApp({ db, defects = loadDefects() } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Public: lets the client (and smoke tooling) see which defects are active.
  // DEFECT_LOCATOR_DRIFT is applied client-side from this endpoint at runtime.
  app.get('/api/config', (req, res) => {
    res.json({ defects });
  });

  // DEFECT_FLAKY (flaky behavior): random 300ms-3s delay on API routes.
  if (defects.flaky) {
    app.use('/api', (req, res, next) => {
      const delay = FLAKY_MIN_MS + Math.floor(Math.random() * FLAKY_RANGE_MS);
      setTimeout(next, delay);
    });
  }

  app.use('/api', authRouter(db));
  app.use('/api', productsRouter(db));
  app.use('/api', cartRouter(db));
  app.use('/api', ordersRouter(db, defects));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Production: serve the built client (client/dist) with an SPA fallback.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(here, '../../client/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^(?!\/(api|health)\/).*/, (req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
