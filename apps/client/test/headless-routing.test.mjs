#!/usr/bin/env node
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    // Ensure a token exists in localStorage so the app attempts token verification on startup
    await page.addInitScript(() => {
      try { localStorage.setItem('endowcast_token', 'dummy-token'); } catch (e) {}
    });

    // Intercept API calls to mock auth and simulation endpoints so the SPA behaves as if a user is signed in
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      // Simple JSON helpers
      const ok = (obj) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(obj) });

      if (url.endsWith('/auth/verify-token')) {
        return ok({ valid: true, user: { id: 'u1', firstName: 'Test', lastName: 'User', email: 'test@example.com', role: 'USER', organizationId: 'org1', emailVerified: true, createdAt: new Date().toISOString() }, organization: { id: 'org1', name: 'Test Org' }, subscription: { planType: 'FREE', status: 'active' } });
      }

      if (url.endsWith('/organization/usage') || url.endsWith('/organization/usage') || url.includes('/organization/usage')) {
        return ok({ usage: { remainingSimulations: 10, monthlySimulations: 0 }, subscription: { planType: 'FREE' } });
      }

      if (url.endsWith('/simulations') || url.includes('/simulations')) {
        return ok({ simulations: [] });
      }

      // Default fallback: return 200 empty
      return ok({});
    });

    console.log('Opening', BASE);
    await page.goto(BASE, { waitUntil: 'networkidle' });

    // Ensure header is present
    await page.waitForSelector('header', { timeout: 5000 });

  // Open Scenarios dropdown (hover) — use desktop viewport so lg menu is visible
  const header = page.locator('header');
  const scenariosBtn = header.locator('button:has-text("Scenarios")');
  await scenariosBtn.hover();
  await page.waitForTimeout(1000); // allow dropdown animation

  // Click Scenario History inside the header dropdown specifically
  const historyLink = header.locator('a:has-text("Scenario History")');
  if (!(await historyLink.count())) throw new Error('Scenario History link not found in header dropdown');
  await historyLink.first().click();
  // Wait for SPA navigation to update URL (no full page reload)
  await page.waitForFunction(() => location.pathname.includes('/simulation') || location.pathname.includes('/history'), { timeout: 5000 });

    const urlAfterHistory = page.url();
    console.log('After clicking Scenario History, url=', urlAfterHistory);
    if (!/history/.test(urlAfterHistory)) throw new Error('Did not navigate to a history URL');

    // Check that Scenarios nav button is marked active
    const scenariosBtnClass = await scenariosBtn.getAttribute('class') || '';
    console.log('Scenarios button class attribute:', scenariosBtnClass);
    if (!scenariosBtnClass.includes('nav-link-active')) {
      throw new Error('Scenarios nav button is not active after navigation');
    }

    // Find a create-simulation button on the page and click it
    const createSelectors = [
      'text=Create Your First Simulation',
      'text=Create New Simulation',
      'text=New Scenario',
      'text=Create New Scenario',
      'text=Create New Simulation'
    ];

    let clicked = false;
    for (const sel of createSelectors) {
      const locator = page.locator(sel);
      if (await locator.count()) {
        console.log('Found create button selector:', sel);
        await locator.first().click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('No create button found on history page — test ends successfully at history verification.');
      await browser.close();
      process.exit(0);
    }

    await page.waitForLoadState('networkidle');
    const urlAfterCreate = page.url();
    console.log('After clicking create, url=', urlAfterCreate);
    if (!(/\/results|\/simulation/.test(urlAfterCreate))) {
      throw new Error('Create action did not navigate to results/simulation URL');
    }

    console.log('Headless routing test succeeded');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Headless routing test failed:', err);
    await browser.close();
    process.exit(2);
  }
})();
