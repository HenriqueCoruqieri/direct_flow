import { requireRegistryAccess } from "@/app/_lib/auth/registry-access"

const CadastrosLayout = async ({ children }: LayoutProps<"/cadastros">) => {
  await requireRegistryAccess()

  return children
}

export default CadastrosLayout
