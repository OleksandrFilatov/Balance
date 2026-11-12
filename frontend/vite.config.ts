import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const apiTarget = process.env.BALANCE_DEV_API_URL ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/playwright-report/**", "**/test-results/**"] },
    proxy: { "/api": { target: apiTarget } },
  },
  preview: {
    host: "localhost",
    port: 4173,
    strictPort: true,
    proxy: { "/api": { target: apiTarget } },
  },
});
