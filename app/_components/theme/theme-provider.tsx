"use client"

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes"

const ThemeProvider = ({ scriptProps, ...props }: ThemeProviderProps) => {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{
        ...scriptProps,
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
    />
  )
}

export default ThemeProvider
