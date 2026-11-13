import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "TENUE PRO · Suivi de chaîne",
        short_name: "TENUE PRO",
        lang: "fr",
        theme_color: "#C8102E",
        background_color: "#F5F4F2",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/img/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/img/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,png,woff2}"],
        runtimeCaching: [],
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:3001" } },
  build: { outDir: "dist", emptyOutDir: true },
});
