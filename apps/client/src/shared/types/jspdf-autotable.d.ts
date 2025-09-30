declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  interface AutoTableOptions {
    head?: any[][];
    body?: any[][];
    startY?: number;
    margin?: { left?: number; right?: number; top?: number; bottom?: number };
    theme?: 'striped' | 'grid' | 'plain';
    styles?: any;
    headStyles?: any;
    bodyStyles?: any;
  }
  
  function autoTable(pdf: jsPDF, options: AutoTableOptions): void;
  export default autoTable;
}
