import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default () => {
  return defineConfig({
    root: "./src",
    // Biến môi trường nằm ở thư mục gốc dự án, không nằm trong src.
    envDir: "../",
    base: "",
    plugins: [zaloMiniApp(), react()],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL || "https://huznckfqlywnhaexcelj.supabase.co"
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Ibyx9lBKWxfsT2cxKghTBw_0-R1ch82"
      ),
    },
    build: {
      assetsInlineLimit: 0,
    },
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  });
};
