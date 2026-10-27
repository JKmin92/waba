"use client"

import { ChakraProvider } from "@chakra-ui/react"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"
import { wabaTheme } from "@/theme"
import { Toaster } from "./toaster"

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={wabaTheme}>
      <ColorModeProvider {...props} />
      <Toaster />
    </ChakraProvider>
  )
}
