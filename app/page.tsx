import { redirect } from "next/navigation"

// Temporário: enquanto não existe a tela inicial, a raiz leva ao login.
const Home = () => {
  redirect("/login")
}

export default Home
