# ShareLink Functionality Documentation

## Overview

The EndowCast application now includes comprehensive sharelink functionality that allows users to share their complete simulation configurations via URL parameters. This works seamlessly with both localhost development and AWS production deployments.

## Features

### 🔗 Share Link Generation
- **One-Click Sharing**: Users can copy a shareable link from the Advanced settings
- **Complete State Capture**: Includes all inputs, options, portfolio weights, and configuration settings
- **URL-Safe Encoding**: Uses Base64 encoding for compact, safe URL parameters
- **Cross-Environment**: Works with localhost, S3, CloudFront, and custom domains

### 📥 Automatic Loading
- **URL Detection**: Automatically detects and loads shared scenarios from URL parameters
- **Backward Compatibility**: Supports both `?scenario=...` and legacy `?s=...` parameters
- **Clean URLs**: Removes parameters from URL after loading to avoid confusion
- **Error Handling**: Gracefully handles invalid or corrupted share data

### 🎯 User Experience
- **Toast Notifications**: Visual feedback when copying links or loading scenarios
- **Clipboard Fallback**: Multiple methods to ensure link copying works across browsers
- **Visual Indicators**: Clear success/error states with appropriate messaging

## Usage

### Sharing a Configuration

1. Set up your desired simulation parameters in the Settings view
2. Navigate to the "Advanced" tab
3. Click "Copy Shareable Link" in the Corpus & Reproducibility section
4. Share the copied URL with colleagues or save for later

### Loading a Shared Configuration

1. Click on a shared EndowCast link
2. The application automatically loads the configuration
3. A toast notification confirms successful loading
4. The URL is cleaned up after loading

## Technical Implementation

### URL Structure

```
https://your-domain.com/settings?scenario=eyJpbnB1dHMiOnsiaw...
```

### Encoded Data Structure

The `scenario` parameter contains a Base64-encoded JSON object with:

```typescript
{
  inputs: {
    initialEndowment: number,
    spendingPolicyRate: number,
    investmentExpenseRate: number,
    initialOperatingExpense: number,
    initialGrant: number,
    portfolioWeights: {...},
    grantTargets: number[]
  },
  options: {
    years: number,
    simulations: number,
    startYear: number,
    seed: number,
    spendingPolicy: {...},
    rebalancing: {...},
    corpus: {...},
    benchmark: {...},
    stress: {...},
    assets: {...},
    correlationMatrix: number[][]
  }
}
```

### Store Methods

- `encodeScenario()`: Creates a shareable URL from current state
- `decodeScenario(data)`: Loads state from encoded data
- `copyShareLink()`: Copies share link to clipboard with user feedback
- `loadScenarioFromUrl()`: Automatically loads shared scenarios on navigation

### Integration Points

- **Settings View**: Share button in Advanced tab
- **Router Integration**: Automatic loading on settings/allocation routes
- **Toast System**: User feedback and notifications
- **Environment Agnostic**: Uses `window.location.origin` for domain detection

## AWS Deployment Considerations

### Environment Variables

Ensure your `.env.production` file contains the correct API endpoint:

```bash
VITE_API_URL=https://your-api-domain.com/api
```

### CORS Configuration

Your backend API must allow your frontend domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-domain.com',
    'https://your-cloudfront-url.net'
  ]
}));
```

### URL Routing

For S3 static hosting, ensure your error document is set to `index.html` to handle client-side routing:

```bash
aws s3 website s3://your-bucket --index-document index.html --error-document index.html
```

## Security & Privacy

- **Client-Side Only**: All encoding/decoding happens in the browser
- **No Server Storage**: Share links don't store data on servers
- **URL Length Limits**: Large configurations may hit browser URL limits (~2000 characters)
- **Public URLs**: Anyone with the link can view the configuration

## Browser Compatibility

- **Modern Browsers**: Full support with Clipboard API
- **Legacy Browsers**: Automatic fallback to `execCommand`
- **Mobile Devices**: Works on iOS Safari, Chrome Mobile, etc.
- **Error Handling**: Graceful degradation if clipboard access fails

## Testing

### Development Testing

```bash
# Start development server
npm run dev

# Test sharing
1. Go to http://localhost:5173/settings
2. Configure some parameters
3. Go to Advanced tab and click "Copy Shareable Link"
4. Open the copied link in a new tab/window
```

### Production Testing

```bash
# Deploy to AWS
./deploy.sh your-bucket-name your-cloudfront-id

# Test sharing
1. Visit your production domain
2. Test the same sharing workflow
3. Verify API connectivity still works
```

## Troubleshooting

### Common Issues

1. **Link doesn't load configuration**
   - Check browser console for JavaScript errors
   - Verify the URL parameter is complete
   - Test with a fresh browser session

2. **Copy to clipboard fails**
   - Ensure HTTPS in production (required for Clipboard API)
   - Try the fallback method manually
   - Check browser permissions for clipboard access

3. **API calls fail after loading shared link**
   - Verify CORS configuration
   - Check VITE_API_URL in production environment
   - Test API endpoint directly

### Debug Mode

Enable debug mode in development:

```bash
VITE_ENABLE_DEBUG=true
```

This provides additional console logging for sharelink operations.

## Future Enhancements

- **Link Shortening**: Integration with URL shortening service
- **Encryption**: Optional encryption for sensitive configurations
- **Expiration**: Time-limited share links
- **Analytics**: Track share link usage (privacy-respecting)
- **Social Sharing**: Direct sharing to email, Slack, etc.
