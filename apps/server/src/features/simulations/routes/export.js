/**
 * Export simulation results to PNG/PDF using Puppeteer
 */
const express = require('express');
const router = express.Router();

// Puppeteer would be installed as: npm install puppeteer
// For serverless, use: npm install puppeteer-core chrome-aws-lambda

router.post('/export', async (req, res) => {
  try {
    const { url, format = 'png', width = 1920, height = 1080, authToken } = req.body;

    console.log('[Export] Request received:', { url, format, width, height, hasAuthToken: !!authToken });

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Dynamically import puppeteer
    let browser;
    let puppeteer;
    
    // Try to use chrome-aws-lambda for serverless, fallback to regular puppeteer
    try {
      const chromium = require('chrome-aws-lambda');
      puppeteer = require('puppeteer-core');
      
      console.log('[Export] Using chrome-aws-lambda');
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });
    } catch (e) {
      // Fallback to regular puppeteer for local development
      console.log('[Export] Using regular puppeteer:', e.message);
      puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000
      });
    }
    
    console.log('[Export] Browser launched successfully');

    console.log('[Export] Browser launched successfully');

    const page = await browser.newPage();
    console.log('[Export] New page created');
    
    // Listen to console messages from the page for debugging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('Error') || text.includes('failed')) {
        console.log(`[Export] Browser console.${type}:`, text);
      } else if (text.includes('Export ready') || text.includes('loadScenario') || text.includes('results')) {
        console.log(`[Export] Browser console:`, text);
      }
    });
    
    // Listen to page errors
    page.on('pageerror', error => {
      console.log('[Export] Browser page error:', error.message);
    });
    
    // Set auth token as localStorage before navigating
    if (authToken) {
      await page.evaluateOnNewDocument((token) => {
        localStorage.setItem('endowcast_token', token);
      }, authToken);
      console.log('[Export] Auth token set in localStorage');
    }
    
    // Set viewport
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2, // 2x for retina
    });
    console.log('[Export] Viewport set');

    // Navigate to the URL
    console.log('[Export] Navigating to:', url);
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('[Export] Page loaded');

    // Wait for the export target to appear (max 15 seconds)
    try {
      await page.waitForSelector('[data-export-target]', { timeout: 15000 });
      console.log('[Export] Export target found');
      
      // Wait for data to be fully loaded (indicated by data-export-ready="true")
      await page.waitForFunction(
        () => {
          const target = document.querySelector('[data-export-target]');
          return target && target.getAttribute('data-export-ready') === 'true';
        },
        { timeout: 30000 }
      );
      console.log('[Export] Data marked as ready for export');
    } catch (e) {
      console.log('[Export] Export target or data not ready:', e.message);
      
      // Debug: check what the actual state is
      const debugInfo = await page.evaluate(() => {
        const target = document.querySelector('[data-export-target]');
        return {
          targetExists: !!target,
          exportReadyAttr: target ? target.getAttribute('data-export-ready') : null,
          hasCanvas: document.querySelectorAll('canvas').length,
          hasLoadingText: document.body.textContent.includes('Loading chart data'),
          bodySnippet: document.body.textContent.substring(0, 500)
        };
      });
      console.log('[Export] Debug info:', JSON.stringify(debugInfo, null, 2));
      
      // Take a screenshot to debug
      const debugScreenshot = await page.screenshot({ fullPage: true });
      console.log('[Export] Debug screenshot size:', debugScreenshot.length);
      await browser.close();
      return res.status(404).json({ 
        error: 'Export target not found or data not loaded',
        details: 'The page may require authentication or the simulation data may not have loaded from the database'
      });
    }

    // Wait for charts to render - look for actual canvas elements with content
    console.log('[Export] Waiting for charts to render...');
    try {
      await page.waitForSelector('canvas', { timeout: 10000 });
      console.log('[Export] Canvas elements found');
      
      // Wait a bit more for Chart.js animations to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('[Export] Charts should be fully rendered');
    } catch (e) {
      console.log('[Export] Warning: No canvas elements found, continuing anyway');
    }

    // Find the results container
    const element = await page.$('[data-export-target]');
    
    console.log('[Export] Export target found, generating', format);

    let buffer;
    if (format === 'pdf') {
      // Generate PDF
      buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      console.log('[Export] PDF generated, size:', buffer.length);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="simulation-results.pdf"');
    } else {
      // Generate PNG screenshot
      buffer = await element.screenshot({
        type: 'png',
        omitBackground: false,
      });
      console.log('[Export] PNG generated, size:', buffer.length);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="simulation-results.png"');
    }

    await browser.close();
    console.log('[Export] Browser closed');

    // Send the buffer
    res.send(buffer);
    console.log('[Export] Response sent successfully');

  } catch (error) {
    console.error('[Export] Error:', error);
    res.status(500).json({ 
      error: 'Failed to export results',
      message: error.message 
    });
  }
});

module.exports = router;
