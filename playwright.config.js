// Playwright config for the demo app under test (build bible §23, §15, §31.11).
//
// The AI QA Copilot execution worker (ai-qa-copilot/packages/execution) runs
// `playwright test --reporter=json` in this directory and stores the §15
// artifact set into its artifact store. This config's job is to PRODUCE
// those artifacts for every test:
//
//   - trace: 'on'       → trace.zip      (S3.1: full capture so the exit
//   - video: 'on'         criterion "1 test → all artifacts stored" holds
//   - screenshot: 'on'    for a *passing* run; §31.11 retain-on-failure is
//                         the production tuning knob)
//   - e2e/fixtures.js   → console.jsonl + network.jsonl per test
//
// The worker never relies on Playwright's own output location: it re-stores
// everything under `runs/{run_id}/{test_id}/{name}` (build bible §31.11).

import { defineConfig } from '@playwright/test';

// §15 v1.1: app under test reached via APP_UNDER_TEST (compose service URL
// in the full stack); defaults to the local vite dev server.
const APP_UNDER_TEST = process.env.APP_UNDER_TEST || 'http://localhost:5174';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  workers: 1, // one browser at a time against one SQLite demo DB
  use: {
    baseURL: APP_UNDER_TEST,
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    // Keep per-test output where the worker expects it (default).
  },
  webServer: [
    {
      command: 'pnpm --filter demo-server start',
      url: 'http://localhost:4000/health',
      reuseExistingServer: true, // dev `pnpm dev` already up? reuse it
      timeout: 30_000,
    },
    {
      command: 'pnpm --filter demo-client dev',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
