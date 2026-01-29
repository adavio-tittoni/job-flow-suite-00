import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0', // Escuta em todas as interfaces (IPv4)
    strictPort: false, // Se a porta estiver ocupada, tenta a próxima disponível
    open: false, // Não abre o navegador automaticamente
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Production build optimizations
  build: {
    // Enable source maps for debugging (optional, remove in production for smaller builds)
    sourcemap: false,
    // Chunk size warning limit (kB)
    chunkSizeWarningLimit: 500,
    // Minify with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
      },
    },
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: {
          // Vendor chunks - rarely change, cached long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-switch',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-avatar',
            '@radix-ui/react-progress',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
          ],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod', 'class-variance-authority'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
          'vendor-export': ['jspdf', 'jspdf-autotable', 'xlsx', 'papaparse'],
          'vendor-icons': ['lucide-react'],
          'vendor-dnd': ['@hello-pangea/dnd'],
        },
        // Asset naming with content hash for cache busting
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'lucide-react',
    ],
  },
});
