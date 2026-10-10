import { defineConfig } from 'vite';

// Build trang demo (index.html) thành web tĩnh → demo-dist/ để deploy lên Cloudflare.
export default defineConfig({
  build: { outDir: 'demo-dist', emptyOutDir: true },
});
