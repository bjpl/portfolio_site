import { defineConfig } from 'vite';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: 'src',
  base: '/',
  
  build: {
    outDir: '../assets',
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/scripts/app.ts'),
        styles: resolve(__dirname, 'src/styles/main.scss')
      },
      output: {
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: 'css/[name].[hash].[ext]'
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/tokens";`
      }
    }
  },
  
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  
  server: {
    proxy: {
      '/api': 'http://localhost:1313'
    }
  }
});