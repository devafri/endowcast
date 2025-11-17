import { ref } from 'vue';

const FONT_FILES = [
  {
    id: 'source-sans-3-normal',
    url: '/fonts/SourceSans3-VariableFont_wght.woff2',
    style: 'normal' as const,
  },
  {
    id: 'source-sans-3-italic',
    url: '/fonts/SourceSans3-Italic-VariableFont_wght.woff2',
    style: 'italic' as const,
  },
];

const fontDataUrlCache = new Map<string, string>();
let fontEmbedCssPromise: Promise<string> | null = null;
let fontEmbedCssCache: string | null = null;

async function bufferToDataUrl(buffer: ArrayBuffer, mime = 'font/woff2') {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${mime};base64,${base64}`;
}

async function getFontDataUrl(fontPath: string) {
  if (fontDataUrlCache.has(fontPath)) {
    return fontDataUrlCache.get(fontPath)!;
  }
  const response = await fetch(fontPath);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${fontPath}`);
  }
  const buffer = await response.arrayBuffer();
  const dataUrl = await bufferToDataUrl(buffer);
  fontDataUrlCache.set(fontPath, dataUrl);
  return dataUrl;
}

async function getFontEmbedCSS() {
  if (fontEmbedCssCache) {
    return fontEmbedCssCache;
  }
  if (fontEmbedCssPromise) {
    return fontEmbedCssPromise;
  }

  fontEmbedCssPromise = (async () => {
    const rules: string[] = [];
    for (const font of FONT_FILES) {
      try {
        const dataUrl = await getFontDataUrl(font.url);
        rules.push(`@font-face {\n  font-family: "Source Sans 3";\n  font-style: ${font.style};\n  font-weight: 200 900;\n  font-display: swap;\n  src: url('${dataUrl}') format('woff2-variations');\n}`);
      } catch (error) {
        console.error('[export] Failed to build font data URL', font.url, error);
      }
    }
    fontEmbedCssCache = rules.join('\n');
    return fontEmbedCssCache;
  })();

  return fontEmbedCssPromise;
}

export interface ExportOptions {
  filename?: string;
  format?: 'png' | 'pdf';
  quality?: number; // 0-1 for compression
  scale?: number; // Scaling factor for resolution
  useServerSide?: boolean; // Use server-side rendering with Puppeteer
}

