# Server-Side Export with Puppeteer

This feature uses Puppeteer to generate high-quality PNG/PDF exports of simulation results with perfect CSS rendering.

## Benefits over Client-Side Export

- ✅ **Perfect Layout**: Flexbox, Grid, and all CSS features render correctly
- ✅ **Font Support**: Google Fonts and custom fonts work properly
- ✅ **No CORS Issues**: Server can access all resources
- ✅ **Modern CSS**: Full support for `oklch()` colors and other CSS4 features
- ✅ **Consistent Output**: Same rendering across all browsers

## Setup Instructions

### Local Development

1. Install Puppeteer:
```bash
cd apps/server
npm install puppeteer
```

2. The export endpoint is already configured at `/api/simulations/export`

3. Test the export:
   - Run a simulation
   - Click the "Export PNG" or "Export PDF" button
   - The server will use Puppeteer to render and return the file

### Production (Serverless - AWS Lambda / Vercel)

For serverless environments, use `chrome-aws-lambda`:

```bash
npm install puppeteer-core chrome-aws-lambda
```

The code in `export.js` automatically detects the environment and uses the appropriate Chromium binary.

### Docker Deployment

If deploying with Docker, ensure Chrome dependencies are installed:

```dockerfile
RUN apt-get update && apt-get install -y \\
    chromium \\
    chromium-sandbox \\
    fonts-liberation \\
    libasound2 \\
    libatk-bridge2.0-0 \\
    libatk1.0-0 \\
    libatspi2.0-0 \\
    libcups2 \\
    libdbus-1-3 \\
    libgbm1 \\
    libgtk-3-0 \\
    libnspr4 \\
    libnss3 \\
    libxcomposite1 \\
    libxdamage1 \\
    libxfixes3 \\
    libxrandr2 \\
    xdg-utils
```

## Usage

### Client-Side

The export composable (`useExport.ts`) now defaults to server-side rendering:

```typescript
await exportElement(resultsContainer.value, {
  filename: 'my-simulation',
  format: 'png', // or 'pdf'
  useServerSide: true // default
});
```

To fallback to client-side (html-to-image):

```typescript
await exportElement(resultsContainer.value, {
  format: 'png',
  useServerSide: false
});
```

### API Endpoint

**POST** `/api/simulations/export`

Request body:
```json
{
  "url": "https://endowcast.com/results/abc123",
  "format": "png",
  "width": 1920,
  "height": 1080
}
```

Response: Binary PNG or PDF file

## Troubleshooting

### "Failed to launch Chrome"

- **Local**: Install Puppeteer: `npm install puppeteer`
- **Production**: Use `chrome-aws-lambda` for serverless
- **Docker**: Install Chrome dependencies (see above)

### Timeout Errors

Increase the timeout in `export.js`:

```javascript
await page.goto(url, {
  waitUntil: 'networkidle0',
  timeout: 60000 // 60 seconds
});
```

### Missing Fonts

Fonts are embedded automatically from Google Fonts. For custom fonts, ensure they're loaded in the page before export.

## Performance

- **PNG Export**: ~2-5 seconds
- **PDF Export**: ~3-7 seconds
- **File Size**: 
  - PNG: 1-3 MB (vs 1.6 MB client-side)
  - PDF: 2-5 MB (vs 51 MB client-side)

## Cost Considerations

Server-side rendering requires more server resources:
- Use caching for frequently accessed results
- Consider client-side as fallback for free tier users
- Monitor Lambda/Cloud Function execution time and costs
