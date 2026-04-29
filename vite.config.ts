import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Strip console.* and debugger from production bundles. Keeps console.error
  // visible (kept by `pure`) so production crashes still surface to native
  // logs / Sentry-style sinks.
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
    pure: mode === "production" ? ["console.log", "console.info", "console.debug", "console.warn"] : [],
  },
}));
