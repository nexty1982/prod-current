import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/auth/login2');

  await page.locator('#username').fill(process.env.E2E_USERNAME ?? '');
  await page.locator('#password').fill(process.env.E2E_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect away from login page
  await page.waitForURL((url) => !url.pathname.includes('/auth/'), {
    timeout: 15_000,
  });

  // Confirm session cookie is set
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === 'connect.sid')).toBeTruthy();

  await page.context().storageState({ path: authFile });
});
