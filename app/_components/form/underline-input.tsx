import { Input } from "@/app/_components/ui/input"
import { cn } from "@/app/_lib/utils"

type UnderlineInputProps = React.ComponentProps<typeof Input> & {
  /** Conteúdo à direita, na mesma linha sublinhada (ex.: link "Esqueci"). */
  trailing?: React.ReactNode
  /** Classes da linha que envolve input + trailing. `className` vai no <input>. */
  containerClassName?: string
}

/**
 * Campo no estilo Órbita: sem caixa, só a borda inferior.
 * Repassa `ref` e todas as props ao <input> (React 19: `ref` é prop), então
 * funciona com `{...field}` do Controller ou `{...register("x")}` do RHF.
 * O estado de erro vem de `aria-invalid` no próprio input.
 */
export function UnderlineInput({
  trailing,
  containerClassName,
  className,
  ...props
}: UnderlineInputProps) {
  return (
    <div
      data-slot="underline-input"
      className={cn(
        "flex w-full items-center gap-3 border-b border-input transition-[border-color,box-shadow]",
        // Foco: sublinhado dobra de espessura (borda + sombra de 1px).
        "focus-within:border-text-secondary focus-within:shadow-underline focus-within:shadow-text-secondary",
        // Erro: sublinhado em destructive; com foco, também dobra — foco segue visível.
        "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:shadow-destructive",
        "has-[input:disabled]:opacity-50",
        containerClassName,
      )}
    >
      <Input
        className={cn(
          "h-12 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-base text-foreground shadow-none md:text-base",
          "focus-visible:border-0 focus-visible:ring-0",
          "aria-invalid:border-0 aria-invalid:ring-0",
          "disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent dark:aria-invalid:ring-0",
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  )
}
