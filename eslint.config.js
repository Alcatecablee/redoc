import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Changed from error to warning
      "@typescript-eslint/no-empty-object-type": "warn", // Changed from error to warning
      "@typescript-eslint/no-require-imports": "warn", // Changed from error to warning
      "no-empty": "warn", // Changed from error to warning
      "no-case-declarations": "warn", // Changed from error to warning
      "no-useless-escape": "warn", // Changed from error to warning
    },
  },
);
