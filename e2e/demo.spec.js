// S3.1 demo test (build bible §23): the execution worker's end-to-end target.
//
// Sign in with the documented demo user (qa / qa1234), land on the product
// catalog, and add the first in-stock product to the cart. With no defect
// flags active (the default .env) this passes and produces the full §15
// artifact set: trace.zip, video.webm, screenshot.png, console.jsonl,
// network.jsonl — which the worker then stores under the §31.11 layout.
//
// Flip DEFECT_* flags in .env to exercise the failure path (S3.3+).

import { expect, test } from './fixtures.js';

test.describe('login + products', () => {
  test('signs in and sees the product catalog', async ({ page }) => {
    await page.goto('/login');

    // The username field ships pre-filled; set both explicitly (deterministic).
    await page.getByTestId('login-username').fill('qa');
    await page.getByTestId('login-password').fill('qa1234');
    await page.getByTestId('login-submit').click();

    // Login stores the token and navigates to /products, where the catalog
    // loads from the API.
    await page.waitForURL('**/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    const cards = page.locator('article.card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    // All seeded products are in stock (server/src/db.js); add the first one.
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await expect(page.locator('p.ok')).toBeVisible();
  });
});
