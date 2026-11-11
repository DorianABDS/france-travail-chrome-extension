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
        FT: "readonly",
        importScripts: "readonly",
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "script",
      },
    },
  },
  {
    files: ["**/sync-version.js", "eslint.config.mjs"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
  },
]);
