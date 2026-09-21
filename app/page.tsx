import { redirect } from "next/navigation"

// Temporário: enquanto não existe a tela inicial, a raiz leva ao login.
export default function Home() {
  redirect("/login")
}
