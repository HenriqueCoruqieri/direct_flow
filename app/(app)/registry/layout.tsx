import { requireRegistryAccess } from "@/app/_lib/auth/registry-access"

const RegistryLayout = async ({ children }: LayoutProps<"/registry">) => {
  await requireRegistryAccess()

  return children
}

export default RegistryLayout
