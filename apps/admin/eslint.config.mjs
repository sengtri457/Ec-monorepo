import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  globalIgnores([
    "**/node_modules/**",
    ".next/**",
    ".turbo/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
    "public/maplibre-gl-worker.mjs",
  ]),
]);

export default eslintConfig;
