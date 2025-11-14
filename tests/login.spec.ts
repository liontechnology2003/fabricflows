
import { test, expect } from '@playwright/test';

test('login test', async ({ page }) => {
  await page.goto('http://localhost:9002/login');

  await page.fill('input[name="email"]', 'john.doe@example.com');
  await page.fill('input[name="password"]', 'password123');

  await page.click('button[type="submit"]');

  await page.waitForNavigation();

  expect(page.url()).toBe('http://localhost:9002/');
});
