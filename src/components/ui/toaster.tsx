"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      dir="rtl"
      position="top-center"
      mobileOffset={{ top: "calc(var(--safe-top) + 12px)" }}
      theme="dark"
      toastOptions={{
        classNames: {
          toast: "!bg-surface-2 !border-border !text-text !font-sans",
          success: "!border-win/40",
          error: "!border-loss/40",
        },
      }}
    />
  );
}
