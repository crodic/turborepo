import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginQuery from "@tanstack/eslint-plugin-query";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  reactHooks.configs.flat.recommended,
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/components/ui/auto-form/**",
    "src/components/ui/minimal-tiptap/**",
    "src/components/ui/ui-builder/**",
    "src/lib/ui-builder/**",
    "src/hooks/use-copy-to-clipboard.tsx",
    "src/hooks/use-keyboard-shortcuts.tsx",
    "src/hooks/use-store.ts",
  ]),
  ...pluginQuery.configs["flat/recommended"],
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "@next/next/no-html-link-for-pages": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
