import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  useAutoTable?: boolean;
  debug?: boolean;
  quality?: number;
}

export async function exportToPDF(elementId: string, options: ExportOptions = {}) {
  const {
    filename = 'endowcast-report',
    title = 'EndowCast Simulation Report',
    subtitle = new Date().toLocaleDateString(),
    showHeader = true,
    useAutoTable = true,
    debug = false,
    quality = 0.95
  } = options;

  let loadingToast: any = null;

  try {
    // Get the element to export
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    console.log('Starting PDF export for element:', elementId);
    console.log('Element found:', element);
    console.log('Element scrollHeight:', element.scrollHeight);
    console.log('Element children count:', element.children.length);

    // Check if element has meaningful content
    if (element.scrollHeight < 100) {
      throw new Error(`Element appears to be empty or too small (height: ${element.scrollHeight}px)`);
    }

    // Show loading state
    loadingToast = showToast('Initializing PDF export...', 'info');

    // Pre-capture canvases from the live DOM as a reliable fallback
    const preCapturedCanvases: { src: string; type: 'PNG' | 'JPEG'; w: number; h: number }[] = [];
    try {
      const liveCanvases = Array.from(element.querySelectorAll('canvas')) as HTMLCanvasElement[];
      for (const cv of liveCanvases) {
        try {
          const src = cv.toDataURL('image/png');
          preCapturedCanvases.push({ src, type: 'PNG', w: cv.width || 0, h: cv.height || 0 });
        } catch (e) {
          console.warn('Pre-capture canvas failed:', e);
        }
      }
      console.log('Pre-captured canvases count:', preCapturedCanvases.length);
    } catch (e) {
      console.warn('Error while pre-capturing canvases:', e);
    }

  // Create a temporary container with proper styling
  const tempContainer = document.createElement('div');
  // give a stable id so our CSS selectors work and cleanup can find it
  tempContainer.id = `temp-container-${Date.now()}`;
    tempContainer.style.cssText = `
      position: fixed;
      top: -10000px;
      left: -10000px;
      width: ${element.scrollWidth}px;
      height: auto;
      overflow: visible;
      z-index: -1;
      background: white;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Clone the element with deep cloning
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Remove any existing transforms or animations that might interfere
    clonedElement.style.transform = 'none';
    clonedElement.style.animation = 'none';
    clonedElement.style.transition = 'none';
    
    // Ensure proper dimensions
    clonedElement.style.width = '100%';
    clonedElement.style.height = 'auto';
    clonedElement.style.overflow = 'visible';

    // Add CSS fixes for better rendering
      // Apply comprehensive CSS overrides for html2canvas compatibility
      const styleOverrides = document.createElement('style');
      styleOverrides.textContent = `
        #${tempContainer.id} * {
          background-color: white !important;
          color: black !important;
          border-color: #e5e7eb !important;
        }
        /* Override all Tailwind color functions that use oklch/oklab */
        #${tempContainer.id} .bg-white { background-color: #ffffff !important; }
        #${tempContainer.id} .bg-gray-50 { background-color: #f9fafb !important; }
        #${tempContainer.id} .bg-gray-100 { background-color: #f3f4f6 !important; }
        #${tempContainer.id} .bg-gray-200 { background-color: #e5e7eb !important; }
        #${tempContainer.id} .bg-blue-50 { background-color: #eff6ff !important; }
        #${tempContainer.id} .bg-blue-100 { background-color: #dbeafe !important; }
        #${tempContainer.id} .bg-green-50 { background-color: #f0fdf4 !important; }
        #${tempContainer.id} .bg-green-100 { background-color: #dcfce7 !important; }
        #${tempContainer.id} .text-black { color: #000000 !important; }
        #${tempContainer.id} .text-gray-600 { color: #4b5563 !important; }
        #${tempContainer.id} .text-gray-700 { color: #374151 !important; }
        #${tempContainer.id} .text-gray-800 { color: #1f2937 !important; }
        #${tempContainer.id} .text-gray-900 { color: #111827 !important; }
        #${tempContainer.id} .text-blue-600 { color: #2563eb !important; }
        #${tempContainer.id} .text-green-600 { color: #16a34a !important; }
        #${tempContainer.id} .border-gray-200 { border-color: #e5e7eb !important; }
        #${tempContainer.id} .border-gray-300 { border-color: #d1d5db !important; }
        #${tempContainer.id} .divide-gray-200 > * + * { border-color: #e5e7eb !important; }
        /* Force all background and text colors to safe values */
        #${tempContainer.id} [style*="oklch"] { color: black !important; background-color: white !important; }
        #${tempContainer.id} [style*="oklab"] { color: black !important; background-color: white !important; }
      `;
      // Append the style overrides into the temp container (we'll inject a clone
      // of this stylesheet into the html2canvas clone via onclone)
      styleOverrides.setAttribute('data-pdf-export', 'true');
      tempContainer.appendChild(styleOverrides);
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Convert charts to images BEFORE html2canvas
    const canvases = clonedElement.querySelectorAll('canvas');
    console.log(`Found ${canvases.length} canvas elements`);
    
    for (const canvas of Array.from(canvases) as HTMLCanvasElement[]) {
      try {
        const dataURL = (canvas as HTMLCanvasElement).toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataURL;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(img, canvas);
        }
      } catch (error) {
        console.warn('Failed to convert canvas to image:', error);
      }
    }

    // Wait for images to load
    const images = clonedElement.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });
    
    await Promise.all(imageLoadPromises);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Extra safety delay

    // Create canvas with simpler configuration
    console.log('Creating canvas with html2canvas...');
    showToast('Converting content to image...', 'info');

    const canvas = await html2canvas(clonedElement, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: true, // Enable for debugging
      width: clonedElement.scrollWidth,
      height: clonedElement.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        console.log('onclone called - sanitizing clone before rendering');

        try {
          // Aggressively disable any cloned stylesheets (ownerNode) so html2canvas
          // doesn't attempt to parse them. Accessing cssRules may throw (CORS),
          // so disable via ownerNode when possible.
          try {
            const sheets: any[] = Array.from((clonedDoc as any).styleSheets || []);
            sheets.forEach(sheet => {
              try {
                if (sheet && sheet.ownerNode) {
                  // mark the node disabled if possible
                  sheet.ownerNode.disabled = true;
                }
              } catch (inner) {
                // ignore
              }
            });
          } catch (eSheets) {
            // ignore
          }

          // Remove link and style nodes from the cloned document
          const badSheets = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"], style'));
          badSheets.forEach(n => n.parentNode && n.parentNode.removeChild(n));

          // Re-insert a safe stylesheet based on our overrides (if head exists)
          if (clonedDoc.head) {
            const clonedStyle = clonedDoc.createElement('style');
            clonedStyle.setAttribute('data-pdf-export', 'true');
            clonedStyle.textContent = (styleOverrides && styleOverrides.textContent) ? styleOverrides.textContent : '';
            clonedDoc.head.appendChild(clonedStyle);
          }

          // Sanitize inline styles that reference oklch/oklab (replace with black)
          const inlineStyled = Array.from(clonedDoc.querySelectorAll('[style]')) as HTMLElement[];
          inlineStyled.forEach(el => {
            const s = el.getAttribute('style');
            if (!s) return;
            if (/oklch|oklab/i.test(s)) {
              const sanitized = s.replace(/oklch\([^)]*\)/ig, '#000').replace(/oklab\([^)]*\)/ig, '#000');
              el.setAttribute('style', sanitized);
            }
            // Ensure visibility
            try {
              (el as HTMLElement).style.visibility = 'visible';
              (el as HTMLElement).style.opacity = '1';
            } catch (_) {
              // ignore
            }
          });
        } catch (e) {
          console.warn('Error while sanitizing clone in onclone:', e);
        }
      }
    });

    console.log('Canvas created:', canvas);
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas has zero dimensions');
    }

    // Check canvas content
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let nonTransparentPixels = 0;
      
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 0) nonTransparentPixels++;
      }
      
      console.log(`Non-transparent pixels: ${nonTransparentPixels}`);
      
      if (nonTransparentPixels < 1000) {
        console.warn('Canvas appears to have very little content');
      }
    }

    // Gather structured assets from the cloned DOM before cleanup
    const chartImgs = Array.from(clonedElement.querySelectorAll('img'))
      .filter(i => i.src && i.src.startsWith('data:image'))
      .map(i => ({ src: i.src, type: i.src.indexOf('image/png') > -1 ? 'PNG' : 'JPEG', w: (i as HTMLImageElement).naturalWidth || canvas.width, h: (i as HTMLImageElement).naturalHeight || canvas.height }));

    // Extract table data for searchable text output
    const tables = Array.from(clonedElement.querySelectorAll('table')).map(table => {
      const headers = Array.from(table.querySelectorAll('thead th')).map(h => h.textContent?.trim() || '');
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || ''));
      // Fallback: if no thead, try first row as header
      if (headers.length === 0) {
        const firstRow = table.querySelector('tr');
        if (firstRow) {
          const cells = Array.from(firstRow.querySelectorAll('th,td')).map(c => c.textContent?.trim() || '');
          headers.push(...cells);
        }
      }
      return { headers, rows };
    });

    // Clean up temporary elements (now that we extracted needed data)
    if (tempContainer && tempContainer.parentNode) document.body.removeChild(tempContainer);
    const injectedStyles = document.querySelectorAll('style[data-pdf-export]');
    injectedStyles.forEach(s => s.parentNode && s.parentNode.removeChild(s));

    // Create structured PDF (text + images)
    console.log('Creating structured PDF document...');
    showToast('Creating PDF document...', 'info');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentW = pageW - margin * 2;
    let cursorY = 15;

    // Header
    pdf.setFontSize(16);
    pdf.text(title, margin, cursorY);
    pdf.setFontSize(10);
    pdf.text(subtitle, margin, cursorY + 7);
    cursorY += 14;

    // Debug: Initialize debug images array
    if (debug && typeof window !== 'undefined') {
      (window as any).__pdfExportDebugImages = [];
      console.log('🐛 Debug mode enabled - images will be saved to window.__pdfExportDebugImages');
    }

    // Strategy: Always use the html2canvas result as it captures everything
    // This ensures charts are included even if individual canvas capture failed
    console.log('📊 Using html2canvas result for reliable chart export');
    
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const imgWidth = 190; // A4 width minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    if (debug && typeof window !== 'undefined') {
      (window as any).__pdfExportDebugImages.push({ 
        name: 'full-canvas', 
        data: imgData, 
        width: canvas.width, 
        height: canvas.height 
      });
    }

    console.log('🖼️ Canvas image size:', imgData.length, 'chars');
    console.log('📏 PDF image dimensions:', imgWidth, 'x', imgHeight, 'mm');

    // Add the full canvas image to PDF
    if (showHeader) {
      pdf.setFontSize(16);
      pdf.text(title, margin, 15);
      pdf.setFontSize(10);
      pdf.text(subtitle, margin, 22);
      
      // Check if image fits on first page, otherwise start on new page
      const headerSpace = 30; // mm
      const availableHeight = pageH - headerSpace - margin;
      
      if (imgHeight > availableHeight) {
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
        cursorY = margin + imgHeight + 10;
      } else {
        pdf.addImage(imgData, 'JPEG', margin, headerSpace, imgWidth, imgHeight);
        cursorY = headerSpace + imgHeight + 10;
      }
    } else {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      cursorY = margin + imgHeight + 10;
    }

    // Render tables - simplified approach for reliability
    if (tables.length > 0) {
      console.log('📋 Adding', tables.length, 'tables to PDF');
      
      if (useAutoTable) {
        try {
          // Try to use jspdf-autotable for prettier tables
          const { default: autoTable } = await import('jspdf-autotable');
          
          for (let i = 0; i < tables.length; i++) {
            const t = tables[i];
            if (t.headers && t.headers.length && t.rows && t.rows.length) {
              // Add some space before table
              if (cursorY > pageH - 50) {
                pdf.addPage();
                cursorY = margin;
              } else {
                cursorY += 10;
              }
              
              console.log('📊 Adding table', i + 1, 'with autoTable');
              (autoTable as any)(pdf, { 
                head: [t.headers],
                body: t.rows,
                startY: cursorY,
                margin: { left: margin, right: margin },
                theme: 'striped',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [100, 100, 100] }
              });
              
              cursorY = (pdf as any).lastAutoTable?.finalY ? (pdf as any).lastAutoTable.finalY + 10 : cursorY + 50;
            }
          }
        } catch (e) {
          console.warn('⚠️ autoTable failed, using simple text tables:', e);
          // Fallback to simple text tables
          renderSimpleTables(pdf, tables, cursorY, pageH, margin, contentW);
        }
      } else {
        // Simple text table rendering
        renderSimpleTables(pdf, tables, cursorY, pageH, margin, contentW);
      }
    }

    // Save PDF
    const fileName = `${filename}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    hideToast(loadingToast);
    showToast('PDF exported successfully!', 'success');
    console.log('Structured PDF export completed successfully');
    return true;

  } catch (error) {
    console.error('PDF export failed:', error);
    
    // Clean up any remaining temporary elements
    try {
  const tempContainer = document.querySelector('[id*="temp-container"]');
  if (tempContainer && tempContainer.parentNode) document.body.removeChild(tempContainer);
      
  const styleOverride = document.querySelectorAll('style[data-pdf-export]');
  styleOverride.forEach(s => s.parentNode && s.parentNode.removeChild(s));
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }

    // Only hide toast if it was created
    if (loadingToast) {
      hideToast(loadingToast);
    }
    
    let errorMessage = 'Failed to export PDF. ';
    if (error instanceof Error) {
      errorMessage += error.message;
    }
    
    showToast(errorMessage, 'error');
    throw error;
  }
}

