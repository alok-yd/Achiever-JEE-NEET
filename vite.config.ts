import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return;
          if (id.includes("/@firebase/firestore/")) return "firebase-firestore";
          if (id.includes("/@firebase/auth/")) return "firebase-auth";
          if (id.includes("/@firebase/") || id.includes("/firebase/")) return "firebase-core";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          ) return "react-vendor";
          if (id.includes("/lucide-react/")) return "icon-vendor";
        },
      },
    },
  },
});
