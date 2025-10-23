const { chromium } = require('playwright');

(async ()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));

  try {
    page.on('requestfailed', req => logs.push({ type: 'requestfailed', url: req.url(), reason: req.failure()?.errorText }));
    await page.goto('http://localhost:5173/results', { waitUntil: 'load' , timeout: 60000});
    // Try to click a run button
    const runBtn = await page.$("button:has-text('Run Monte Carlo Analysis')");
    if (runBtn) {
      await runBtn.click();
      await page.waitForTimeout(3000);
    }
    console.log('Logs captured:', logs);
  } catch (e) {
    console.error('Playwright error', e.toString());
  } finally {
    await browser.close();
  }
})();
