import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    // Escuta SÓ em IPv4: sem isto o Vite resolve "localhost" para ::1 no
    // Windows e a vitrine (que abre http://127.0.0.1:3000) não conecta.
    host: "127.0.0.1",
    port: 3000,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
