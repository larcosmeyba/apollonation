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
  build: {
    rollupOptions: {
      output: {
        // Split heavyweight libs into their own chunks so the main bundle
        // stays small. Cuts initial parse time on older devices in WebView.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-charts": ["recharts"],
          "vendor-motion": ["framer-motion"],
          "vendor-pdf": ["pdf-lib"],
          "vendor-carousel": ["embla-carousel-react"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
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
