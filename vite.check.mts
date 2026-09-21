import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Cấu hình tạm chỉ dùng để kiểm tra biên dịch ngoài zmp CLI.
export default defineConfig({
  root: ".",
  base: "",
  plugins: [react()],
  resolve: { alias: { "@": "/src" } },
  build: {
    outDir: "dist-check",
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
});
