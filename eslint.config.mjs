import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: "readonly",
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
  },
  {
    files: ["sync-version.js"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
  },
]);
