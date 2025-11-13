/**
 * PostCSS plugin to add RGB fallbacks for oklch/oklab colors
 * This ensures compatibility with html2canvas and older browsers
 */

import postcss from 'postcss';

export default postcss.plugin('postcss-oklch-fallback', () => {
  return (root) => {
    root.walkDecls((decl) => {
      const value = decl.value;
      
      // Check if the value contains oklch, oklab, lch, or lab
      if (!/oklch|oklab|lch\(|lab\(/i.test(value)) {
        return;
      }
      
      // Create a fallback declaration before the modern one
      const fallback = decl.clone();
      
      // Convert modern color functions to approximations
      // For simplicity, we'll use a simple RGB approximation
      let fallbackValue = value;
      
      // Replace oklch with rgb approximations
      // oklch(L C H) -> approximate rgb
      fallbackValue = fallbackValue.replace(
        /oklch\(\s*([0-9.]+)%?\s+([0-9.]+)\s+([0-9.]+)\s*(?:\/\s*([0-9.]+%?))?\s*\)/gi,
        (match, l, c, h, a) => {
          // Simple approximation: use lightness to determine gray value
          const gray = Math.round((parseFloat(l) / 100) * 255);
          const alpha = a ? (a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a)) : 1;
          return alpha < 1 ? `rgba(${gray}, ${gray}, ${gray}, ${alpha})` : `rgb(${gray}, ${gray}, ${gray})`;
        }
      );
      
      // Replace oklab with rgb approximations
      fallbackValue = fallbackValue.replace(
        /oklab\(\s*([0-9.]+)%?\s+([0-9.-]+)\s+([0-9.-]+)\s*(?:\/\s*([0-9.]+%?))?\s*\)/gi,
        (match, l, a, b, alpha) => {
          // Simple approximation: use lightness to determine gray value
          const gray = Math.round((parseFloat(l) / 100) * 255);
          const alphaVal = alpha ? (alpha.endsWith('%') ? parseFloat(alpha) / 100 : parseFloat(alpha)) : 1;
          return alphaVal < 1 ? `rgba(${gray}, ${gray}, ${gray}, ${alphaVal})` : `rgb(${gray}, ${gray}, ${gray})`;
        }
      );
      
      // Replace color-mix with approximations
      fallbackValue = fallbackValue.replace(
        /color-mix\(in\s+(?:oklch|oklab|srgb),\s*([^,]+),\s*([^)]+)\)/gi,
        (match, color1, color2) => {
          // For color-mix, just use the first color as fallback
          return color1.trim();
        }
      );
      
      // If we made changes, insert the fallback
      if (fallbackValue !== value) {
        fallback.value = fallbackValue;
        decl.parent.insertBefore(decl, fallback);
      }
    });
  };
});