// Toast notification functions
function showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
  console.log(`Toast [${type}]: ${message}`);
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    max-width: 350px;
    background-color: ${type === 'info' ? '#3b82f6' : type === 'success' ? '#10b981' : '#ef4444'};
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000);
  
  return toast;
}

function hideToast(toast: HTMLElement) {
  if (toast && toast.parentNode) {
    toast.parentNode.removeChild(toast);
  }
}

// Helper function for simple table rendering
function renderSimpleTables(pdf: any, tables: any[], cursorY: number, pageH: number, margin: number, contentW: number) {
  pdf.setFontSize(9);
  const lineHeight = 6; // mm per text line
  
  for (const t of tables) {
    if (t.headers && t.headers.length) {
      const colCount = Math.max(t.headers.length, ...t.rows.map((r: any) => r.length));
      const colW = contentW / Math.max(colCount, 1);
      
      // Headers
      let x = margin;
      for (let ci = 0; ci < t.headers.length; ci++) {
        pdf.setFont(undefined as any, 'bold');
        pdf.text((t.headers[ci] || '').slice(0, 40), x, cursorY);
        pdf.setFont(undefined as any, 'normal');
        x += colW;
      }
      cursorY += lineHeight;
      
      // Rows
      for (const row of t.rows) {
        if (cursorY > pageH - margin) {
          pdf.addPage();
          cursorY = margin;
        }
        let x2 = margin;
        for (let ci = 0; ci < colCount; ci++) {
          const cell = (row[ci] || '').replace(/\s+/g, ' ');
          pdf.text(cell.slice(0, 60), x2, cursorY);
          x2 += colW;
        }
        cursorY += lineHeight;
      }
      cursorY += 4; // spacing after table
    }
  }
}

export async function exportSimulationResults(simulationData: any, options: Partial<ExportOptions> = {}) {
  const defaultOptions = {
    filename: 'endowcast-simulation-results',
    title: 'Monte Carlo Simulation Results',
    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
    useAutoTable: true,
    debug: false, // Set to true for debugging
    ...options
  };
  
  return exportToPDF('results-export-container', defaultOptions);
}