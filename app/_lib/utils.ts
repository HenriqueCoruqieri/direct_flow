import { createCn } from "cn/config"

/**
 * Única fonte do `cn` no projeto (primitivos do shadcn inclusive).
 *
 * O `cn` resolve conflitos por grupo de classe, mas não lê o `globals.css`.
 * Um token do `@theme` com nome fora da escala padrão do Tailwind
 * (`shadow-underline`) é tratado como cor e descartado ao lado de uma
 * `shadow-<cor>`. Todo token assim precisa ser registrado aqui.
 */
export const cn = createCn({
  extend: {
    theme: {
      shadow: ["underline", "glow", "glow-sm"],
    },
  },
})
