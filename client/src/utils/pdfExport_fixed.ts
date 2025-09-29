import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  quality?: number;
}

export async function exportToPDF(elementId: string, options: ExportOptions = {}) {
  const {
    filename = 'endowcast-report',
    title = 'EndowCast Simulation Report',
    subtitle = new Date().toLocaleDateString(),
    showHeader = true,
    quality = 0.95
  } = options;

  try {
    // Get the element to export
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    console.log('Starting PDF export for element:', elementId);
    console.log('Element found:', element);
    console.log('Element innerHTML length:', element.innerHTML.length);
    console.log('Element scrollHeight:', element.scrollHeight);
    console.log('Element children count:', element.children.length);

    // Show loading state
    const loadingToast = showToast('Initializing PDF export...', 'info');

    // Clone the element and fix CSS compatibility issues
    console.log('Cloning element and setting up temporary container...');
    const clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.id = elementId + '-clone';

    console.log('Cloned element children count:', clonedElement.children.length);
    console.log('Cloned element innerHTML length:', clonedElement.innerHTML.length);

    // Create a temporary container off-screen
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: fixed;
      top: -10000px;
      left: -10000px;
      width: ${element.scrollWidth}px;
      height: ${element.scrollHeight}px;
      overflow: visible;
      z-index: -1;
      background: white;
      padding: 10px;
    `;

    // Add simplified CSS for PDF export
    const styleOverride = document.createElement('style');
    styleOverride.textContent = `
      #${clonedElement.id} * {
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      #${clonedElement.id} {
        background-color: white !important;
        color: black !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      
      #${clonedElement.id} canvas { 
        display: block !important; 
        visibility: visible !important;
        max-width: 100% !important;
        height: auto !important;
      }
      
      #${clonedElement.id} img { 
        display: block !important; 
        visibility: visible !important;
        max-width: 100% !important;
        height: auto !important;
        opacity: 1 !important;
        margin: 0 auto !important;
      }
      
      #${clonedElement.id} * {
        color: black !important;
        background-color: transparent !important;
      }
      
      #${clonedElement.id} .bg-white { background-color: white !important; }
      #${clonedElement.id} .text-center { text-align: center !important; }
      #${clonedElement.id} .font-bold { font-weight: bold !important; }
      #${clonedElement.id} .text-3xl { font-size: 1.875rem !important; }
      #${clonedElement.id} .text-lg { font-size: 1.125rem !important; }
      #${clonedElement.id} .text-sm { font-size: 0.875rem !important; }
      #${clonedElement.id} .border-t { border-top: 1px solid #e5e7eb !important; }
      #${clonedElement.id} .pt-8 { padding-top: 2rem !important; }
      #${clonedElement.id} .py-8 { padding: 2rem 0 !important; }
      #${clonedElement.id} .space-y-8 > * { margin-bottom: 2rem !important; }
      #${clonedElement.id} .p-4 { padding: 1rem !important; }
      #${clonedElement.id} .p-6 { padding: 1.5rem !important; }
      #${clonedElement.id} .rounded-lg { border-radius: 0.5rem !important; }
      #${clonedElement.id} .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important; }
      #${clonedElement.id} .border { border: 1px solid #e5e7eb !important; }
      #${clonedElement.id} .bg-gray-50 { background-color: #f9fafb !important; }
      #${clonedElement.id} .text-gray-600 { color: #6b7280 !important; }
      #${clonedElement.id} .text-gray-900 { color: #111827 !important; }
      #${clonedElement.id} .text-green-600 { color: #16a34a !important; }
      #${clonedElement.id} .text-blue-600 { color: #2563eb !important; }
      #${clonedElement.id} .text-red-600 { color: #dc2626 !important; }
      
      #${clonedElement.id} .grid { display: grid !important; }
      #${clonedElement.id} .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      #${clonedElement.id} .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      #${clonedElement.id} .gap-6 { gap: 1.5rem !important; }
      
      #${clonedElement.id} .flex { display: flex !important; }
      #${clonedElement.id} .items-center { align-items: center !important; }
      #${clonedElement.id} .justify-center { justify-content: center !important; }
      #${clonedElement.id} .justify-between { justify-content: space-between !important; }
      
      #${clonedElement.id} table { width: 100% !important; border-collapse: collapse !important; }
      #${clonedElement.id} th, #${clonedElement.id} td { 
        padding: 0.75rem !important; 
        text-align: left !important; 
        border-bottom: 1px solid #e5e7eb !important; 
      }
      #${clonedElement.id} th { font-weight: 600 !important; background-color: #f9fafb !important; }
    `;

    // Append everything to DOM temporarily
    document.head.appendChild(styleOverride);
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    // CRITICAL: Capture chart images before html2canvas cloning
    console.log('🎨 Capturing chart images...');
    const originalCharts = element.querySelectorAll('canvas');
    const clonedCharts = clonedElement.querySelectorAll('canvas');
    
    console.log(`Found ${originalCharts.length} original charts and ${clonedCharts.length} cloned charts`);
    
    // Convert each chart canvas to an image and replace it in the clone
    for (let i = 0; i < originalCharts.length && i < clonedCharts.length; i++) {
      const originalCanvas = originalCharts[i] as HTMLCanvasElement;
      const clonedCanvas = clonedCharts[i] as HTMLCanvasElement;
      
      try {
        const chartImageData = originalCanvas.toDataURL('image/png', 0.95);
        console.log(`✅ Captured chart ${i} (${chartImageData.length} chars)`);
        
        const imgElement = document.createElement('img');
        imgElement.src = chartImageData;
        imgElement.style.cssText = `
          width: ${originalCanvas.style.width || originalCanvas.width + 'px'};
          height: ${originalCanvas.style.height || originalCanvas.height + 'px'};
          max-width: 100%;
          display: block;
          margin: 0 auto;
        `;
        imgElement.alt = `Chart ${i + 1}`;
        
        if (clonedCanvas.parentNode) {
          clonedCanvas.parentNode.replaceChild(imgElement, clonedCanvas);
          console.log(`✅ Replaced chart ${i} canvas with image`);
        }
      } catch (error) {
        console.error(`❌ Failed to capture chart ${i}:`, error);
      }
    }

    // Wait for images to load
    const images = clonedElement.querySelectorAll('img');
    if (images.length > 0) {
      console.log('⏳ Waiting for images to load...');
      await Promise.all(Array.from(images).map(img => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(true);
          } else {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
            setTimeout(() => resolve(true), 3000);
          }
        });
      }));
    }

    // Skip chart waiting since we converted them to images
    console.log('🖼️ Creating canvas with html2canvas...');
    showToast('Converting content to image...', 'info');

    let canvas: HTMLCanvasElement;
    
    try {
      const canvasPromise = html2canvas(clonedElement, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        removeContainer: false,
        imageTimeout: 30000,
        height: clonedElement.scrollHeight,
        width: clonedElement.scrollWidth,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        foreignObjectRendering: true,
        ignoreElements: (element) => {
          return element.classList.contains('ignore-export') || 
                 element.tagName === 'NOSCRIPT';
        },
        onclone: (clonedDoc) => {
          console.log('📋 html2canvas onclone callback triggered');
          const canvasElements = clonedDoc.querySelectorAll('canvas');
          const imgElements = clonedDoc.querySelectorAll('img[alt*="Chart"]');
          const svgIcons = clonedDoc.querySelectorAll('svg');
          
          console.log(`Found in clone: ${canvasElements.length} canvas, ${imgElements.length} chart images, ${svgIcons.length} SVG icons`);
          
          imgElements.forEach((img, index) => {
            const htmlImg = img as HTMLElement;
            htmlImg.style.display = 'block';
            htmlImg.style.visibility = 'visible';
            htmlImg.style.maxWidth = '100%';
            htmlImg.style.height = 'auto';
            console.log(`✅ Styled chart image ${index} in clone`);
          });
        }
      });
      
      const timeoutPromise = new Promise<HTMLCanvasElement>((_, reject) => {
        setTimeout(() => reject(new Error('html2canvas timed out after 45 seconds')), 45000);
      });
      
      canvas = await Promise.race([canvasPromise, timeoutPromise]);
      
      console.log('✅ Canvas created successfully!');
      console.log('📐 Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions');
      }
      
      // Check canvas content
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const sampleSize = 100;
        const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, sampleSize), Math.min(canvas.height, sampleSize));
        const pixels = imageData.data;
        let nonWhitePixels = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          if (a > 0 && (r < 250 || g < 250 || b < 250)) {
            nonWhitePixels++;
          }
        }
        
        console.log(`🔍 Canvas content check: ${nonWhitePixels} non-white pixels out of ${sampleSize * sampleSize} sampled`);
        
        if (nonWhitePixels < 10) {
          console.warn('⚠️ Canvas appears mostly empty');
        }
      }
      
    } catch (canvasError) {
      console.error('❌ Canvas creation failed:', canvasError);
      throw canvasError;
    } finally {
      // Clean up
      try {
        document.body.removeChild(tempContainer);
        document.head.removeChild(styleOverride);
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup error:', cleanupError);
      }
    }

    // Create PDF
    console.log('📄 Creating PDF document...');
    showToast('Creating PDF document...', 'info');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    console.log('📏 PDF calculations:', {
      imgWidth,
      pageHeight,
      imgHeight: imgHeight.toFixed(2),
      canvasDimensions: `${canvas.width}x${canvas.height}`
    });
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    // Add header
    if (showHeader) {
      console.log('📝 Adding PDF header');
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 20, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(subtitle, 20, 30);
      
      pdf.setLineWidth(0.5);
      pdf.line(20, 35, 190, 35);
      
      position = 45;
    }

    // Convert canvas to image and add to PDF
    console.log('🖼️ Converting canvas to image for PDF...');
    const imgData = canvas.toDataURL('image/png', quality);
    console.log(`✅ Image data created: ${imgData.length} characters`);
    console.log('🎯 Image data preview:', imgData.substring(0, 50) + '...');
    
    const remainingPageHeight = pageHeight - position;
    
    console.log('📄 Adding image to PDF...');
    console.log('📐 Image placement:', {
      x: 10,
      y: position,
      width: imgWidth - 20,
      height: Math.min(imgHeight, remainingPageHeight),
      remainingPageHeight
    });

    if (imgHeight <= remainingPageHeight) {
      console.log('✅ Single page - adding image...');
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth - 20, imgHeight);
      console.log('✅ Image added successfully!');
    } else {
      console.log('📄 Multi-page needed');
      let srcHeight = canvas.height;
      let srcY = 0;
      let pageNum = 0;
      
      while (srcHeight > 0) {
        const pageCanvas = document.createElement('canvas');
        const pageContext = pageCanvas.getContext('2d');
        
        const currentPageHeight = pageNum === 0 ? remainingPageHeight : pageHeight - 20;
        const canvasHeightForPage = (currentPageHeight * canvas.width) / imgWidth;
        
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(srcHeight, canvasHeightForPage);
        
        if (pageContext) {
          pageContext.drawImage(
            canvas,
            0, srcY,
            canvas.width, pageCanvas.height,
            0, 0,
            canvas.width, pageCanvas.height
          );
          
          const pageImgData = pageCanvas.toDataURL('image/png', quality);
          const pageImgHeight = (pageCanvas.height * imgWidth) / canvas.width;
          
          if (pageNum > 0) {
            pdf.addPage();
            position = 10;
          }
          
          pdf.addImage(pageImgData, 'PNG', 10, position, imgWidth - 20, pageImgHeight);
          console.log(`✅ Added page ${pageNum + 1}`);
          
          srcY += pageCanvas.height;
          srcHeight -= pageCanvas.height;
          pageNum++;
        }
      }
    }

    // Add footer
    console.log('📝 Adding footer...');
    const totalPages = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(128, 128, 128);
      
      const footerText = `Generated by EndowCast on ${new Date().toLocaleString()}`;
      pdf.text(footerText, 20, pageHeight - 10);
      pdf.text(`Page ${i} of ${totalPages}`, imgWidth - 40, pageHeight - 10);
    }

    // Save PDF
    hideToast(loadingToast);
    const fileName = `${filename}-${new Date().toISOString().split('T')[0]}.pdf`;
    console.log('💾 Saving PDF:', fileName);
    
    pdf.save(fileName);
    console.log('✅ PDF saved successfully!');
    showToast('PDF exported successfully!', 'success');
    
    return true;
    
  } catch (error) {
    console.error('💥 PDF export failed:', error);
    showToast(`PDF export failed: ${(error as Error).message}`, 'error');
    throw error;
  }
}

// Toast system (simplified)
function showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
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
  if (toast.parentNode) {
    toast.parentNode.removeChild(toast);
  }
}

// Export specific simulation results
export async function exportSimulationResults(simulationData: any, options: Partial<ExportOptions> = {}) {
  const defaultOptions = {
    filename: 'endowcast-simulation-results',
    title: 'Monte Carlo Simulation Results',
    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
    ...options
  };
  
  return exportToPDF('results-export-container', defaultOptions);
}
