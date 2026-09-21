import { OrbitHero } from "@/app/_components/brand/orbit-hero"
import { ThemeToggle } from "@/app/_components/theme/theme-toggle"

type AuthShellProps = {
  /** O formulário. Renderizado uma única vez, em todos os tamanhos de tela. */
  children: React.ReactNode
  title?: string
  tagline?: string
  /** Rodapé abaixo do formulário. Passe `null` para omitir. */
  footer?: React.ReactNode
}

const DEFAULT_FOOTER = "Sem acesso? Fale com o admin do seu setor."

/**
 * Layout das telas de acesso (login, recuperação de senha...).
 * - mobile: órbita no topo, título centralizado, área do form cresce (flex-1)
 *   para o form poder empurrar o botão para a base com `mt-auto`;
 * - md: mesma coluna, centralizada em `max-w-md`;
 * - lg+: duas colunas — marca à esquerda, form à direita em `max-w-sm`.
 */
export function AuthShell({
  children,
  title = "Direct Flow",
  tagline = "Cada chamado, do início ao fim.",
  footer = DEFAULT_FOOTER,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-background text-foreground lg:grid lg:grid-cols-2">
      <div className="absolute top-safe-3 right-safe-3 z-10 lg:top-safe-6 lg:right-safe-6">
        <ThemeToggle />
      </div>

      <aside className="hidden flex-col items-center justify-center gap-8 overflow-hidden border-r border-border-subtle bg-surface-bar px-12 py-16 lg:flex">
        <OrbitHero size="lg" />
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground">{tagline}</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col pt-safe-0 px-safe-7 pb-safe-7 md:justify-center md:pt-safe-12 md:pb-safe-12 lg:items-center lg:px-safe-12 short:pb-safe-5">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col md:flex-none lg:max-w-sm">
          <header className="flex flex-col items-center lg:hidden">
            <div className="-mx-7 flex h-100 items-center justify-center self-stretch overflow-hidden short:h-52">
              <OrbitHero size="md" className="short:size-52 short:scale-60" />
            </div>
            <div className="-mt-3 flex flex-col items-center gap-1.5 text-center">
              <h1 className="font-heading text-3xl font-semibold tracking-tight short:text-2xl">
                {title}
              </h1>
              <p className="text-base text-muted-foreground">{tagline}</p>
            </div>
          </header>

          <div className="mt-9 flex flex-1 flex-col md:flex-none lg:mt-0 short:mt-5">
            {children}
          </div>

          {footer ? (
            <p className="mt-4 text-center text-sm text-muted-foreground short:mt-3">
              {footer}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  )
}
