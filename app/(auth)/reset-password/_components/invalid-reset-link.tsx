import Link from "next/link"

const InvalidResetLink = () => {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Link inválido
        </h2>
        <p className="text-base text-muted-foreground">
          Este link expirou ou já foi usado. Peça um novo na tela de login, em
          &ldquo;Esqueci minha senha&rdquo;.
        </p>
      </div>

      <div className="mt-auto flex items-center justify-center pt-10">
        <Link
          href="/login"
          className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  )
}

export default InvalidResetLink
