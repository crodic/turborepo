import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container mx-auto min-h-svh place-content-end">
      {children}
    </main>
  );
}
