import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier"
import simpleImportSort from "eslint-plugin-simple-import-sort"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "cn",
              message: 'Importe cn de "@/app/_lib/utils".',
            },
          ],
          patterns: [
            {
              group: ["cn/*"],
              message: 'Importe cn de "@/app/_lib/utils".',
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/_lib/utils.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Componentes: arrow function + export default. Primitivos do shadcn ficam
  // como o CLI gera (function + exportação nomeada).
  {
    files: ["app/**/*.tsx"],
    ignores: ["app/_components/ui/**"],
    rules: {
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "arrow-function",
          unnamedComponents: "arrow-function",
        },
      ],
      "import/prefer-default-export": ["error", { target: "any" }],
    },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
