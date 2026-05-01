"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";
// Sonner injects its CSS at runtime via document.createElement('style'), which
// gets blocked by our CSP (style-src has a nonce, so 'unsafe-inline' is ignored
// per spec). Import the bundled stylesheet so it lands in the nonced app CSS.
import "sonner/dist/styles.css";

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-center"
      theme="light"
      duration={4000}
      gap={8}
      offset={16}
      mobileOffset={{ left: "16px", right: "16px", bottom: "16px" }}
      dir="ltr"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !p-4 !gap-3 !shadow-md !font-sans !text-sm",
          title: "!font-medium !leading-snug",
          description: "!text-clay-600 !leading-snug",
          success: "!bg-white !text-clay-900 !border-sage-500/40 [&_[data-icon]]:!text-sage-600",
          error: "!bg-white !text-clay-900 !border-sienna-500/40 [&_[data-icon]]:!text-sienna-600",
          info: "!bg-white !text-clay-900 !border-clay-200",
          warning:
            "!bg-white !text-clay-900 !border-budget-amber-500/40 [&_[data-icon]]:!text-budget-amber-600",
          actionButton: "!bg-terra-500 !text-clay-50",
          cancelButton: "!bg-clay-200 !text-clay-700",
        },
      }}
      {...props}
    />
  );
}
