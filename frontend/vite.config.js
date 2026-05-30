import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const backend = {
  target: 'http://localhost:8000',
  changeOrigin: false,
  timeout: 180_000,       // socket inactivity timeout (3 min)
  proxyTimeout: 180_000,  // wait for backend to respond (3 min)
};

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/chat': backend,
      '/files': backend,
      '/vision': backend,
      '/structured': backend,
      '/functions': backend,
      '/code': backend,
      '/images': backend,
      '/health': backend,
    },
  },
});
