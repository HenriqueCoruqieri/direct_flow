import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier"
import simpleImportSort from "eslint-plugin-simple-import-sort"

const noComments = {
  meta: {
    type: "suggestion",
    messages: {
      noComment:
        "Sem comentários no código. A explicação vai na resposta, não no arquivo.",
    },
  },
  create(context) {
    const directive = /^\s*(eslint-|eslint\s|@ts-|global\s)/
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!directive.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: "noComment" })
          }
        }
      },
    }
  },
}

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
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    plugins: { df: { rules: { "no-comments": noComments } } },
    rules: { "df/no-comments": "error" },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
