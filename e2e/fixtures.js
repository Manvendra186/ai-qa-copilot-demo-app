// §15 console + network capture for the demo app under test.
//
// Playwright does not ship console/network logs as first-class artifacts,
// so this auto fixture collects them and writes them to the per-test output
// dir as JSONL (console.jsonl / network.jsonl). The AI QA Copilot execution
// worker (packages/execution) picks these files up from the per-test output
// dir and stores them under the §31.11 layout `runs/{run_id}/{test_id}/{name}`.

import { test as base } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export const test = base.extend({
  capture: [
    async ({ page }, use, testInfo) => {
      const consoleLines = [];
      const networkLines = [];

      page.on('console', (msg) => {
        consoleLines.push(JSON.stringify({ kind: 'console', level: msg.type(), text: msg.text() }));
      });
      page.on('request', (req) => {
        networkLines.push(JSON.stringify({ kind: 'request', method: req.method(), url: req.url() }));
      });
      page.on('response', (res) => {
        networkLines.push(JSON.stringify({ kind: 'response', status: res.status(), url: res.url() }));
      });

      await use();

      // Teardown: flush the captured streams to the per-test output dir.
      mkdirSync(testInfo.outputDir, { recursive: true });
      if (consoleLines.length > 0) {
        appendFileSync(path.join(testInfo.outputDir, 'console.jsonl'), consoleLines.join('\n') + '\n');
      }
      if (networkLines.length > 0) {
        appendFileSync(path.join(testInfo.outputDir, 'network.jsonl'), networkLines.join('\n') + '\n');
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
