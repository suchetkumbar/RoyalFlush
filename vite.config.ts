import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks cache across app deploys.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/.test(id)) return "react";
          if (id.includes("@radix-ui")) return "radix";
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});
