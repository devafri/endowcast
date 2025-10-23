const { chromium } = require('playwright');

(async ()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));

  try {
    await page.goto('http://localhost:5174/results', { waitUntil: 'networkidle' , timeout: 20000});
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
