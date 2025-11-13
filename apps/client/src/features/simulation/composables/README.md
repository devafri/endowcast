# Export Functionality

## Overview
The `useExport` composable provides functionality to export simulation results to PNG or PDF formats with optimized file sizes.

## Features
- **PDF Export**: Multi-page PDF generation for long results
- **PNG Export**: High-quality PNG with automatic compression for large images
- **Progress Tracking**: Visual feedback during export process
- **Optimized Output**: Automatic compression to keep file sizes manageable

## Usage

```typescript
import { useExport } from '@/features/simulation/composables/useExport';

const { isExporting, exportProgress, exportElement } = useExport();

// Export as PDF
await exportElement(elementRef.value, {
  filename: 'my-results',
  format: 'pdf',
  quality: 0.95,
  scale: 2
});

// Export as PNG
await exportElement(elementRef.value, {
  filename: 'my-results',
  format: 'png',
  quality: 0.92,
  scale: 2
});
```

## Options

- `filename`: Base filename (without extension)
- `format`: 'png' | 'pdf'
- `quality`: 0-1 compression quality (0.92 recommended)
- `scale`: Scaling factor for resolution (2 = 2x, recommended for retina)

## File Size Optimization

1. **Quality Setting**: Default 0.92-0.95 balances quality and size
2. **Auto Compression**: PNG images >2000px width are auto-compressed to 1920px
3. **JPEG for PDF**: PDFs use JPEG compression for smaller files
4. **Scale Control**: 2x scale provides sharp results without excessive size

## Implementation Notes

- Waits 500ms for charts to fully render before capture
- Ignores elements with `.no-export` class
- Handles multi-page PDFs for long content
- Canvas elements are given proper sizing in cloned document