export function useExport() {
  const isExporting = ref(false);
  const exportProgress = ref(0);

  // Separate state per format so only the clicked button shows progress
  const isExportingPng = ref(false);
  const isExportingPdf = ref(false);
  const pngProgress = ref(0);
  const pdfProgress = ref(0);

  function setPerFormatProgress(format: 'png' | 'pdf', value: number) {
    if (format === 'png') {
      pngProgress.value = value;
    } else {
      pdfProgress.value = value;
    }
    // Keep legacy aggregate for existing bindings
    exportProgress.value = Math.max(pngProgress.value, pdfProgress.value, value);
  }

  function beginFormat(format: 'png' | 'pdf') {
    if (format === 'png') {
      isExportingPng.value = true;
      pngProgress.value = 0;
    } else {
      isExportingPdf.value = true;
      pdfProgress.value = 0;
    }
    isExporting.value = true;
    exportProgress.value = 0;
  }

  function endFormat(format: 'png' | 'pdf') {
    if (format === 'png') {
      isExportingPng.value = false;
      pngProgress.value = 0;
    } else {
      isExportingPdf.value = false;
      pdfProgress.value = 0;
    }
    // Update aggregate exporter flag
    isExporting.value = isExportingPng.value || isExportingPdf.value;
    exportProgress.value = Math.max(pngProgress.value, pdfProgress.value);
  }

  /**
   * Export an HTML element to PNG or PDF
   */
  async function exportElement(
    element: HTMLElement,
    options: ExportOptions = {}
  ): Promise<void> {
  const {
    filename = `endowcast-results-${new Date().toISOString().split('T')[0]}`,
    format = 'pdf',
    useServerSide = false, // Default to client-side since server can't access simulation arrays from database
  } = options;    
    beginFormat(format);

    try {
      if (useServerSide) {
        // Server-side export using Puppeteer
        setPerFormatProgress(format, 20);
        
        const currentUrl = window.location.href;
        
        // Get auth token from localStorage to pass to Puppeteer
        const token = localStorage.getItem('endowcast_token');
        
        const response = await fetch('/api/simulations/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            url: currentUrl,
            format,
            width: 1920,
            height: Math.max(element.scrollHeight, 1080),
            authToken: token // Pass token so Puppeteer can authenticate
          })
        });

        setPerFormatProgress(format, 80);

        if (!response.ok) {
          throw new Error('Server-side export failed');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        downloadFile(url, `${filename}.${format}`);
        URL.revokeObjectURL(url);
        
        setPerFormatProgress(format, 100);
      } else {
        // Client-side export (fallback)
        await clientSideExport(element, { filename, format, ...options });
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export results. Please try again.');
    } finally {
      // Reset state after a brief delay
      setTimeout(() => {
        endFormat(format);
      }, 1000);
    }
  }

  /**
   * Client-side export using html-to-image (fallback)
   */
  async function clientSideExport(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    const {
      filename = `endowcast-results-${new Date().toISOString().split('T')[0]}`,
      format = 'pdf',
      quality = 0.9,
      scale = 1.5
    } = options;

  // Dynamically import html-to-image only when needed
  const htmlToImage = await import('html-to-image');

  // Build inline font CSS for html-to-image so it doesn't try to parse the live stylesheets
  const fontEmbedCSS = await getFontEmbedCSS();

    // Ensure all fonts are fully loaded to avoid reflow during capture
  setPerFormatProgress(format, 5);
    try {
      // document.fonts.ready is widely supported in modern browsers
      // It resolves once all fonts used in the document are loaded
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
    } catch { /* ignore */ }

    // Wait for any charts to fully render and the layout to stabilize
  setPerFormatProgress(format, 10);
    // Two animation frames + short delay for reflow after fonts
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await new Promise(resolve => setTimeout(resolve, 250));

    // Extra: wait until element's bounding box is stable for 300ms
    const waitForStableLayout = async (node: HTMLElement, timeoutMs = 2000) => {
      const start = performance.now();
      let last: { w: number; h: number } | null = null;
      while (performance.now() - start < timeoutMs) {
        const rect = node.getBoundingClientRect();
        const cur = { w: Math.round(rect.width), h: Math.round(rect.height) };
        if (last && cur.w === last.w && cur.h === last.h) {
          // stable twice in a row => good enough
          break;
        }
        last = cur;
        await new Promise(r => setTimeout(r, 150));
      }
    };
    await waitForStableLayout(element);
    
    // Get the dataURL using html-to-image (which supports modern CSS)
    setPerFormatProgress(format, 30);
    
    const effectiveScale = Math.min(scale ?? 1.5, 2);

    // Use toPng with settings optimized for layout preservation.
    // We rely on pixelRatio for scaling and avoid setting canvasWidth/Height
    // directly, as that can cause layout reflow and text misalignment.
    let dataUrl: string | null = null;
    try {
      dataUrl = await htmlToImage.toPng(element, {
        quality,
        pixelRatio: effectiveScale,
        backgroundColor: '#ffffff',
        skipFonts: false, // attempt embedding fonts now that they should be same-origin
        cacheBust: true,
        fontEmbedCSS,
        filter: (node) => {
          if (node instanceof Element) {
            return !node.classList.contains('no-export');
          }
          return true;
        }
      });
    } catch (fontErr) {
      console.warn('[export] Font embedding failed, retrying with skipFonts=true:', fontErr);
      // Retry with skipFonts to avoid aborting export entirely
      dataUrl = await htmlToImage.toPng(element, {
        quality,
        pixelRatio: Math.max(1, effectiveScale - 0.25), // slightly lower ratio for second attempt
        backgroundColor: '#ffffff',
        skipFonts: true,
        cacheBust: true,
        fontEmbedCSS,
        filter: (node) => {
          if (node instanceof Element) {
            return !node.classList.contains('no-export');
          }
          return true;
        }
      });
    }    setPerFormatProgress(format, 60);

    if (format === 'png') {
      // Export as PNG - dataUrl is already in PNG format
      downloadFile(dataUrl, `${filename}.png`);
      setPerFormatProgress(format, 100);
    } else {
      // Export as PDF
      setPerFormatProgress(format, 70);
      
      // Dynamically import jsPDF
      const { default: jsPDF } = await import('jspdf');
      
      // Create an image to get dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (img.height * imgWidth) / img.width;
      
      // Calculate if we need multiple pages
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      setPerFormatProgress(format, 80);

      // Add first page using JPEG compression for massive file size reduction
      pdf.addImage(dataUrl, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      setPerFormatProgress(format, 90);

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(`${filename}.pdf`);
      setPerFormatProgress(format, 100);
    }
  }

  /**
   * Helper function to download a data URL as a file
   */
  function downloadFile(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    isExporting,
    exportProgress,
    // Per-format state (preferred for UI bindings)
    isExportingPng,
    isExportingPdf,
    pngProgress,
    pdfProgress,
    exportElement
  };
}
