"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

const ThemeProvider = (
  props: React.ComponentProps<typeof NextThemesProvider>,
) => {
  return <NextThemesProvider {...props} />
}

export default ThemeProvider
