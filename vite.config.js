import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3334/api'),
    'import.meta.env.VITE_SITE_URL': JSON.stringify(process.env.VITE_SITE_URL || 'http://localhost:1313')
  },
  build: {
    outDir: 'static/dist',
    assetsDir: '',
    manifest: true,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/scripts/main.ts'),
        styles: path.resolve(__dirname, 'src/styles/main.scss'),
        critical: path.resolve(__dirname, 'src/styles/critical.scss')
      },
      output: {
        manualChunks: {
          'vendor': ['fuse.js'],
          'search': ['./src/scripts/search/search-engine.ts', './src/scripts/search/search-ui.ts'],
          'lazy': ['./src/scripts/components/lazy-loading.ts']
        },
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'css/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        }
      }
    },
    chunkSizeWarningLimit: 100,
    watch: {
      include: ['src/**']
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "src/styles/tokens/index" as tokens;`
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3334',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  envPrefix: 'VITE_'
});