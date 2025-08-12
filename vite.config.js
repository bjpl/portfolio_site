import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'assets/dist',
    assetsDir: '',
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/scripts/main.ts'),
        styles: path.resolve(__dirname, 'src/styles/main.scss')
      },
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      }
    },
    watch: {
      include: ['src/**']
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "src/styles/tokens/index";`
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
