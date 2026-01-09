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
});
