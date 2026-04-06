import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public', // Our source html is in public/pages/
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/pages/index.html'),
        admin: resolve(__dirname, 'public/pages/admin.html'),
        kitchen: resolve(__dirname, 'public/pages/kitchen.html'),
        driver: resolve(__dirname, 'public/pages/driver.html')
      }
    }
  },
  server: {
    port: 3000,
    open: '/pages/index.html'
  }
});
