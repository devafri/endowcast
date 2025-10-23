#!/usr/bin/env node
const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.createContext();
  const page = await context.newPage();
  
  // Capture all console messages
  const consoleLogs = [];
  page.on('console', (msg) => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      args: msg.args().length,
    };
    consoleLogs.push(logEntry);
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  
  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
    console.error(`[PAGE ERROR] ${err.message}`);
    console.error(err.stack);
  });
  
  // Capture uncaught exceptions
  page.on('uncaughtexception', (err) => {
    console.error(`[UNCAUGHT] ${err.message}`);
    console.error(err.stack);
  });
  
  // Capture network requests
  page.on('requestfailed', (request) => {
    console.error(`[NETWORK FAILED] ${request.method()} ${request.url()}`);
  });
  
  // Navigate to the app
  console.log('\n🌐 Opening http://localhost:5173/...\n');
  
  try {
    const response = await page.goto('http://localhost:5173/', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    
    console.log(`\n✓ Page loaded with status: ${response.status()}\n`);
  } catch (err) {
    console.error(`\n✗ Failed to load page: ${err.message}\n`);
  }
  
  // Wait a bit for async operations
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check the DOM
  const appDiv = await page.$('#app');
  if (appDiv) {
    const innerHTML = await appDiv.innerHTML();
    console.log(`\n📄 #app DOM content length: ${innerHTML.length} chars`);
    if (innerHTML.length < 500) {
      console.log('Content:', innerHTML.substring(0, 200));
    }
  } else {
    console.error('\n✗ #app element not found in DOM');
  }
  
  // Print collected logs
  console.log('\n📋 Console logs captured:');
  consoleLogs.forEach((log, i) => {
    console.log(`  ${i + 1}. [${log.type}] ${log.text}`);
  });
  
  if (pageErrors.length > 0) {
    console.log('\n❌ Page errors:');
    pageErrors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }
  
  // Try to find the Login button (if app initialized)
  const loginButton = await page.$('button:has-text("Login")');
  if (loginButton) {
    console.log('\n✓ Found Login button - app appears to be rendering');
  } else {
    console.log('\n✗ Login button not found - app may not be fully initialized');
  }
  
  await browser.close();
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
