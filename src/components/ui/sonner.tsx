"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-center"
      theme="light"
      richColors
      closeButton
      duration={4000}
      gap={12}
      offset={24}
      dir="ltr"
      toastOptions={{
        classNames: {
          toast: "rounded-md border border-clay-200 bg-white text-clay-900 shadow-md",
          title: "font-medium",
          description: "text-clay-600",
          success: "border-sage-500 bg-white text-sage-600",
          error: "border-terra-500 bg-clay-50 text-terra-700",
          actionButton: "bg-terra-500 text-clay-50",
          cancelButton: "bg-clay-200 text-clay-700",
          closeButton: "text-clay-500 hover:text-clay-900",
        },
      }}
      {...props}
    />
  );
}
