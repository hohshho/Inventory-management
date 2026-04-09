"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AppToastProvider } from "@/components/app-toast-provider";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { UiLanguageProvider } from "@/components/ui-language-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UiLanguageProvider>
        <AuthSessionProvider>
          {children}
          <AppToastProvider />
        </AuthSessionProvider>
      </UiLanguageProvider>
    </QueryClientProvider>
  );
}
