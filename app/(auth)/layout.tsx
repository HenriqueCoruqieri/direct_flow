import ThemeToggle from "@/app/_components/theme/theme-toggle"

import OrbitHero from "./_components/orbit-hero"

const AuthLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-background text-foreground lg:grid lg:grid-cols-2">
      <div className="absolute top-safe-3 right-safe-3 z-10 lg:top-safe-6 lg:right-safe-6">
        <ThemeToggle />
      </div>

      <aside className="hidden flex-col items-center justify-center gap-8 overflow-hidden border-r border-border-subtle bg-surface-bar px-12 py-16 lg:flex">
        <OrbitHero size="lg" />
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            Direct Flow
          </h1>
          <p className="text-lg text-muted-foreground">
            Fluxo de trabalho completo e detalhado do início ao fim
          </p>
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
                Direct Flow
              </h1>
              <p className="text-base text-muted-foreground">
                Fluxo de trabalho completo e detalhado do início ao fim
              </p>
            </div>
          </header>

          <div className="mt-9 flex flex-1 flex-col md:flex-none lg:mt-0 short:mt-5">
            {children}
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground short:mt-3">
            Sem acesso? Fale com o admin do seu setor.
          </p>
        </div>
      </main>
    </div>
  )
}

export default AuthLayout
