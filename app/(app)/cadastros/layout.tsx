import { requireDirector } from "@/app/_lib/auth/director"

const CadastrosLayout = async ({ children }: LayoutProps<"/cadastros">) => {
  await requireDirector()

  return children
}

export default CadastrosLayout
