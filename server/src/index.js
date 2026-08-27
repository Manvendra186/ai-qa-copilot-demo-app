import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadDefects } from './defects.js';
import { openDatabase } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4000);
const dbFile = process.env.DEMO_DB_FILE || path.resolve(here, '../data/demo.sqlite');

const defects = loadDefects();
const db = openDatabase(dbFile);
const app = createApp({ db, defects });

app.listen(port, () => {
  const active = Object.entries(defects)
    .filter(([, on]) => on)
    .map(([name]) => name);
  console.log(`demo-server listening on http://localhost:${port}`);
  console.log(`defects active: ${active.length > 0 ? active.join(', ') : '(none)'}`);
});
