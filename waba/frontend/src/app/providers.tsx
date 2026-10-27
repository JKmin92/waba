'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { wabaTheme } from '@/theme';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={wabaTheme}>
      {children}
      <Toaster />
    </ChakraProvider>
  );
}
