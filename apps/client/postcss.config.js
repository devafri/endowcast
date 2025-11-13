import tailwindcss from '@tailwindcss/postcss';
import postcssOKLabFunction from '@csstools/postcss-oklab-function';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss,
    // Convert oklch/oklab to rgb with fallbacks for html2canvas compatibility
    postcssOKLabFunction({ preserve: true }),
    autoprefixer,
  ],
};
