import { defineConfig } from 'vite';

// `npm run dev`  → trang demo (index.html)
// `npm run build` → thư viện trong dist/ (ES module + bản <script> IIFE)
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'UiVuiVui',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'ui-vuivui.js' : 'ui-vuivui.iife.js'),
    },
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
