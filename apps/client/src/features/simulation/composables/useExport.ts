import { ref } from 'vue';

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
  } = options;    isExporting.value = true;
    exportProgress.value = 0;

    try {
      if (useServerSide) {
        // Server-side export using Puppeteer
        exportProgress.value = 20;
        
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

        exportProgress.value = 80;

        if (!response.ok) {
          throw new Error('Server-side export failed');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        downloadFile(url, `${filename}.${format}`);
        URL.revokeObjectURL(url);
        
        exportProgress.value = 100;
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
        isExporting.value = false;
        exportProgress.value = 0;
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

    // Ensure all fonts are fully loaded to avoid reflow during capture
    exportProgress.value = 5;
    try {
      // document.fonts.ready is widely supported in modern browsers
      // It resolves once all fonts used in the document are loaded
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
    } catch { /* ignore */ }

    // Wait for any charts to fully render and the layout to stabilize
    exportProgress.value = 10;
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
    exportProgress.value = 30;
    
    // Constrain render size to keep PNG smaller and avoid massive canvases
    const naturalWidth = element.scrollWidth || element.clientWidth || 1200;
    const maxWidth = 1600; // cap width for reasonable file size
    const effectiveWidth = Math.min(naturalWidth, maxWidth);
    const effectiveScale = Math.min(scale, 2);
    const canvasWidth = Math.round(effectiveWidth * effectiveScale);
    const aspect = (element.scrollHeight || element.clientHeight || effectiveWidth) / (naturalWidth || 1);
    const canvasHeight = Math.round(canvasWidth * aspect);

    // Use toPng with settings optimized for layout preservation
    let dataUrl: string | null = null;
    try {
      dataUrl = await htmlToImage.toPng(element, {
        quality,
        pixelRatio: effectiveScale,
        backgroundColor: '#ffffff',
        skipFonts: false, // attempt embedding fonts now that they should be same-origin
        cacheBust: true,
        canvasWidth,
        canvasHeight,
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
        canvasWidth,
        canvasHeight,
        filter: (node) => {
          if (node instanceof Element) {
            return !node.classList.contains('no-export');
          }
          return true;
        }
      });
    }
      
    exportProgress.value = 60;

    if (format === 'png') {
      // Export as PNG - dataUrl is already in PNG format
      downloadFile(dataUrl, `${filename}.png`);
      exportProgress.value = 100;
    } else {
      // Export as PDF
      exportProgress.value = 70;
      
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
      
      exportProgress.value = 80;

      // Add first page
  pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      exportProgress.value = 90;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(`${filename}.pdf`);
      exportProgress.value = 100;
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
    exportElement
  };
}
