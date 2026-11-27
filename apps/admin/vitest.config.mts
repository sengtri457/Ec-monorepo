import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const rootNodeModules = path.resolve(import.meta.dirname, "../../node_modules");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      react: path.join(rootNodeModules, "react"),
      "react-dom": path.join(rootNodeModules, "react-dom"),
    },
  },
});
