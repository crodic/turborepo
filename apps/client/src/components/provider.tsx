"use client";

import React, { useState } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SocketProvider } from "@/context/socket-context";
import { Toaster } from "./ui/sonner";

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster />
        {children}
      </SocketProvider>
    </QueryClientProvider>
  );
}
