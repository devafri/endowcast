import { ref } from 'vue';
import logoUrl from '@/shared/assets/logo.svg?url';
// Import jsPDF font for side effects - it will register itself with jsPDF
import '@/shared/assets/fonts/SourceSans3-normal.js';

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

    // Find all sections to export
    const sections = element.querySelectorAll<HTMLElement>('[data-export-section]');
    
    if (sections.length === 0) {
      // Fallback to single-page export if no sections found
      return await exportSinglePage(element, { filename, format, quality, scale });
    }

    // Multi-page export
    const effectiveScale = Math.min(scale ?? 1.5, 2);
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10; // mm
    const headerHeight = 15; // mm
    const footerHeight = 10; // mm
    const contentHeight = pageHeight - (2 * margin) - headerHeight - footerHeight;
    
    setPerFormatProgress(format, 20);
    
    // Capture each section
    const sectionImages: { canvas: HTMLCanvasElement; name: string; pageNum: string }[] = [];
    let progressStep = 30 / sections.length;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionName = section.getAttribute('data-export-section') || `section-${i + 1}`;
      const pageNum = section.getAttribute('data-export-page') || `${i + 1}`;
      
      try {
        const dataUrl = await htmlToImage.toPng(section as HTMLElement, {
          quality,
          pixelRatio: effectiveScale,
          backgroundColor: '#ffffff',
          skipFonts: false,
          cacheBust: true,
          fontEmbedCSS,
          filter: (node) => {
            if (node instanceof Element) {
              return !node.classList.contains('no-export');
            }
            return true;
          }
        });
        
        // Convert dataUrl to canvas
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = dataUrl;
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
        
        sectionImages.push({ canvas, name: sectionName, pageNum });
      } catch (error) {
        console.warn(`Failed to capture section ${sectionName}:`, error);
      }
      
      setPerFormatProgress(format, 20 + (i + 1) * progressStep);
    }
    
    setPerFormatProgress(format, 50);
    
    if (format === 'png') {
      // Export as multi-page PNG (separate files)
      await exportMultiPagePNG(sectionImages, filename, effectiveScale);
      setPerFormatProgress(format, 100);
    } else {
      // Export as PDF with headers/footers
      await exportMultiPagePDF(sectionImages, filename, pageWidth, pageHeight, margin, headerHeight, footerHeight);
      setPerFormatProgress(format, 100);
    }
  }

  /**
   * Export sections as separate PNG files
   */
  async function exportMultiPagePNG(
    sectionImages: { canvas: HTMLCanvasElement; name: string; pageNum: string }[],
    filename: string,
    scale: number
  ): Promise<void> {
    for (let i = 0; i < sectionImages.length; i++) {
      const { canvas, pageNum } = sectionImages[i];
      const dataUrl = canvas.toDataURL('image/png', 0.95);
      downloadFile(dataUrl, `${filename}-page-${pageNum}.png`);
      
      // Small delay between downloads to avoid browser blocking
      if (i < sectionImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Load logo as data URL
   */
  async function getLogoDataUrl(): Promise<string> {
    try {
      const response = await fetch(logoUrl);
      const svgText = await response.text();
      
      // Convert SVG to data URL
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create an image element to convert SVG to canvas (for better PDF compatibility)
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn('Failed to load logo image');
          reject(new Error('Failed to load logo'));
        };
        img.src = url;
      });
      
      // Draw to canvas to get a raster image
      const canvas = document.createElement('canvas');
      const size = 120; // Original logo size
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, size, size);
      }
      
      URL.revokeObjectURL(url);
      
      // Return as PNG data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.warn('Failed to load logo:', error);
      return '';
    }
  }

  /**
   * Export sections as multi-page PDF with headers and footers
   */
  async function exportMultiPagePDF(
    sectionImages: { canvas: HTMLCanvasElement; name: string; pageNum: string }[],
    filename: string,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    headerHeight: number,
    footerHeight: number
  ): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Source Sans 3 font is already registered via the import at the top of the file
    // The font name registered in the font file is 'SourceSans3-VariableFont_wght'
    console.log('Using Source Sans 3 font in PDF');
    
    const contentWidth = pageWidth - (2 * margin);
    const contentHeight = pageHeight - (2 * margin) - headerHeight - footerHeight;
    const totalPages = sectionImages.length;
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    // Load logo once for all pages
    const logoDataUrl = await getLogoDataUrl();
    console.log('Logo loaded:', logoDataUrl ? `${logoDataUrl.substring(0, 50)}... (${logoDataUrl.length} chars)` : 'FAILED');
    
    let isFirstPage = true;
    
    for (let i = 0; i < sectionImages.length; i++) {
      const { canvas, name } = sectionImages[i];
      
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;
      
      // Add logo to header (if available)
      const logoSize = 10; // mm
      let headerTextX = margin; // Start position for header text
      
      if (logoDataUrl) {
        try {
          console.log(`Adding logo to page ${i + 1} at position (${margin}, ${margin}), size: ${logoSize}mm`);
          pdf.addImage(logoDataUrl, 'PNG', margin, margin, logoSize, logoSize);
          headerTextX = margin + logoSize + 3; // Position text after logo with 3mm gap
        } catch (error) {
          console.error('Failed to add logo to PDF:', error);
        }
      }
      
      // Add header text with Source Sans 3 font
      // Font name matches what's registered in the font file
      pdf.setFont('SourceSans3-VariableFont_wght', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(50, 60, 70);
      pdf.text('EndowCast Simulation Results', headerTextX, margin + 6.5);
      
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(currentDate, pageWidth - margin, margin + 6.5, { align: 'right' });
      
      // Header line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.25);
      pdf.line(margin, margin + headerHeight - 2, pageWidth - margin, margin + headerHeight - 2);
      
      // Calculate image dimensions to fit in content area
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if image fits in one page
      if (imgHeight <= contentHeight) {
        // Fits in one page
        const yPos = margin + headerHeight;
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          margin,
          yPos,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      } else {
        // Need to split across multiple pages
        let heightLeft = imgHeight;
        let yOffset = 0;
        
        while (heightLeft > 0) {
          if (yOffset > 0) {
            pdf.addPage();
            
            // Add header to continuation pages
            pdf.setFont('SourceSans3-VariableFont_wght', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.text('EndowCast Simulation Results (continued)', margin, margin + 5);
            pdf.text(currentDate, pageWidth - margin, margin + 5, { align: 'right' });
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.25);
            pdf.line(margin, margin + headerHeight - 2, pageWidth - margin, margin + headerHeight - 2);
          }
          
          const yPos = margin + headerHeight - yOffset;
          pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.92),
            'JPEG',
            margin,
            yPos,
            imgWidth,
            imgHeight,
            undefined,
            'FAST'
          );
          
          heightLeft -= contentHeight;
          yOffset += contentHeight;
        }
      }
      
      // Add footer
      const pageNum = i + 1;
      pdf.setFont('SourceSans3', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      const footerY = pageHeight - margin - 3;
      pdf.text(`Page ${pageNum} of ${totalPages}`, margin, footerY);
      pdf.text('Generated by Endowcast', pageWidth - margin, footerY, { align: 'right' });
    }
    
    pdf.save(`${filename}.pdf`);
  }

  /**
   * Fallback for single-page export (when no sections found)
   */
  async function exportSinglePage(
    element: HTMLElement,
    options: { filename: string; format: string; quality: number; scale: number }
  ): Promise<void> {
    const { filename, format, quality, scale } = options;
    const htmlToImage = await import('html-to-image');
    const fontEmbedCSS = await getFontEmbedCSS();
    const effectiveScale = Math.min(scale ?? 1.5, 2);
    
    setPerFormatProgress(format as 'png' | 'pdf', 30);

    // Use toPng with settings optimized for layout preservation.
    let dataUrl: string | null = null;
    try {
      dataUrl = await htmlToImage.toPng(element, {
        quality,
        pixelRatio: effectiveScale,
        backgroundColor: '#ffffff',
        skipFonts: false,
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
      dataUrl = await htmlToImage.toPng(element, {
        quality,
        pixelRatio: Math.max(1, effectiveScale - 0.25),
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
    }
    
    setPerFormatProgress(format as 'png' | 'pdf', 60);

    if (format === 'png') {
      downloadFile(dataUrl, `${filename}.png`);
      setPerFormatProgress(format as 'png' | 'pdf', 100);
    } else {
      setPerFormatProgress(format as 'png' | 'pdf', 70);
      
      const { default: jsPDF } = await import('jspdf');
      
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (img.height * imgWidth) / img.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      setPerFormatProgress(format as 'png' | 'pdf', 80);

      pdf.addImage(dataUrl, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      setPerFormatProgress(format as 'png' | 'pdf', 90);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
      setPerFormatProgress(format as 'png' | 'pdf', 100);
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
